"""Wait for actual Pages bytes; never infer LIVE from a commit."""
import json,time,urllib.request,hashlib,pathlib,datetime
root=pathlib.Path("pli-v12");expected=["index.html","engine.mjs","provider.mjs","app.mjs","scenarios.mjs","style.css","evidence/summary.json"]
last=None
for attempt in range(48):
    receipts=[]
    try:
        for name in expected:
            url="https://yl124915300-dot.github.io/pli-v12/"+name+"?accept="+str(time.time_ns())
            with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"PLI-V1.2-anonymous-readback"}),timeout=20) as response:
                raw=response.read()
                assert response.status==200
            actual=hashlib.sha256(raw).hexdigest();wanted=hashlib.sha256((root/name).read_bytes()).hexdigest()
            assert actual==wanted,(name,actual,wanted)
            receipts.append({"url":url,"sha256":actual,"httpStatus":200,"matchesSource":True})
        (root/"evidence/public-http.json").write_text(json.dumps({"at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"anonymous":True,"total":len(expected),"failed":0,"checks":receipts},indent=2));print("PUBLIC_HTTP_BYTES_MATCH",len(receipts));break
    except Exception as e:
        last=str(e);print("Awaiting actual deployment",attempt+1,last,flush=True);time.sleep(10)
else:raise RuntimeError("PUBLIC_DEPLOYMENT_NOT_VERIFIED: "+str(last))
