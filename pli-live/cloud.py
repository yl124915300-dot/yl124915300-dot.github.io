"""Execute only inside the authorized public Actions runner. No external executor."""
import base64, email.utils, json, os, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from engine import *
ROOT=Path(__file__).resolve().parent
REPO="yl124915300-dot/yl124915300-dot.github.io"
BASE="https://api.github.com/repos/"+REPO
NWS="https://api.weather.gov/alerts/active?area=CA,WA,NY,FL,IL"
USGS="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
WORKFLOW="pli-live.yml"
def api(path,method="GET",data=None):
    assert os.environ["GITHUB_REPOSITORY"]==REPO
    req=Request(BASE+path,method=method,data=json.dumps(data).encode() if data is not None else None,
        headers={"Accept":"application/vnd.github+json","Authorization":"Bearer "+os.environ["GH_TOKEN"],
        "X-GitHub-Api-Version":"2022-11-28","User-Agent":"PLI-public-rule-loop"})
    with urlopen(req,timeout=30) as r:
        b=r.read()
        return json.loads(b) if b else {"http_status":r.status}
def content(path,optional=False):
    try:
        r=api("/contents/"+path+"?ref=main")
        return base64.b64decode(r["content"])
    except HTTPError as ex:
        if optional and ex.code==404: return None
        raise
def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2),encoding="utf-8")
def fetch(url,now):
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme!="https" or parsed.hostname not in ("api.weather.gov","earthquake.usgs.gov"): raise ValueError("source allowlist")
    with urlopen(Request(url,headers={"Accept":"application/geo+json, application/json","User-Agent":"PLI-SYNTHETIC-read-only-research (https://github.com/"+REPO+")","Cache-Control":"no-cache"}),timeout=25) as r:
        body=r.read(8000001)
        if len(body)>8000000: raise ValueError("source too large")
        final=r.url
        if urllib.parse.urlparse(final).hostname!=parsed.hostname: raise ValueError("redirect host")
        hd=r.headers.get("Date")
        server=email.utils.parsedate_to_datetime(hd).timestamp()
        if abs(now-server)>TTL or int(r.headers.get("Age","0"))>TTL: raise ValueError("stale HTTP source")
        obj=json.loads(body)
        receipt={"ok":True,"url":url,"final_url":final,"http_status":r.status,"http_date":hd,"fetched_epoch":now,
            "fetched_at":stamp(now),"sha256":hashlib.sha256(body).hexdigest(),"cache_age":r.headers.get("Age","0")}
        return obj,receipt,body.decode()
def publish(files,message):
    # Git data commit with a non-forced fast-forward. Only our additive path may change.
    if not files or any(not p.startswith("pli-live/") for p in files): raise ValueError("write scope")
    for retry in range(3):
        head=api("/git/ref/heads/main")["object"]["sha"]
        commit=api("/git/commits/"+head)
        tree=api("/git/trees/"+commit["tree"]["sha"]+"?recursive=1")
        if tree.get("truncated"): raise ValueError("scope tree truncated")
        before={x["path"]:x["sha"] for x in tree["tree"] if x["type"]=="blob"}
        elements=[{"path":p,"mode":"100644","type":"blob","content":v} for p,v in files.items()]
        nt=api("/git/trees","POST",{"base_tree":commit["tree"]["sha"],"tree":elements})
        nct=api("/git/commits","POST",{"message":message,"tree":nt["sha"],"parents":[head]})
        after=api("/git/trees/"+nt["sha"]+"?recursive=1")
        amap={x["path"]:x["sha"] for x in after["tree"] if x["type"]=="blob"}
        changed=[p for p in before if not p.startswith("pli-live/") and before[p]!=amap.get(p)]
        assert not changed,changed
        try:
            api("/git/refs/heads/main","PATCH",{"sha":nct["sha"],"force":False})
            return {"commit":nct["sha"],"parent":head,"outside_pli_live_changed":changed,
                "outside_pli_live_files":sum(not p.startswith("pli-live/") for p in before),"written":sorted(files)}
        except HTTPError as ex:
            if ex.code not in (409,422) or retry==2: raise
            time.sleep(2)
    raise RuntimeError("concurrent publication")
