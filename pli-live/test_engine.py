"""Adversarial tests only. Every event below is explicitly SYNTHETIC_TEST."""
import copy,json,unittest
from pathlib import Path
from engine import *
NOW=1792396800
P={"id":"S1","classification":"SYNTHETIC","lat":1,"lon":1,"county":"XXC001","goal":"SYNTHETIC goal","spare_minutes":5,"budget_cents":0,"permissions":["read_only_proposal"],"exposures":["land"]}
def event(ident="SYNTHETIC-ONLY-1",**kw):
    e={"id":ident,"source":"NWS","evidence":"SYNTHETIC_TEST","url":"https://api.weather.gov/alerts/"+ident,
       "sent":NOW-60,"effective":NOW-60,"expires":NOW+600,"message":"Alert","sender":"SYNTHETIC-sender",
       "event":"SYNTHETIC Test Weather","references":[],"zones":["https://api.weather.gov/zones/forecast/XXZ001"],
       "ugc":[],"geometry":None,"revision":"SYNTHETIC-revision-1","raw_sha256":"SYNTHETIC-raw",
       "receipt":{"ok":True,"fetched_epoch":NOW,"sha256":"SYNTHETIC-receipt"}}
    e.update(kw);return e
MAP={"S1":{"ok":True,"fetched_epoch":NOW,"sha256":"SYNTHETIC-map","zones":["https://api.weather.gov/zones/forecast/XXZ001"]}}
def step(old,ev,now=NOW,health=None,people=None,mapping=None):
    return advance(old,ev,people or [P],MAP if mapping is None else mapping,
       {"NWS":True,"USGS":True} if health is None else health,now,{"id":"SYNTHETIC_TEST_RUN","event":"SYNTHETIC"},test=True)
