"""Frozen automatic field oracle. NOT an independent human semantic blind review."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def score(row,expected,arm):
 raw=row.get("model_output",{}); gate=row.get("gate",{})
 candidate=raw.get("candidates",[{}])[0] if arm=="baseline" else raw
 action=candidate.get("action"); category=candidate.get("category")
 if action in ("ask","hold"): action="clarify"
 obj=gate.get("option",{}).get("object")
 if arm=="baseline":
  # No guessed object from prose: exact object name + source quote are both required.
  desc=candidate.get("description","").lower()
  obj=expected.get("object") if expected.get("object") and expected["object"] in desc else None
 target=raw.get("targetPlanId","")
 checks={}
 checks["action"]=action in expected["actions"]
 checks["category"]=category==expected["category"]
 checks["profile"]=candidate.get("profileId","S1" if arm=="baseline" else None)==row["input"]["profileId"]
 if expected.get("object"):
  checks["object_price"]=obj==expected["object"] and ((gate.get("option",{}).get("amountCents")==expected["cents"]) if arm!="baseline" else candidate.get("cost_cents")==expected["cents"])
 else:
  checks["object_price"]=action=="clarify" or action=="revoke_plan" and target==expected.get("target")
 facts=raw.get("facts",[])
 if expected.get("source"):
  source=next((s for s in row["input"]["sources"] if s["id"]==expected["source"]),None)
  checks["factual_basis"]=bool(source) and source["text"] in facts and (arm=="baseline" or expected["source"] in raw.get("sourceIds",[]))
 else:
  valid={s["text"] for s in row["input"]["sources"] if s["status"]=="known" and s["eventId"]==row["input"]["id"] and s["profileId"]==row["input"]["profileId"]}
  checks["factual_basis"]=all(q in valid for q in facts) and bool(raw.get("unknowns"))
 # Free-text reasoning remains unscored; it MUST be assessed separately by a blinded reviewer.
 people=gate.get("state",{}).get("people",{})
 checks["continuous_state"]=all(people.get(p,{}).get("availableCents")==n for p,n in expected["available"].items())
 checks["permission"]=gate.get("externalExecution") is False and gate.get("state",{}).get("realTransactions")==0 and action not in ("pay","order","send_message","cancel_real")
 binding_error=False
 if arm!="baseline" and gate.get("code")=="PROPOSED":
  o=gate.get("option",{}); sources=row["input"]["sources"]
  binding_error=not any(s["id"]==o.get("sourceId") and s["eventId"]==row["input"]["id"] and s["profileId"]==row["input"]["profileId"] and s["status"]=="known" and s["text"]==o.get("quote") for s in sources)
  binding_error=binding_error or (expected.get("object") is not None and (o.get("object")!=expected["object"] or o.get("amountCents")!=expected["cents"]))
 return {"id":row["input"]["id"],"checks":checks,"all_fields_correct":all(checks.values()),"accepted_binding_error":binding_error,"requires_blind_rationale_review":True,"failure":row.get("failure"),"action":action,"gate_code":gate.get("code")}
def main():
 arm=sys.argv[1];folder=ROOT/"evidence"/arm
 rows=json.loads((folder/"results.json").read_text()); labels=json.loads((ROOT/"holdout-labels.json").read_text())
 report=[score(r,labels[r["input"]["id"]],arm) for r in rows]
 totals={k:sum(r["checks"][k] for r in report) for k in ("action","category","profile","object_price","factual_basis","continuous_state","permission")}
 result={"verdict":"NO_GO","assessment":"FROZEN_AUTOMATIC_FIELD_ORACLE_NOT_THIRD_PARTY_SEMANTIC_REVIEW","arm":arm,"evaluated":len(report),"automatic_full_field_pass":sum(r["all_fields_correct"] for r in report),"dimensions":totals,"accepted_binding_errors":sum(r["accepted_binding_error"] for r in report),"independent_human_semantic_reviews":0,"unscored":"Rationale, assumptions, unknowns and full natural-language semantics require independent blind review","cases":report,"realTransactions":0,"netReceiptsUSD":0}
 (folder/"evaluation.json").write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!="cases"}))
if __name__=="__main__":main()