def trigger(phase):
    result=api("/actions/workflows/"+WORKFLOW+"/dispatches","POST",{"ref":"main","inputs":{"phase":phase}})
    print(json.dumps({"dispatch_requested":phase,"result":result}))
def pages_build():
    site=api("/pages")
    assert site.get("source")=={"branch":"main","path":"/"} and site.get("build_type") in ("legacy",None),"hosting changed; no settings write"
    build=api("/pages/builds","POST",{})
    return {"source":site.get("source"),"public":site.get("public"),"build_type":site.get("build_type"),"request":build}
def refresh():
    now=time.time();rid=os.environ["GITHUB_RUN_ID"]
    original=content("pli-live/state.json",True)
    old=json.loads(original) if original else new_state()
    if old.get("schema")!=1 or not all(k in old for k in ("events","proposals","journal","runs","tombstones")): raise ValueError("state corruption")
    profiles=json.loads((ROOT/"profiles.json").read_text())
    events=[];mappings={};receipts={};raws={};health={"NWS":False,"USGS":False};reject=[]
    for source,url in [("NWS",NWS),("USGS",USGS)]:
        try:
            obj,r,raw=fetch(url,now);raws[source]=raw
            if obj.get("type")!="FeatureCollection" or not isinstance(obj.get("features"),list): raise ValueError("collection schema")
            if obj.get("pagination",{}).get("next"): raise ValueError("incomplete pagination; fail closed")
            if source=="USGS" and not 0<=now-obj["metadata"]["generated"]/1000<=TTL: raise ValueError("stale USGS generated time")
            for feature in obj["features"]:
                try: events.append((normalize_nws if source=="NWS" else normalize_usgs)(feature,r,now))
                except (KeyError,ValueError,TypeError,OverflowError) as ex: reject.append({"source":source,"id":feature.get("id"),"reason":str(ex)})
            receipts[source]=dict(r,feature_count=len(obj["features"]));health[source]=True
        except Exception as ex:
            receipts[source]={"ok":False,"url":url,"fetched_at":stamp(now),"error":type(ex).__name__+": "+str(ex)}
    for p in profiles:
        url="https://api.weather.gov/points/"+str(p["lat"])+","+str(p["lon"])
        try:
            obj,r,raw=fetch(url,now);pr=obj["properties"]
            zones=[pr[k] for k in ("forecastZone","county","fireWeatherZone") if pr.get(k)]
            if not zones or not all(x.startswith("https://api.weather.gov/zones/") for x in zones): raise ValueError("mapping")
            mappings[p["id"]]=dict(r,zones=zones,classification="SYNTHETIC_LOCATION_REAL_MAPPING")
        except Exception as ex: mappings[p["id"]]={"ok":False,"error":str(ex)}
    # A post-freeze real held-out source observation may be unrelated to all six people.
    # It is selected automatically by unseen CAP ID, never by desired test outcome.
    heldout={"status":"NOT_OBSERVED"}
    baseline_ids=set(json.loads((ROOT/"baseline-event-ids.json").read_text()))
    if health["NWS"]:
        try:
            national,nr,nraw=fetch("https://api.weather.gov/alerts/active",now)
            fresh=[]
            for raw_feature in national.get("features",[]):
                try:
                    ne=normalize_nws(raw_feature,nr,now)
                    if "nws:"+ne["id"] not in baseline_ids and ne["id"] not in old["events"] and ne["expires"]>now:
                        fresh.append((ne,raw_feature))
                except (KeyError,TypeError,ValueError,OverflowError): pass
            if fresh:
                selected,raw_feature=sorted(fresh,key=lambda x:x[0]["id"])[0]
                if selected["id"] not in {e["id"] for e in events}: events.append(selected)
                heldout={"status":"OBSERVED","event_id":selected["id"],"url":selected["url"],"raw":raw_feature,"receipt":nr,
                    "selection":"first sorted valid CAP ID absent from V1.1 and prior loop state; may match no profile"}
        except Exception as ex: heldout={"status":"NOT_OBSERVED","error":str(ex)}
    run={"id":rid,"event":os.environ["GITHUB_EVENT_NAME"],"phase":os.environ.get("PLI_PHASE","normal"),
        "run_url":"https://github.com/"+REPO+"/actions/runs/"+rid,"implementation_commit":os.environ["PLI_IMPL_SHA"],
        "restored_from_run":old["runs"][-1]["id"] if old["runs"] else None,
        "restored_state_file_sha256":hashlib.sha256(original).hexdigest() if original else None}
    state,decision=advance(old,events,profiles,mappings,health,now,run)
    baseline=set(json.loads((ROOT/"baseline-event-ids.json").read_text()))
    previous=set(old["events"])
    # Real events are fetched after frozen source commit; never loaded from fixture/story files.
    unseen=[e for e in events if e["source"]=="NWS" and "nws:"+e["id"] not in baseline and e["id"] not in previous]
    observed={"status":"OBSERVED" if unseen else "NOT_OBSERVED","definition":"Real NWS ID absent from V1.1 snapshot and all prior live runs; no real IDs in synthetic unit fixtures",
        "events":[{"id":e["id"],"url":e["url"],"revision":e["revision"],
        "matches":[x for x in decision["matching"] if x["event_id"]==e["id"]]} for e in unseen[:5]]}
    record={"receipt":decision["receipt"],"source_receipts":receipts,"mapping_receipts":mappings,"normalization_rejected":reject,
        "decisions":decision,"unseen_real_event":observed,"prior_state_digest":digest(old),"after_state_digest":digest(state),
        "journal_delta":state["journal"][len(old["journal"]):],"post_freeze_heldout":heldout}
    schedule=api("/actions/runs?event=schedule&per_page=100")
    runs=schedule.get("workflow_runs",[])
    live_schedule=[x for x in runs if x.get("path")==".github/workflows/"+WORKFLOW]
    v11_schedule=[x for x in runs if x.get("path")==".github/workflows/pli-v11-hourly.yml"]
    audit={"at":stamp(now),"all_repository_schedule_total":schedule.get("total_count"),"v11_schedule_observed":len(v11_schedule),
        "pli_live_schedule_observed":len(live_schedule),"queried_page_limit":100,
        "schedule_receipts":[{"id":x["id"],"event":x["event"],"url":x["html_url"],"status":x["status"],"conclusion":x.get("conclusion")} for x in live_schedule],
        "continuous_schedule":"OBSERVED_ONCE_NOT_UPTIME_PROOF" if live_schedule else "NOT_OBSERVED"}
    v11=json.loads(content("pli-v11/data.json"))
    audit["v11_generated_at"]=v11["generated_at"];audit["v11_age_seconds"]=round(now-epoch(v11["generated_at"]))
    view={"version":"PLI_AUTONOMOUS_REAL_EVENT_LOOP_V1","generated_at":stamp(now),"stale_after_seconds":TTL,
        "mode":"RULE_ENGINE_ACTIONS_BATCH_STATIC_PAGES","llm_status":"LLM_NOT_AUTONOMOUS","autonomous_real_affairs":"NO_GO",
        "profiles":profiles,"proposals":list(state["proposals"].values()),"journal":state["journal"][-100:],"runs":state["runs"],
        "source_receipts":receipts,"schedule_audit":audit,"unseen_real_event":observed,
        "real_transactions":0,"net_receipts_usd":0,"commercial_kpi":"NOT_MET","semantic_accuracy":"UNKNOWN"}
    common={"pli-live/state.json":json.dumps(state,ensure_ascii=False,sort_keys=True,indent=2),
        "pli-live/data.json":json.dumps(view,ensure_ascii=False,sort_keys=True,indent=2),
        "pli-live/history/"+rid+".json":json.dumps(record,ensure_ascii=False,sort_keys=True,indent=2)}
    for source,raw in raws.items():common["pli-live/evidence/raw/"+rid+"-"+source.lower()+".json"]=raw
    for name in ("index.html","app.js","style.css","README.md"): common["pli-live/"+name]=(ROOT/name).read_text()
    common["pli-live/evidence/tests.json"]=(ROOT/"evidence/tests.json").read_text()
    scope=publish(common,"PLI live: persist real source batch "+rid+" and synthetic read-only proposals")
    deployment=pages_build()
    write(ROOT/"evidence/run.json",record);write(ROOT/"evidence/publication.json",scope)
    write(ROOT/"evidence/build-request.json",deployment)
    print(json.dumps({"receipt":record["receipt"],"unseen":observed,"scope":scope,"pages_build_requested":True},ensure_ascii=False))
    return record
