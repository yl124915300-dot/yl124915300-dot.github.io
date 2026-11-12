"""PLI live V1. Rule-driven, read-only, synthetic people, real public sources."""
import copy, datetime as dt, hashlib, json, math, urllib.parse
UTC=dt.timezone.utc
TTL=7200
RULE_VERSION="PLI_RULES_1"
def stamp(t): return dt.datetime.fromtimestamp(t,UTC).isoformat()
def epoch(s):
    if not isinstance(s,str): raise ValueError("missing timestamp")
    d=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    if d.tzinfo is None: raise ValueError("timezone required")
    return d.timestamp()
def digest(v): return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
def new_state():
    return {"schema":1,"events":{},"proposals":{},"journal":[],"runs":[],"tombstones":{}}
def ring_contains(r,x,y):
    inside=False
    if len(r)<4: return False
    for a,b in zip(r,r[1:]+r[:1]):
        ax,ay=a[:2]; bx,by=b[:2]
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax: inside=not inside
    return inside
def polygon_contains(g,lat,lon):
    if not g: return None
    polygons=[g["coordinates"]] if g.get("type")=="Polygon" else g["coordinates"] if g.get("type")=="MultiPolygon" else []
    return any(rings and ring_contains(rings[0],lon,lat) and not any(ring_contains(h,lon,lat) for h in rings[1:]) for rings in polygons)
def distance(a,b,c,d):
    a,b,c,d=map(math.radians,[a,b,c,d])
    h=math.sin((c-a)/2)**2+math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return 6371*2*math.asin(min(1,math.sqrt(h)))
def normalize_nws(raw,receipt,now):
    p=raw["properties"]
    eid=p["id"]
    if not isinstance(eid,str) or not eid.startswith("urn:oid:"): raise ValueError("CAP id")
    if p.get("status")!="Actual": raise ValueError("non Actual")
    if p.get("messageType") not in ("Alert","Update","Cancel"): raise ValueError("message type")
    sent=epoch(p["sent"]); effective=epoch(p["effective"]); expires=epoch(p["expires"])
    ends=epoch(p["ends"]) if p.get("ends") else expires
    if sent>now+300 or effective>expires or sent<now-8*86400: raise ValueError("event time")
    refs=[]
    for r in p.get("references",[]):
        ident=r.get("identifier")
        if isinstance(ident,str): refs.append(ident)
    e={"id":eid,"source":"NWS","evidence":"REAL_PUBLIC","url":"https://api.weather.gov/alerts/"+urllib.parse.quote(eid,safe=":"),
       "event":p.get("event","Unknown"),"title":p.get("headline") or p.get("event","Unknown"),
       "sent":sent,"effective":effective,"expires":min(expires,ends),"message":p["messageType"],
       "sender":p.get("sender"),"references":refs,"geometry":raw.get("geometry"),
       "zones":p.get("affectedZones",[]),"ugc":p.get("geocode",{}).get("UGC",[]),
       "severity":p.get("severity"),"official_instruction":p.get("instruction"),
       "raw_sha256":digest(raw),"receipt":receipt}
    e["revision"]=digest({k:v for k,v in e.items() if k not in ("receipt","revision")})
    return e
def normalize_usgs(raw,receipt,now):
    p=raw["properties"]; geo=raw["geometry"]["coordinates"]
    time=p["time"]/1000; updated=p["updated"]/1000
    if not math.isfinite(time) or time>now+300 or updated>now+300: raise ValueError("event time")
    url=p["url"]
    if not url.startswith("https://earthquake.usgs.gov/earthquakes/eventpage/"): raise ValueError("USGS evidence")
    e={"id":"usgs:"+raw["id"],"source":"USGS","evidence":"REAL_PUBLIC","url":url,"event":"earthquake",
       "title":p.get("title","earthquake"),"sent":updated,"effective":time,"expires":time+TTL,
       "message":"Alert","sender":"USGS","references":[],"lat":geo[1],"lon":geo[0],"magnitude":p.get("mag"),
       "raw_sha256":digest(raw),"receipt":receipt}
    e["revision"]=digest({k:v for k,v in e.items() if k not in ("receipt","revision")})
    return e
