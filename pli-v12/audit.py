"""Cloud-only, read-only audit. No model calls, keys, accounts or purchases."""
import json,hashlib,datetime,urllib.request,pathlib
root=pathlib.Path("pli-v12/evidence");root.mkdir(exist_ok=True)
def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"PLI-synthetic-read-only-audit/1.2","Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=35) as r:
        body=r.read()
        return r.status,body,dict(r.headers)
def parsed(url):
    status,body,headers=get(url)
    return json.loads(body),{"url":url,"httpStatus":status,"sha256":hashlib.sha256(body).hexdigest(),"httpDate":headers.get("Date")}
base="https://api.github.com/repos/yl124915300-dot/yl124915300-dot.github.io"
now=datetime.datetime.now(datetime.timezone.utc)
report={"at":now.isoformat(),"method":"actual anonymous cloud HTTPS GET; no fixture sources","sources":[]}
for path in ["","data.json","app.js"]:
    url="https://yl124915300-dot.github.io/pli-v11/"+path
    status,body,headers=get(url)
    report.setdefault("v11Public",[]).append({"url":url,"httpStatus":status,"sha256":hashlib.sha256(body).hexdigest()})
    if path=="data.json":
        data=json.loads(body);report["v11SnapshotAt"]=data["generated_at"]
        report["v11SnapshotAgeSeconds"]=(now-datetime.datetime.fromisoformat(data["generated_at"].replace("Z","+00:00"))).total_seconds()
        report["v11SnapshotSourceCounts"]=[{"name":s["name"],"accepted":s["accepted"],"result":s["result"]}for s in data["sources"]]
for name,url in [
 ("USGS","https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"),
 ("NWS","https://api.weather.gov/alerts/active?area=CA,WA,NY,FL,IL")]:
    try:
        data,receipt=parsed(url);receipt.update(name=name,featureCount=len(data.get("features",[])))
        if name=="USGS":receipt["generatedAtEpochMs"]=data.get("metadata",{}).get("generated")
        else:receipt["latestSent"]=max([x.get("properties",{}).get("sent","")for x in data.get("features",[])]or[""])
        report["sources"].append(receipt)
    except Exception as e:report["sources"].append({"name":name,"url":url,"error":str(e),"result":"FAILED"})
runs,_=parsed(base+"/actions/runs?event=schedule&per_page=100")
report["cronTotalCount"]=runs["total_count"]
report["cronRuns"]=[{k:x.get(k)for k in ["id","name","event","created_at","status","conclusion","html_url","head_sha"]}for x in runs["workflow_runs"]]
report["v11CronObserved"]=any(x.get("event")=="schedule" and x.get("name")=="PLI V1.1 hourly public snapshot" for x in runs["workflow_runs"])
pr,_=parsed(base+"/pulls/7");report["pr7"]={k:pr.get(k)for k in ["state","draft","merged","merged_at"]}
report["pr7"]["head"]=pr["head"]["sha"]
branch,_=parsed(base+"/branches/main");report["main"]=branch["commit"]["sha"]
(root/"v11-audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
assert all(x["httpStatus"]==200 for x in report["v11Public"])
