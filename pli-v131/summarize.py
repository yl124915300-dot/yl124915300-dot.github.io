"""Summarize genuine receipts, without promoting automatic scores to semantic accuracy."""
import json,hashlib,os,subprocess
from pathlib import Path
from datetime import datetime,timezone,timedelta
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parent;OUT=ROOT/"evidence"
arms=["baseline","fixed-sampling","fixed-greedy"];summary={};data={}
for arm in arms:
 d=OUT/arm
 meta=json.loads((d/"inference.json").read_text());evaluation=json.loads((d/"evaluation.json").read_text());rows=json.loads((d/"results.json").read_text())
 summary[arm]={"inference":meta,"automaticEvaluation":{k:v for k,v in evaluation.items() if k!="cases"},"failures":[r for r in evaluation["cases"] if not r["all_fields_correct"]],"rawResultsSha256":hashlib.sha256((d/"results.json").read_bytes()).hexdigest()}
 if arm=="baseline":
  summary[arm]["automaticEvaluation"]["accepted_binding_errors"]=None
  summary[arm]["automaticEvaluation"]["binding_metric_note"]="NOT_MEASURED: the frozen baseline counter is a constant zero; do not interpret it as observed zero errors."
 data[arm]=[{"id":r["input"]["id"],"profileId":r["input"]["profileId"],"text":r["input"]["text"],"output":r.get("model_output"),"failure":r.get("failure"),"gateCode":r["gate"].get("code"),"gateDetail":r["gate"].get("detail"),"selectedOption":r["gate"].get("option"),"available":{p:v["availableCents"] for p,v in r["gate"]["state"]["people"].items()},"assessment":evaluation["cases"][i]} for i,r in enumerate(rows)]
def canonical_state(r):
 p=r["before"]["people"]
 return {k:{"availableCents":v["availableCents"],"spentCents":v["spentCents"],"reservedCents":v["reservedCents"],"plans":{n:{z:x[z] for z in ("category","amountCents","status")} for n,x in v["plans"].items()},"constraints":{n:{"category":x["category"],"active":x["active"]} for n,x in v["constraints"].items()}} for k,v in p.items()}
a=json.loads((OUT/"fixed-sampling/results.json").read_text());b=json.loads((OUT/"fixed-greedy/results.json").read_text())
same=[x["input"]["id"] for x,y in zip(a,b) if canonical_state(x)==canonical_state(y)]
restoration=json.loads((OUT/"restoration.json").read_text())
with urlopen(Request("https://api.github.com/repos/yl124915300-dot/yl124915300-dot.github.io/actions/runs?event=schedule&per_page=100",headers={"User-Agent":"PLI-V131-read-only-audit","Accept":"application/vnd.github+json"}),timeout=30) as r:cron=json.load(r)
audit={"checkedAtBeijing":datetime.now(timezone(timedelta(hours=8))).isoformat(),"query":"event=schedule","repositoryScheduleTotal":cron["total_count"],"v11ScheduleRuns":[{"id":r["id"],"event":r["event"],"name":r["name"],"url":r["html_url"]} for r in cron["workflow_runs"] if r["path"]==".github/workflows/pli-v11-hourly.yml"],"pushIsCron":False}
(OUT/"v11-audit.json").write_text(json.dumps(audit,indent=2))
report={"verdict":"NO_GO","reason":"Independent complete semantic review unavailable; field scores do not establish semantic accuracy.","assessmentType":"IMPLEMENTER_AUTHORED_HOLDOUT_WITH_FROZEN_AUTOMATIC_ORACLE","thirdPartyBlindReviews":0,"trueSemanticAccuracy":"UNKNOWN","caseCount":30,"actualArms":summary,"sameBeforeStateSamplingVsGreedy":same,"comparisonLimit":"All arms process same ordered raw events with their own continuous state; only listed identical-state rows support a controlled sampling comparison.","runtimeComparisonCaveat":"Same standard runner class but CPU models may differ. Timings are observations, not a causal speed benchmark. One seed/run per arm does not verify repeatability.","restoration":{"passed":restoration["passed"],"failed":restoration["failed"]},"v11Audit":audit,"realTransactions":0,"netReceiptsUSD":0,"totalModelInferenceSeconds":round(sum(v["inference"]["inference_seconds"] for v in summary.values()),3),"noMacOrLocalExecution":True,"pr":"https://github.com/yl124915300-dot/yl124915300-dot.github.io/pull/10"}
(ROOT/"summary.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
(ROOT/"replay.json").write_text(json.dumps(data,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ("actualArms",)},ensure_ascii=False))