class Safety(unittest.TestCase):
    def proposed(self,e=None):
        return step(new_state(),[e or event()])[0]
    def test_01_matching(self):
        self.assertEqual(next(iter(self.proposed()["proposals"].values()))["status"],"PROPOSED")
    def test_02_wrong_geography(self):
        self.assertFalse(self.proposed(event(zones=[]))["proposals"])
    def test_03_polygon_overrides_county(self):
        poly={"type":"Polygon","coordinates":[[[10,10],[11,10],[11,11],[10,11],[10,10]]]}
        self.assertFalse(self.proposed(event(geometry=poly,ugc=["XXC001"]))["proposals"])
    def test_04_expired(self):
        self.assertFalse(self.proposed(event(expires=NOW))["proposals"])
    def test_05_future(self):
        self.assertFalse(self.proposed(event(effective=NOW+1))["proposals"])
    def test_06_duplicate_same_batch_and_rerun(self):
        s,r=step(new_state(),[event(),event()]);self.assertEqual(r["receipt"]["duplicate_input_events"],1)
        ss,rr=step(s,[event()],NOW+1)
        self.assertEqual(len(ss["proposals"]),1);self.assertEqual(rr["receipt"]["transitions"],0)
    def test_07_cap_cancel_and_old_reappears(self):
        s=self.proposed();cancel=event("SYNTHETIC-CANCEL",message="Cancel",sent=NOW,references=[event()["id"]])
        s,r=step(s,[cancel],NOW+1)
        self.assertEqual(s["proposals"]["S1|"+event()["id"]]["reason"],"CAP_CANCEL")
        ss,r=step(s,[event()],NOW+2)
        self.assertEqual(ss["proposals"]["S1|"+event()["id"]]["status"],"WITHDRAWN")
        s,r=step(ss,[event("SYNTHETIC-NEW",sent=NOW+2)],NOW+3)
        self.assertEqual(s["proposals"]["S1|SYNTHETIC-NEW"]["status"],"PROPOSED")
    def test_08_cap_update(self):
        s=self.proposed();up=event("SYNTHETIC-UP",message="Update",sent=NOW,references=[event()["id"]],revision="SYNTHETIC-revision-2")
        s,r=step(s,[up],NOW+1)
        self.assertEqual(s["proposals"]["S1|"+event()["id"]]["reason"],"CAP_SUPERSEDED")
        self.assertEqual(s["proposals"]["S1|SYNTHETIC-UP"]["status"],"PROPOSED")
    def test_09_wrong_sender_cancel(self):
        s=self.proposed();cancel=event("SYNTHETIC-CANCEL",message="Cancel",sender="OTHER",sent=NOW,references=[event()["id"]])
        s,r=step(s,[event(),cancel],NOW+1)
        self.assertEqual(s["proposals"]["S1|"+event()["id"]]["status"],"PROPOSED")
    def test_10_cross_role_guard(self):
        e=event();c=candidate(e,P,{},NOW);c["role_id"]="S2"
        self.assertEqual(guard(c,P,e,NOW,True),"IDENTITY_SCOPE")
    def test_11_missing_evidence(self):
        self.assertFalse(self.proposed(event(receipt={}))["proposals"])
    def test_12_source_failure(self):
        s=self.proposed();s,r=step(s,[],NOW+1,health={"NWS":False})
        p=next(iter(s["proposals"].values()))
        self.assertEqual(p["status"],"SUSPENDED");self.assertFalse(p["risk_resolved"])
    def test_13_source_stale(self):
        e=event(receipt={"ok":True,"fetched_epoch":NOW-TTL-1,"sha256":"SYNTHETIC"})
        self.assertFalse(self.proposed(e)["proposals"])
    def test_14_nonzero_budget_action(self):
        e=event();c=candidate(e,P,{},NOW);c["cost_cents"]=1
        self.assertEqual(guard(c,P,e,NOW,True),"BUDGET_OR_NONZERO_COST")
    def test_15_permission_and_real_identity(self):
        e=event();c=candidate(e,P,{},NOW)
        self.assertEqual(guard(c,dict(P,classification="REAL"),e,NOW,True),"IDENTITY_SCOPE")
        self.assertEqual(guard(c,dict(P,permissions=["pay"]),e,NOW,True),"PERMISSION")
        self.assertEqual(guard(dict(c,action="send_message"),P,e,NOW,True),"PERMISSION")
    def test_16_no_money_or_executor(self):
        s=self.proposed();r=s["runs"][-1]
        self.assertEqual(r["real_transactions"],0);self.assertEqual(r["net_receipts_usd"],0)
        self.assertTrue(all(not p["external_execution"] and p["cost_cents"]==0 for p in s["proposals"].values()))
    def test_17_disappearance_then_reappearance(self):
        s=self.proposed();s,r=step(s,[],NOW+1)
        self.assertEqual(next(iter(s["proposals"].values()))["status"],"SUSPENDED")
        s,r=step(s,[event()],NOW+2)
        self.assertEqual(next(iter(s["proposals"].values()))["status"],"PROPOSED")
    def test_18_expiry_never_means_safe(self):
        s=self.proposed();s,r=step(s,[],NOW+601)
        p=next(iter(s["proposals"].values()))
        self.assertEqual(p["reason"],"EXPIRED_ALERT_NOT_RISK_RESOLVED");self.assertFalse(p["risk_resolved"])
    def test_19_marine_role_unknown_and_zero_minutes(self):
        s=self.proposed(event(event="Rip Current Statement"))
        self.assertEqual(next(iter(s["proposals"].values()))["action"],"confirm_activity_scope")
        s,r=step(new_state(),[event()],people=[dict(P,spare_minutes=0)])
        self.assertFalse(s["proposals"]);self.assertEqual(r["rejected"][0]["reason"],"TIME_BUDGET")
    def test_20_unknown_or_stale_mapping(self):
        self.assertFalse(step(new_state(),[event()],mapping={})[0]["proposals"])
    def test_21_synthetic_not_accepted_in_production(self):
        s,r=advance(new_state(),[event()],[P],MAP,{"NWS":True},NOW,{"id":"test"},test=False)
        self.assertFalse(s["proposals"])
    def test_22_json_restore_and_chain(self):
        s=self.proposed();restored=json.loads(json.dumps(s));again,r=step(restored,[event()],NOW+1)
        self.assertEqual(r["receipt"]["before_state_sha256"],digest(s));self.assertEqual(r["receipt"]["transitions"],0)
    def test_23_polygon_holes(self):
        g={"type":"Polygon","coordinates":[[[0,0],[3,0],[3,3],[0,3],[0,0]],[[.5,.5],[1.5,.5],[1.5,1.5],[.5,1.5],[.5,.5]]]}
        self.assertFalse(self.proposed(event(geometry=g))["proposals"])
    def test_24_stale_update_cannot_cancel_later(self):
        s=self.proposed(event(sent=NOW))
        cancel=event("SYNTHETIC-CANCEL",message="Cancel",sent=NOW-30,references=[event()["id"]])
        s,r=step(s,[event(sent=NOW),cancel],NOW+1)
        self.assertEqual(next(iter(s["proposals"].values()))["status"],"PROPOSED")
if __name__=="__main__":
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(Safety)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    lifecycle=new_state();frames=[]
    for t,ev in [(NOW,[event()]),(NOW+1,[event()]),(NOW+2,[event("SYNTHETIC-UP",message="Update",sent=NOW+1,references=[event()["id"]],revision="SYNTHETIC-R2")]),(NOW+3,[event("SYNTHETIC-CANCEL",message="Cancel",sent=NOW+2,references=["SYNTHETIC-UP"])])]:
        lifecycle,record=step(json.loads(json.dumps(lifecycle)),ev,t)
        frames.append({"at":stamp(t),"journal":record["receipt"],"proposals":copy.deepcopy(lifecycle["proposals"])})
    evidence={"classification":"SYNTHETIC_TEST_ONLY","tests":result.testsRun,"failures":len(result.failures),"errors":len(result.errors),"pass":result.wasSuccessful(),
        "cases":unittest.defaultTestLoader.getTestCaseNames(Safety),"lifecycle":frames,"independent_semantic_review":0}
    path=Path(__file__).parent/"evidence/tests.json";path.parent.mkdir(exist_ok=True);path.write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
    raise SystemExit(0 if result.wasSuccessful() else 1)
