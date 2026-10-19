"""Compare actual public bytes against this exact committed release; no deployment mutation."""
import hashlib,json,time
from pathlib import Path
from urllib.request import Request,urlopen
root=Path(__file__).resolve().parent;paths=["index.html","app.mjs","style.css","gate.mjs","evidence/inference.json","evidence/results.json","evidence/checkpoint.json","evidence/review.json"]
checks=[]
for name in paths:
 expected=hashlib.sha256((root/name).read_bytes()).hexdigest()
 result={"path":name,"expectedSha256":expected,"pass":False}
 for attempt in range(12):
  try:
   with urlopen(Request("https://yl124915300-dot.github.io/pli-v13/"+name+"?pli13="+str(time.time_ns()),headers={"Cache-Control":"no-cache","User-Agent":"PLI13-public-acceptance"}),timeout=20) as r:body=r.read()
   actual=hashlib.sha256(body).hexdigest();result.update({"actualSha256":actual,"pass":actual==expected})
   if result["pass"]:break
  except Exception as e:result["error"]=str(e)
  time.sleep(5)
 checks.append(result)
report={"checkedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"checks":checks,"passed":sum(x["pass"] for x in checks),"failed":sum(not x["pass"] for x in checks)}
(root/"evidence/public-http.json").write_text(json.dumps(report,indent=2));print(json.dumps(report));assert not report["failed"]