def accept():
    rid=os.environ["GITHUB_RUN_ID"]
    expected={p:content("pli-live/"+p) for p in ("index.html","app.js","style.css","data.json")}
    view=json.loads(expected["data.json"])
    assert view["runs"][-1]["id"]==rid,"later run overtook verification"
    url="https://yl124915300-dot.github.io/pli-live/"
    attempts=[]
    for trial in range(30):
        try:
            checks={}
            for name,body in expected.items():
                with urlopen(Request(url+name+"?run="+rid,headers={"User-Agent":"PLI-anonymous-public-acceptance","Cache-Control":"no-cache"}),timeout=15) as r:
                    got=r.read();checks[name]={"status":r.status,"sha256":hashlib.sha256(got).hexdigest(),"matches":got==body}
            if all(x["matches"] for x in checks.values()): break
        except Exception as ex: attempts.append(str(ex))
        time.sleep(8)
    else: raise RuntimeError("Pages files did not match: "+str(attempts[-3:]))
    build=api("/pages/builds/latest")
    assert build["status"]=="built","Pages build not successful"
    receipt={"run_id":rid,"at":stamp(time.time()),"url":url,"files":checks,"pages":build,"status":"HTTP_PASS_BROWSER_PENDING"}
    write(ROOT/"evidence/http.json",receipt);write(ROOT/"evidence/expected-data.json",view)
    print(json.dumps(receipt))
