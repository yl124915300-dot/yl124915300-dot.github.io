"""Bounded CI-only inference. No secret, external executor, paid backend, or user device."""
import copy,hashlib,json,os,platform,re,resource,subprocess,tarfile,time
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parent
ARM=os.environ["PLI_ARM"]
OUT=ROOT/"evidence"/ARM;OUT.mkdir(exist_ok=True,parents=True)
TMP=Path("/tmp/pli-v131");TMP.mkdir(exist_ok=True)
MODEL_REV="bc640142c66e1fdd12af0bd68f40445458f3869b"
MODEL_FILE="Qwen3-4B-Q4_K_M.gguf"
MODEL_BASE="https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/"+MODEL_REV+"/"
BINARY="https://github.com/ggml-org/llama.cpp/releases/download/b11669/llama-b11669-bin-ubuntu-x64.tar.gz"
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for block in iter(lambda:f.read(1024*1024),b""):h.update(block)
 return h.hexdigest()
def save(name,obj): (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2))
def get(url,target,limit,expected=None):
 n=0
 with urlopen(Request(url,headers={"User-Agent":"PLI-V13-public-repo-CI"}),timeout=60) as r,target.open("wb") as f:
  while True:
   b=r.read(1024*1024)
   if not b:break
   n+=len(b)
   if n>limit:raise RuntimeError("DOWNLOAD_LIMIT")
   f.write(b)
 digest=sha(target)
 if expected and digest!=expected:raise RuntimeError("SHA256_MISMATCH")
 return {"url":url,"bytes":n,"sha256":digest}

started=time.time()
receipt={"status":"NO_GO","arm":ARM,"model":"Qwen/Qwen3-4B-GGUF","quantization":"Q4_K_M","license":"Apache-2.0","revision":MODEL_REV,"run_url":"https://github.com/"+os.environ["GITHUB_REPOSITORY"]+"/actions/runs/"+os.environ["GITHUB_RUN_ID"],"source_commit":os.environ["GITHUB_SHA"],"realTransactions":0,"netReceiptsUSD":0,"thirdPartySemanticReview":"UNAVAILABLE","realtime":False}
save("inference.json",receipt)
server=None;rows=[]
def node(op,payload,now):
 return json.loads(subprocess.check_output(["node",str(ROOT/"step.mjs"),op,now],input=json.dumps(payload),text=True))