def evidence_ok(e,now,test=False):
    r=e.get("receipt",{})
    host=urllib.parse.urlparse(e.get("url","")).hostname
    if host!=("api.weather.gov" if e["source"]=="NWS" else "earthquake.usgs.gov"): return False
    return (e.get("evidence")==("SYNTHETIC_TEST" if test else "REAL_PUBLIC") and r.get("ok") is True
        and 0<=now-r.get("fetched_epoch",0)<=TTL and r.get("sha256") and e.get("raw_sha256") and e.get("revision"))
def geo_match(e,p,mapping,now):
    if e["source"]=="USGS":
        km=distance(p["lat"],p["lon"],e["lat"],e["lon"])
        return (km<=80 and isinstance(e.get("magnitude"),(float,int)) and e["magnitude"]>=4.5),{"method":"distance_80km_magnitude_4.5","km":round(km,3)}
    g=polygon_contains(e.get("geometry"),p["lat"],p["lon"])
    if g is not None: return g,{"method":"official_polygon"}
    if not mapping or not mapping.get("ok") or not 0<=now-mapping.get("fetched_epoch",0)<=TTL:
        return False,{"method":"missing_fresh_point_mapping"}
    overlap=sorted(set(mapping["zones"])&set(e.get("zones",[])))
    # County codes must be explicitly listed in UGC; county-intersects-zone SAME is never used.
    county=p["county"] in e.get("ugc",[])
    return bool(overlap or county),{"method":"official_point_zones_or_exact_county","zones":overlap,"county_exact":county,"mapping_sha256":mapping.get("sha256")}
def candidate(e,p,basis,now):
    marine=any(w in e.get("event","").lower() for w in ("marine","rip current","surf","beach"))
    if marine and "marine" not in p.get("exposures",[]):
        action="confirm_activity_scope"
        text="核对官方通知是否涉及该合成角色的海滩或海上活动；活动暴露未知，不能据此推断店铺或陆地出行受影响。"
        unknowns=["是否计划海滩或海上活动","真实地点及个人风险","交通、价格、营业影响均未知"]
    else:
        action="review_official_notice"
        text="根据该合成角色的目标核对官方通知及原文指引；由人确认个人安排，系统不执行现实操作。"
        unknowns=["真实个人风险及当前现场情况","交通、价格、服务可用性均未知"]
    return {"id":p["id"]+"|"+e["id"],"role_id":p["id"],"event_id":e["id"],"revision":e["revision"],
            "source":e["source"],"status":"PROPOSED","action":action,"text":text,"goal":p["goal"],
            "basis":basis,"rule":RULE_VERSION,"decision_method":"PRESET_DETERMINISTIC_RULE",
            "classification":"SYNTHETIC_PERSON_REAL_EVENT","evidence_url":e["url"],"evidence_fetched_at":stamp(e["receipt"]["fetched_epoch"]),
            "valid_until":stamp(min(now+TTL,e["expires"])),"cost_cents":0,"required_minutes":5,
            "unknowns":unknowns,"external_execution":False,"risk_resolved":False}
def guard(c,p,e,now,test=False):
    if p.get("classification")!="SYNTHETIC" or c.get("role_id")!=p.get("id") or c.get("event_id")!=e.get("id"): return "IDENTITY_SCOPE"
    if p.get("permissions")!=["read_only_proposal"] or c.get("action") not in ("confirm_activity_scope","review_official_notice") or c.get("external_execution") is not False: return "PERMISSION"
    if type(c.get("cost_cents")) is not int or c["cost_cents"]!=0 or c["cost_cents"]>p["budget_cents"]: return "BUDGET_OR_NONZERO_COST"
    if c.get("required_minutes",999)>p["spare_minutes"]: return "TIME_BUDGET"
    if not evidence_ok(e,now,test): return "MISSING_EVIDENCE"
    if not (e["effective"]<=now<e["expires"]): return "NOT_CURRENT"
    return None
