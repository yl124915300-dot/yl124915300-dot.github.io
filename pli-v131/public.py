"""Compare exact anonymous deployed bytes to cloud source; no credentials."""
import json,hashlib,time
from pathlib import Path
from urllib.request import urlopen,Request
ROOT=Path(__file__).resolve().parent
base="https://yl124915300-dot.github.io/pli-v131/"
checks=[]
for name in ["index.html","app.mjs","style.css","summary.json","replay.json"]:
 expected=hashlib.sha256((ROOT/name).read_bytes()).hexdigest();observed=None
 for attempt in range(12):
  try:
   with urlopen(Request(base+name+"?pli131="+str(time.time_ns()),headers={"User-Agent":"PLI-V131-anonymous-file-audit"}),timeout=20) as r:data=r.read()
   observed=hashlib.sha256(data).hexdigest()
   if observed==expected:break
  except Exception as e:observed=str(e)
  time.sleep(5)
 checks.append({"file":name,"expectedSha256":expected,"observedSha256":observed,"pass":observed==expected})
report={"base":base,"checks":checks,"passed":sum(c["pass"] for c in checks),"failed":sum(not c["pass"] for c in checks)}
(ROOT/"evidence/public-http.json").write_text(json.dumps(report,indent=2));print(json.dumps(report));assert report["failed"]==0
