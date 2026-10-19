"""Read-only audit; does not refresh V1.1 or trigger its workflow."""
import json,time
from pathlib import Path
from urllib.request import Request,urlopen
OUT=Path(__file__).resolve().parent/"evidence";OUT.mkdir(exist_ok=True)
def read(url):
 with urlopen(Request(url,headers={"User-Agent":"PLI-V13-read-only-audit","Cache-Control":"no-cache"}),timeout=25) as r:return json.load(r)
repo="https://api.github.com/repos/yl124915300-dot/yl124915300-dot.github.io"
report={"checkedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"scheduleVerified":False,"realTransactions":0,"netIncomeUSD":0}
for key,url in [("schedule",repo+"/actions/workflows/pli-v11-hourly.yml/runs?event=schedule&per_page=10"),("publicRefresh","https://yl124915300-dot.github.io/pli-v11/state/refresh.json")]:
 try:report[key]=read(url)
 except Exception as e:report[key]={"error":str(e)}
runs=report.get("schedule",{}).get("workflow_runs",[])
report["scheduleVerified"]=any(r.get("event")=="schedule" and r.get("path")==".github/workflows/pli-v11-hourly.yml" and r.get("conclusion")=="success" for r in runs)
report["scheduleCount"]=report.get("schedule",{}).get("total_count")
report["latestTrueSchedule"]=[{k:r.get(k) for k in ["id","event","conclusion","created_at","html_url","path"]} for r in runs]
try:
 from datetime import datetime,timezone
 stamp=report["publicRefresh"]["at"];age=(datetime.now(timezone.utc)-datetime.fromisoformat(stamp.replace("Z","+00:00"))).total_seconds()
 report.update(snapshotAt=stamp,ageSeconds=round(age),freshness="STALE" if age>7200 else "FRESH")
except Exception:report["freshness"]="UNKNOWN"
(OUT/"v11-audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ["publicRefresh","schedule"]}))