def record_acceptance():
    rid=os.environ["GITHUB_RUN_ID"]
    http=json.loads((ROOT/"evidence/http.json").read_text())
    browser=json.loads((ROOT/"evidence/browser.json").read_text())
    assert browser["pass"] and browser["desktop"] and browser["mobile"]
    files={"pli-live/acceptance/"+rid+".json":json.dumps({"http":http,"browser":browser},ensure_ascii=False,indent=2)}
    for name in ("desktop.png","mobile.png"):
        data=(ROOT/"evidence"/name).read_bytes()
        # Binary uploads use Git blobs. Keep screenshot objects out of static text publication helper.
        blob=api("/git/blobs","POST",{"encoding":"base64","content":base64.b64encode(data).decode()})
        files["pli-live/acceptance/"+rid+"-"+name+".ref.json"]=json.dumps({"blob_sha":blob["sha"],"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"note":"Anonymous cloud screenshot Git blob; retrieve through Git blob endpoint"})
    result=publish(files,"PLI live: record actual anonymous desktop/mobile acceptance "+rid)
    print(json.dumps(result))
def restore_check():
    rid=os.environ["GITHUB_RUN_ID"]
    b=content("pli-live/state.json")
    s=json.loads(b);last=s["runs"][-1]
    h=json.loads(content("pli-live/history/"+rid+".json"))
    assert last["id"]==rid
    assert digest(s)==h["after_state_digest"]
    assert last["state_payload_sha256"]==digest({k:v for k,v in s.items() if k!="runs"})
    assert [x["seq"] for x in s["journal"]]==list(range(1,len(s["journal"])+1))
    for key,p in s["proposals"].items():
        assert key==p["role_id"]+"|"+p["event_id"] and p["cost_cents"]==0 and p["external_execution"] is False and p["risk_resolved"] is False
    assert all(r["real_transactions"]==0 and r["net_receipts_usd"]==0 for r in s["runs"])
    report={"pass":True,"verification":"SEPARATE_ACTIONS_JOB_RESTORE","run_id":rid,"state_file_sha256":hashlib.sha256(b).hexdigest(),
        "journal_count":len(s["journal"]),"run_count":len(s["runs"]),"previous_run":last.get("restored_from_run"),
        "canonical_after_sha256":digest(s),"source_implementation":os.environ["PLI_IMPL_SHA"]}
    print(json.dumps(report))
    publish({"pli-live/restoration/"+rid+".json":json.dumps(report,indent=2)},"PLI live: separate cloud job restored persistent state "+rid)

if __name__=="__main__":
    command=sys.argv[1]
    if command=="refresh":refresh()
    elif command=="accept":accept()
    elif command=="record":record_acceptance()
    elif command=="restore":restore_check()
    elif command=="dispatch":trigger(sys.argv[2])
    else: raise ValueError(command)
