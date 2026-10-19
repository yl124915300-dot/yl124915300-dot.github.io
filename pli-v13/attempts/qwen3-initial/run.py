"""Bounded CI-only inference. No secret, external executor, paid backend, or user device."""
import hashlib,json,os,platform,resource,subprocess,tarfile,time
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parent
OUT=ROOT/"evidence";OUT.mkdir(exist_ok=True)
TMP=Path("/tmp/pli-v13");TMP.mkdir(exist_ok=True)
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
receipt={"status":"NO_GO","model":"Qwen/Qwen3-4B-GGUF","quantization":"Q4_K_M","license":"Apache-2.0","revision":MODEL_REV,"runner":"ubuntu-24.04 standard public repository","run_url":"https://github.com/"+os.environ["GITHUB_REPOSITORY"]+"/actions/runs/"+os.environ["GITHUB_RUN_ID"],"source_commit":os.environ["GITHUB_SHA"],"realTransactions":0,"netIncomeUSD":0,"realtime":False}
save("inference.json",receipt)
server=None;rows=[]
try:
 assert os.environ["GITHUB_REPOSITORY"]=="yl124915300-dot/yl124915300-dot.github.io"
 receipt["hardware"]={"cpu_count":os.cpu_count(),"platform":platform.platform(),"meminfo":Path("/proc/meminfo").read_text().splitlines()[0]}
 receipt["binary"]=get(BINARY,TMP/"llama.tar.gz",30_000_000,"cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac")
 with tarfile.open(TMP/"llama.tar.gz") as tf:tf.extractall(TMP/"bin",filter="data")
 receipt["weights"]=get(MODEL_BASE+MODEL_FILE,TMP/"model.gguf",2_600_000_000,"7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5")
 receipt["license_file"]=get(MODEL_BASE+"LICENSE",OUT/"MODEL-LICENSE.txt",100000)
 assert "Apache License" in (OUT/"MODEL-LICENSE.txt").read_text()
 exe=next((TMP/"bin").rglob("llama-server"))
 env=dict(os.environ);env["LD_LIBRARY_PATH"]=str(exe.parent)
 # Do not pass any GitHub token or inherited credential to the model process.
 env={k:v for k,v in env.items() if not any(s in k.upper() for s in ["TOKEN","SECRET","PASSWORD","KEY"])}
 log=(OUT/"server.log").open("w")
 server=subprocess.Popen([str(exe),"-m",str(TMP/"model.gguf"),"--host","127.0.0.1","--port","8091","-c","4096","-t","4","-np","1","-ngl","0"],env=env,stdout=log,stderr=subprocess.STDOUT)
 for _ in range(90):
  if server.poll() is not None:raise RuntimeError("SERVER_EXITED")
  try:
   with urlopen("http://127.0.0.1:8091/health",timeout=2) as r:
    if r.status==200:break
  except Exception:time.sleep(1)
 else:raise RuntimeError("MODEL_LOAD_TIMEOUT")
 cases=json.loads((ROOT/"cases.json").read_text());assert len(cases)==10
 prompt=(ROOT/"prompt.txt").read_text();schema=json.loads((ROOT/"schema.json").read_text())
 receipt["prompt_sha256"]=sha(ROOT/"prompt.txt");receipt["cases_sha256"]=sha(ROOT/"cases.json");receipt["schema_sha256"]=sha(ROOT/"schema.json")
 now=time.strftime("%Y-%m-%dT%H:%M:%S.000Z",time.gmtime())
 state_init=subprocess.check_output(["node",str(ROOT/"step.mjs"),"init",now],text=True)
 checkpoint=json.loads(state_init)["memory"]
 infer_start=time.time()
 for case in cases:
  if time.time()-infer_start>900:raise RuntimeError("INFERENCE_BUDGET_900_SECONDS")
  state=json.loads(subprocess.check_output(["node",str(ROOT/"step.mjs"),"state",now],input=json.dumps(checkpoint),text=True))
  person=state["people"]["S1"]
  context={"profile":"SYNTHETIC S1","budget_dollars":person["budgetCents"]/100,"available_dollars":person["availableCents"]/100,"reserved_dollars":person["reservedCents"]/100,"blocked_categories":[c["category"] for c in person["constraints"].values() if c["active"]],"existing_plans":[{"text":p["text"],"cost_dollars":p["amountCents"]/100,"status":p["status"]} for p in person["plans"].values()]}
  user=json.dumps({"event":case,"state":context,"permissions":"SYNTHETIC simulation only; all external actions denied"},ensure_ascii=False)
  formatted="<|im_start|>system\n"+prompt+"<|im_end|>\n<|im_start|>user\n"+user+"<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"
  request={"prompt":formatted,"temperature":0.7,"top_p":0.8,"top_k":20,"min_p":0,"presence_penalty":1.5,"seed":1313,"n_predict":640,"json_schema":schema,"cache_prompt":False,"stop":["<|im_end|>"],"stream":False}
  row={"input":case,"request":request,"before":state,"checkpoint_before":checkpoint,"at":now};t=time.time()
  try:
   with urlopen(Request("http://127.0.0.1:8091/completion",data=json.dumps(request).encode(),headers={"Content-Type":"application/json"}),timeout=100) as r:response=json.load(r)
   row["response"]=response;row["duration_seconds"]=round(time.time()-t,3)
   raw=json.loads(response["content"]);row["model_output"]=raw
   applied=json.loads(subprocess.check_output(["node",str(ROOT/"step.mjs"),"apply",now],input=json.dumps({"memory":checkpoint,"input":case,"output":raw}),text=True))
   row["gate"]=applied;checkpoint=applied["memory"]
  except Exception as e:row["failure"]=type(e).__name__+": "+str(e)
  rows.append(row);save("results.json",rows)
  print(json.dumps({"case":case["id"],"duration":row.get("duration_seconds"),"failure":row.get("failure"),"decisions":row.get("gate",{}).get("decisions")}),flush=True)
 receipt["inference_seconds"]=round(time.time()-infer_start,3)
 receipt["attempts"]=len(rows);receipt["parsed_outputs"]=sum("model_output" in r for r in rows);receipt["validated_outputs"]=sum(r.get("gate",{}).get("status")=="VALIDATED_UNTRUSTED_MODEL_OUTPUT" for r in rows)
 receipt["status"]="REAL_LLM_RAN_REVIEW_REQUIRED" if receipt["parsed_outputs"]==10 else "NO_GO"
 save("checkpoint.json",{"at":now,"memory":checkpoint})
except Exception as e:
 receipt["error"]=type(e).__name__+": "+str(e)
 raise
finally:
 if server is not None:
  server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  receipt["model_process_max_rss_kb"]=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
 receipt["total_seconds"]=round(time.time()-started,3)
 save("inference.json",receipt)
