"""Non-commercial research only. Never stores raw cat audio or trains weights.
Paired CLAP and YAMNet on exactly the same published CatMeows/ESC-50 audio.
"""
import csv, io, re, hashlib, json, urllib.request, zipfile
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone
from math import gcd

EVIDENCE=Path("cat_tales_v09_paired.json")
YAMNET="https://tfhub.dev/google/yamnet/1"
CLAP="laion/clap-htsat-fused"
PROMPTS=[
 "A domestic cat meowing audibly.",
 "The low rumbling purr of a cat.",
 "A domestic cat hissing.",
 "A cat loudly yowling or caterwauling.",
 "A dog barking clearly.",
 "A person speaking in a room.",
 "Rain falling and dripping.",
 "The sound of a moving motor vehicle.",
 "Quiet indoor ambient sound without any animal vocalizations."
]
row={"status":"STARTED","run_utc":datetime.now(timezone.utc).isoformat(),
 "model_yamnet":YAMNET,"model_clap":CLAP,
 "source_rights":"CatMeows scientific/noncommercial use; ESC-50 CC BY-NC 3.0; RESEARCH ONLY",
 "intent_translated":False,"commercial_release":"NO_GO","raw_media_in_report":False}
def save(**kwargs):
 row.update(kwargs)
 EVIDENCE.write_text(json.dumps(row,indent=2)+"\n")
 print("CAT_TALES_V09="+json.dumps({"status":row["status"],"processed":row.get("processed")}),flush=True)
def fetch(url,cap):
 req=urllib.request.Request(url,headers={"User-Agent":"CatTales-ResearchEvaluation/0.9 (noncommercial; no redistribution)"})
 with urllib.request.urlopen(req,timeout=45) as r: data=r.read(cap+1)
 if not data or len(data)>cap:raise ValueError("remote_media_size_bound")
 return data
def specimens():
 raw=fetch("https://zenodo.org/records/4008297/files/dataset.zip?download=1",45_000_000)
 if hashlib.md5(raw).hexdigest()!="b5fa911bcd6514e39dfef6876f747df4":
  raise ValueError("CatMeows_archive_integrity_check_fail")
 archive=zipfile.ZipFile(io.BytesIO(raw)); grouped=defaultdict(list)
 for item in archive.infolist():
  basename=item.filename.split("/")[-1]
  match=re.match(r"^([BIF])_([A-Za-z0-9]+)_",basename)
  if item.is_dir() or not basename.lower().endswith(".wav") or not match:continue
  if ".." in item.filename.split("/") or item.file_size>2_000_000:raise ValueError("unsafe_zip_member")
  grouped[(match.group(2),match.group(1))].append(item)
 chosen=[sorted(v,key=lambda x:x.filename)[0] for _,v in sorted(grouped.items())]
 if len({x[0] for x in grouped})!=21 or len(chosen)!=49:
  raise ValueError("CatMeows_cats_or_clip_count_mismatch")
 for item in chosen:yield "cat_meow",archive.read(item)
 csv_bytes=fetch("https://raw.githubusercontent.com/karolpiczak/ESC-50/master/meta/esc50.csv",2_000_000)
 meta=list(csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig"))))
 for label in ("dog","rain"):
  files=sorted(v["filename"] for v in meta if v["fold"]=="5" and v["category"]==label)[:8]
  if len(files)!=8:raise ValueError("ESC50_controls_missing")
  for file in files:
   if not re.fullmatch(r"[A-Za-z0-9_.-]+\.wav",file):raise ValueError("bad_filename")
   yield label,fetch("https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/"+file,3_000_000)
def main():
 import numpy as np
 import soundfile as sf
 from scipy.signal import resample_poly
 import tensorflow as tf
 import tensorflow_hub as hub
 import torch
 from transformers import ClapProcessor,ClapModel
 from huggingface_hub import snapshot_download
 torch.set_num_threads(2)
 save(status="LOADING_YAMNET")
 ym=hub.load(YAMNET)
 with open(ym.class_map_path().numpy().decode(),encoding="utf-8") as f:
  klass=list(csv.DictReader(f))
 if len(klass)!=521 or klass[78]["display_name"]!="Meow":raise ValueError("YAMNet_map_mismatch")
 save(status="DOWNLOADING_CLAP_OPEN_WEIGHTS")
 model_path=snapshot_download(CLAP,allow_patterns=["*.json","*.txt","*.safetensors","*.model","vocab.json","merges.txt"],
                              ignore_patterns=["*.bin"])
 cp=ClapProcessor.from_pretrained(model_path,local_files_only=True)
 cm=ClapModel.from_pretrained(model_path,local_files_only=True).eval()
 save(status="BOTH_MODELS_READY")
 results=[]
 for label,binary in specimens():
  sig,sr=sf.read(io.BytesIO(binary),dtype="float32")
  if sig.ndim==2:sig=np.mean(sig,axis=1)
  if sr<8000 or sr>192000 or len(sig)<500 or len(sig)>sr*20:
   raise ValueError("bad_audio_length_or_rate")
  d=gcd(sr,16000); a16=resample_poly(sig,16000//d,sr//d).astype("float32")
  d=gcd(sr,48000); a48=resample_poly(sig,48000//d,sr//d).astype("float32")
  if a16.size<15600:a16=np.pad(a16,(0,15600-a16.size))
  ys,_,_=ym(tf.convert_to_tensor(a16,dtype=tf.float32))
  order_y=np.argsort(-ys.numpy(),axis=1)
  ym1=bool((order_y[:,0]==78).any())
  ym5=bool((order_y[:,:5]==78).any())
  inputs=cp(text=PROMPTS,audios=a48,sampling_rate=48000,return_tensors="pt",padding=True)
  with torch.inference_mode(): cs=cm(**inputs).logits_per_audio[0].cpu().numpy()
  order_c=np.argsort(-cs)
  cm1=bool(order_c[0]==0);cm3=bool(0 in order_c[:3])
  results.append({"kind":label,"yamnet_top1":ym1,"yamnet_top5":ym5,
                  "clap_top1":cm1,"clap_top3":cm3})
  if len(results)%10==0:
   save(status="INFERENCE_IN_PROGRESS",processed=len(results))
 summary={}
 for label in ("cat_meow","dog","rain"):
  subset=[r for r in results if r["kind"]==label]
  summary[label]={"clips":len(subset)}
  for k in ("yamnet_top1","yamnet_top5","clap_top1","clap_top3"):
   summary[label][k+"_flags"]=sum(int(r[k]) for r in subset)
 if (summary["cat_meow"]["clips"],summary["dog"]["clips"],summary["rain"]["clips"])!=(49,8,8):
  raise ValueError("paired_sample_coverage_incomplete")
 save(status="RESEARCH_REAL_PAIRED_TEST_COMPLETED",processed=len(results),summary=summary,
      score_meaning="zero-shot relative prompt rankings, NOT calibrated probabilities; labels from authors",
      limitations="Research/noncommercial samples, no human blind annotation, negatives from another corpus, no cross-home generalization claim")
if __name__=="__main__":
 save()
 try:main()
 except Exception as e:
  save(status="FAILED_NOT_EVALUATED",error=type(e).__name__+":"+str(e)[:250])
  raise