try:
 assert os.environ["GITHUB_REPOSITORY"]=="yl124915300-dot/yl124915300-dot.github.io"
 assert ARM in ("baseline","fixed-sampling","fixed-greedy")
 receipt["hardware"]={"cpu_count":os.cpu_count(),"platform":platform.platform(),"meminfo":Path("/proc/meminfo").read_text().splitlines()[0],"runner":os.environ.get("RUNNER_NAME"),"cpu":next((s for s in Path("/proc/cpuinfo").read_text().splitlines() if "model name" in s),"")}
 receipt["binary"]=get(BINARY,TMP/"llama.tar.gz",30_000_000,"cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac")
 with tarfile.open(TMP/"llama.tar.gz") as tf:tf.extractall(TMP/"bin",filter="data")
 receipt["weights"]=get(MODEL_BASE+MODEL_FILE,TMP/"model.gguf",2_600_000_000,"7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5")
 receipt["license_file"]=get(MODEL_BASE+"LICENSE",OUT/"MODEL-LICENSE.txt",100000)
 assert "Apache License" in (OUT/"MODEL-LICENSE.txt").read_text()
 exe=next((TMP/"bin").rglob("llama-server"))
 env={k:v for k,v in os.environ.items() if not any(s in k.upper() for s in ["TOKEN","SECRET","PASSWORD","KEY"])}
 env["LD_LIBRARY_PATH"]=str(exe.parent)
 log=(OUT/"server.log").open("w")
 server=subprocess.Popen([str(exe),"-m",str(TMP/"model.gguf"),"--host","127.0.0.1","--port","8091","-c","4096","-t","4","-np","1","-ngl","0"],env=env,stdout=log,stderr=subprocess.STDOUT)
 for _ in range(90):
  if server.poll() is not None:raise RuntimeError("SERVER_EXITED")
  try:
   with urlopen("http://127.0.0.1:8091/health",timeout=2) as r:
    if r.status==200:break
  except Exception:time.sleep(1)
 else:raise RuntimeError("MODEL_LOAD_TIMEOUT")
 cases=json.loads((ROOT/"holdout.json").read_text());assert len(cases)==30
 prior=[]
 for path in [ROOT.parent/"pli-v13/cases.json",ROOT.parent/"pli-v13/attempts/qwen25/cases.json",ROOT.parent/"pli-v13/attempts/qwen3-initial/cases.json"]:
  prior.extend(json.loads(path.read_text()))
 assert not {c["text"] for c in cases}.intersection(c["text"] for c in prior)
 source=ROOT.parent/"pli-v13" if ARM=="baseline" else ROOT
 prompt=(source/"prompt.txt").read_text();schema=json.loads((source/"schema.json").read_text())
 receipt["digests"]={str(p.relative_to(ROOT.parent)):sha(p) for p in [source/"prompt.txt",source/"schema.json",ROOT/"holdout.json",ROOT/"grade.py",ROOT/"gate.mjs",ROOT/"POLICY.md"]}
 original={"temperature":0.7,"top_p":0.8,"top_k":20,"min_p":0,"presence_penalty":1.5,"seed":1313}
 greedy={"temperature":0,"top_p":1,"top_k":0,"min_p":0,"presence_penalty":0,"seed":1313}
 params=greedy if ARM=="fixed-greedy" else original
 receipt["parameters"]=params
 now=time.strftime("%Y-%m-%dT%H:%M:%S.000Z",time.gmtime())
 memory=node("init",{},now)["memory"];infer_start=time.time();duration_sum=0
 for case in cases:
  if time.time()-infer_start>2100:raise RuntimeError("INFERENCE_BUDGET_2100_SECONDS")
  prepared=node("prepare",{"memory":memory,"input":case},now)
  memory=prepared["memory"];state=prepared["state"];person=state["people"][case["profileId"]]
  if ARM=="baseline":
   context={"profile":"SYNTHETIC "+case["profileId"],"budget_dollars":person["budgetCents"]/100,"available_dollars":person["availableCents"]/100,"reserved_dollars":person["reservedCents"]/100,"blocked_categories":[c["category"] for c in person["constraints"].values() if c["active"]],"reserved_plans":[{"category":p["category"],"cost_dollars":p["amountCents"]/100,"status":p["status"]} for p in person["plans"].values() if p["status"]=="PROPOSED"]}
   user={"event":{"id":case["id"],"text":case["text"]},"state":context,"permissions":"SYNTHETIC simulation only; all external actions denied"}
   spans=[s[:180] for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])",case["text"]) if s]
   dynamic=copy.deepcopy(schema);dynamic["properties"]["facts"]["items"]["enum"]=spans
   dynamic["properties"]["candidates"]["items"]["properties"]["evidence_quote"]["enum"]=[""]+spans
  else:
   context={"profileId":case["profileId"],"availableCents":person["availableCents"],"spentCents":person["spentCents"],"reservedCents":person["reservedCents"],"constraints":person["constraints"],"plans":person["plans"]}
   user={"event":{k:v for k,v in case.items() if k!="controls"},"state":context,"deterministic_price_extraction":prepared["parsed"],"permissions":"Only SYNTHETIC tentative reservations; NO external execution."}
   dynamic=copy.deepcopy(schema)
   dynamic["properties"]["profileId"]["enum"]=[case["profileId"]]
   valid=[s for s in case["sources"] if s["eventId"]==case["id"] and s["profileId"]==case["profileId"] and s["kind"]=="SYNTHETIC_INPUT_QUOTE" and s["status"]=="known" and s["text"] in case["text"]]
   dynamic["properties"]["sourceIds"]["items"]["enum"]=[s["id"] for s in valid] or [""]
   dynamic["properties"]["facts"]["items"]["enum"]=[s["text"] for s in valid] or [""]
   dynamic["properties"]["optionId"]["enum"]=[""]+[o["id"] for o in prepared["parsed"]["options"]]
  formatted="<|im_start|>system\n"+prompt+"<|im_end|>\n<|im_start|>user\n"+json.dumps(user,ensure_ascii=False)+"<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
  request={**params,"prompt":formatted,"n_predict":640,"json_schema":dynamic,"cache_prompt":False,"stop":["<|im_end|>"],"stream":False}
  row={"input":case,"request":request,"before":state,"checkpoint_before":memory,"at":now,"controls":prepared["log"]};t=time.time()
  try:
   with urlopen(Request("http://127.0.0.1:8091/completion",data=json.dumps(request).encode(),headers={"Content-Type":"application/json"}),timeout=105) as r:response=json.load(r)
   row["response"]=response;row["duration_seconds"]=round(time.time()-t,3);duration_sum+=row["duration_seconds"]
   raw=json.loads(response["content"]);row["model_output"]=raw
   result=node("legacy" if ARM=="baseline" else "apply",{"memory":memory,"input":case,"output":raw},now)
   row["gate"]=result;memory=result["memory"]
  except Exception as e:
   row["failure"]=type(e).__name__+": "+str(e)
   row["gate"]={"memory":memory,"state":state,"code":"INFERENCE_FAILURE","externalExecution":False}
  rows.append(row);save("results.json",rows)
  print(json.dumps({"arm":ARM,"case":case["id"],"seconds":row.get("duration_seconds"),"failure":row.get("failure"),"gate":row["gate"].get("code")}),flush=True)
 receipt["inference_seconds"]=round(duration_sum,3)
 receipt["inference_wall_seconds"]=round(time.time()-infer_start,3)
 receipt["attempts"]=len(rows);receipt["parsed_outputs"]=sum("model_output" in r for r in rows)
 receipt["status"]="REAL_LLM_RAN_SEMANTIC_NO_GO" if receipt["parsed_outputs"]==30 else "NO_GO"
 save("checkpoint.json",{"at":now,"memory":memory})
except Exception as e:
 receipt["error"]=type(e).__name__+": "+str(e)
 raise
finally:
 if server is not None:
  server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  usage=resource.getrusage(resource.RUSAGE_CHILDREN)
  receipt["children_resources"]={"max_rss_kib":usage.ru_maxrss,"user_cpu_seconds":round(usage.ru_utime,3),"system_cpu_seconds":round(usage.ru_stime,3)}
 receipt["total_seconds"]=round(time.time()-started,3);save("inference.json",receipt)