def advance(old,events,profiles,mappings,health,now,run,test=False):
    s=copy.deepcopy(old); before=digest(old); journal_start=len(s["journal"])
    byid={}
    for e in events:
        previous=byid.get(e["id"])
        if previous is None or (e["sent"],e["revision"])>(previous["sent"],previous["revision"]): byid[e["id"]]=e
    duplicate_count=len(events)-len(byid)
    for e in byid.values():
        prior=s["events"].get(e["id"])
        if prior and e["sent"]<prior["sent"]: continue
        if not evidence_ok(e,now,test): continue
        s["events"][e["id"]]=dict(e,last_seen=now)
        if e["source"]=="NWS" and e["message"] in ("Update","Cancel"):
            targets=e["references"]+([e["id"]] if e["message"]=="Cancel" else [])
            for target in targets:
                prior=s["events"].get(target)
                if prior and prior["source"]=="NWS" and prior.get("sender") and prior["sender"]==e["sender"] and prior["sent"]<=e["sent"]:
                    s["tombstones"][target]={"by":e["id"],"sent":e["sent"],"reason":"CAP_CANCEL" if e["message"]=="Cancel" else "CAP_SUPERSEDED"}
    desired={}; matches=[]; rejects=[]; unchanged=0
    for eid,e in sorted(s["events"].items()):
        seen=eid in byid and e.get("last_seen")==now
        for p in profiles:
            key=p["id"]+"|"+eid
            prior=s["proposals"].get(key)
            why=None
            if not health.get(e["source"],False): why="SOURCE_FAILED_OR_STALE"
            elif eid in s["tombstones"]: why=s["tombstones"][eid]["reason"]
            elif e["message"]=="Cancel": why="CAP_CANCEL"
            elif e["expires"]<=now: why="EXPIRED_ALERT_NOT_RISK_RESOLVED"
            elif not seen: why="NOT_IN_ACTIVE_FEED_RISK_UNKNOWN"
            elif e["effective"]>now: why="NOT_YET_EFFECTIVE"
            elif not evidence_ok(e,now,test): why="MISSING_EVIDENCE"
            if why:
                if prior:
                    desired[key]=dict(prior,status="WITHDRAWN" if why.startswith(("CAP_","EXPIRED")) else "SUSPENDED",reason=why,risk_resolved=False)
                continue
            matched,basis=geo_match(e,p,mappings.get(p["id"]),now)
            matches.append({"role_id":p["id"],"event_id":eid,"matched":matched,"basis":basis})
            if not matched:
                if prior: desired[key]=dict(prior,status="WITHDRAWN",reason="GEOGRAPHY_NOT_MATCHED",risk_resolved=False)
                continue
            c=candidate(e,p,basis,now); err=guard(c,p,e,now,test)
            if err:
                rejects.append({"role_id":p["id"],"event_id":eid,"reason":err})
                if prior: desired[key]=dict(prior,status="SUSPENDED",reason=err,risk_resolved=False)
                continue
            desired[key]=c
    for key,c in desired.items():
        prev=s["proposals"].get(key)
        # Refresh provenance/lease without adding a semantic transition for a repeated observation.
        meaning=lambda x:{k:v for k,v in x.items() if k not in ("valid_until","evidence_fetched_at","last_changed_at")}
        if prev and meaning(prev)==meaning(c):
            unchanged+=1;c["last_changed_at"]=prev["last_changed_at"]
        else:
            c["last_changed_at"]=stamp(now)
            s["journal"].append({"seq":len(s["journal"])+1,"at":stamp(now),"run_id":run["id"],"role_id":c["role_id"],
                "event_id":c["event_id"],"from_status":prev["status"] if prev else None,"to_status":c["status"],
                "from_revision":prev.get("revision") if prev else None,"revision":c["revision"],
                "reason":c.get("reason","RULE_CANDIDATE"),"risk_resolved":False,"evidence_url":c["evidence_url"]})
        s["proposals"][key]=c
    # No arbitrary pruning of history in V1. Published snapshots are Git versioned.
    receipt=dict(run,at=stamp(now),before_state_sha256=before,journal_before=journal_start,journal_after=len(s["journal"]),
        transitions=len(s["journal"])-journal_start,unchanged_proposals=unchanged,duplicate_input_events=duplicate_count,
        source_health=health,event_count=len(byid),active_proposals=sum(x["status"]=="PROPOSED" for x in s["proposals"].values()),
        real_transactions=0,net_receipts_usd=0,llm_status="LLM_NOT_AUTONOMOUS",decision_method="PRESET_DETERMINISTIC_RULE")
    s["runs"].append(receipt)
    receipt["state_payload_sha256"]=digest({k:v for k,v in s.items() if k!="runs"})
    return s,{"receipt":receipt,"matching":matches,"rejected":rejects}
