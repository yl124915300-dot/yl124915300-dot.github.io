import copy
import json
import tempfile
import unittest
from pathlib import Path
from engine import *

T = stamp("2026-10-19T06:00:00Z")

def weather(geometry=None,ugc=None,zones=None,status="Actual",message="Alert"):
    return dict(type="Feature",geometry=geometry,properties=dict(id="https://api.weather.gov/alerts/test",
        status=status,messageType=message,event="TEST_FIXTURE",sent=iso(T-60),effective=iso(T-60),
        expires=iso(T+3600),severity="Severe",geocode=dict(UGC=ugc or []),affectedZones=zones or []))

def polygon(x=-122.5,y=47.5):
    return dict(type="Polygon",coordinates=[[[x,y],[x+.4,y],[x+.4,y+.3],[x,y+.3],[x,y]]])

def quake(lon=-122.33,lat=47.61,mag=5):
    return dict(type="Feature",id="fixture",geometry=dict(type="Point",coordinates=[lon,lat,10]),
                properties=dict(type="earthquake",mag=mag,time=(T-60)*1000,updated=T*1000,title="TEST_FIXTURE",url="https://earthquake.usgs.gov/earthquakes/eventpage/fixture"))

def event(f=None,name="NWS"):
    return normalize(f or weather(ugc=["WAC033"]),name,T,live=True)

def ready():
    s = empty_state()
    s["sources"] = {n:dict(result="PASS",success_at=iso(T)) for n in FEEDS}
    return s

class EngineTests(unittest.TestCase):
    def test_six_synthetic_only(self):
        s=empty_state()
        self.assertEqual(len(s["profiles"]),6)
        self.assertTrue(all(p["classification"]=="SYNTHETIC" for p in s["profiles"]))

    def test_fixture_cannot_become_live(self):
        e=normalize(weather(), "NWS",T)
        self.assertEqual(e["evidence"],"TEST_FIXTURE")
        self.assertEqual(evaluate(e,PROFILES[1],ready(),T)["status"],"NO_MATCH")

    def test_nws_test_exercise_draft_rejected(self):
        for status in ("Test","Exercise","Draft","System"):
            self.assertIsNone(normalize(weather(status=status),"NWS",T,live=True))

    def test_unknown_message_rejected(self):
        self.assertIsNone(normalize(weather(message="Ack"),"NWS",T,live=True))

    def test_polygon_inside(self):
        self.assertEqual(weather_scope(event(weather(polygon())),PROFILES[1],{},T),(True,"official_polygon"))

    def test_polygon_overrides_broad_county(self):
        e=event(weather(polygon(-120,40),["WAC033"]))
        self.assertEqual(weather_scope(e,PROFILES[1],{},T),(False,"official_polygon"))

    def test_polygon_hole(self):
        g=polygon()
        g["coordinates"].append([[-122.4,47.55],[-122.2,47.55],[-122.2,47.7],[-122.4,47.7],[-122.4,47.55]])
        self.assertFalse(weather_scope(event(weather(g)),PROFILES[1],{},T)[0])

    def test_multipolygon(self):
        g=dict(type="MultiPolygon",coordinates=[polygon(-120,40)["coordinates"],polygon()["coordinates"]])
        self.assertTrue(weather_scope(event(weather(g)),PROFILES[1],{},T)[0])

    def test_polygon_boundary(self):
        self.assertTrue(in_geometry(dict(lon=-122.5,lat=47.5),polygon()))

    def test_dateline(self):
        g=dict(type="Polygon",coordinates=[[[179,10],[-179,10],[-179,12],[179,12],[179,10]]])
        self.assertTrue(in_geometry(dict(lon=-179.5,lat=11),g))
        self.assertTrue(in_geometry(dict(lon=179.5,lat=11),g))
        self.assertFalse(in_geometry(dict(lon=0,lat=11),g))

    def test_invalid_geometry_fails_closed(self):
        e=event(weather(dict(type="LineString",coordinates=[]),["WAC033"]))
        self.assertEqual(weather_scope(e,PROFILES[1],{},T),(False,"invalid_geometry"))

    def test_county_match(self):
        self.assertEqual(weather_scope(event(),PROFILES[1],{},T),(True,"county_ugc"))

    def test_zone_mapping(self):
        z="https://api.weather.gov/zones/forecast/WAZ558"
        e=event(weather(zones=[z]))
        m={"S2":dict(zones=[z],fetched_epoch=T-10)}
        self.assertEqual(weather_scope(e,PROFILES[1],m,T),(True,"nws_point_zone"))

    def test_zone_mapping_stale(self):
        z="https://api.weather.gov/zones/forecast/WAZ558"
        e=event(weather(zones=[z]))
        self.assertFalse(weather_scope(e,PROFILES[1],{"S2":dict(zones=[z],fetched_epoch=T-8*86400)},T)[0])

    def test_no_free_text_region_guess(self):
        e=event(weather())
        e["title"]="Seattle King County"
        self.assertFalse(weather_scope(e,PROFILES[1],{},T)[0])

    def test_quake_close_and_far(self):
        a=event(quake(),"USGS")
        self.assertEqual(evaluate(a,PROFILES[1],ready(),T)["status"],"PROPOSED")
        a=event(quake(lon=139,lat=35,mag=7),"USGS")
        self.assertEqual(evaluate(a,PROFILES[1],ready(),T)["status"],"NO_MATCH")

    def test_quake_low_and_negative_magnitude(self):
        for mag in (-.8,4.4):
            self.assertEqual(evaluate(event(quake(mag=mag),"USGS"),PROFILES[1],ready(),T)["status"],"NO_MATCH")

    def test_haversine_antimeridian(self):
        self.assertAlmostEqual(distance(0,179,0,-179),222.39,places=1)

    def test_quake_nan_rejected(self):
        with self.assertRaises(ValueError):
            event(quake(mag=float("nan")),"USGS")

    def test_quake_range_rejected(self):
        with self.assertRaises(ValueError):
            event(quake(lat=91),"USGS")

    def test_expired(self):
        e=event()
        e["expires_at"]=iso(T)
        self.assertEqual(evaluate(e,PROFILES[1],ready(),T)["reason"],"cancelled_or_expired")

    def test_not_yet_effective(self):
        e=event()
        e["starts_at"]=iso(T+100)
        self.assertEqual(evaluate(e,PROFILES[1],ready(),T)["reason"],"not_yet_effective")

    def test_future_timestamp_rejected(self):
        f=weather()
        f["properties"]["sent"]=iso(T+601)
        with self.assertRaises(ValueError):
            event(f)

    def test_naive_time_rejected(self):
        with self.assertRaises(ValueError):
            stamp("2026-10-19T00:00:00")

    def test_stale_source_suppresses(self):
        s=ready()
        s["sources"]["NWS"]["success_at"]=iso(T-7201)
        self.assertEqual(evaluate(event(),PROFILES[1],s,T)["reason"],"source_unavailable_or_stale")

    def test_failed_source_suppresses(self):
        s=ready()
        s["sources"]["NWS"]["result"]="FAIL"
        self.assertEqual(evaluate(event(),PROFILES[1],s,T)["reason"],"source_unavailable_or_stale")

    def test_budget_time_constraint(self):
        s=ready()
        e=event(weather(ugc=["ILC031"]))
        self.assertEqual(evaluate(e,PROFILES[5],s,T)["action"],"flag_schedule_conflict")

    def test_proposal_revocation_history(self):
        s=ready()
        e=event()
        s["events"][e["id"]]=e
        reconcile(s,T)
        self.assertEqual(s["decisions"]["S2|"+e["id"]]["status"],"PROPOSED")
        e["status"]="cancelled"
        reconcile(s,T+1)
        self.assertEqual(s["decisions"]["S2|"+e["id"]]["status"],"REVOKED")
        self.assertEqual(s["history"][-1]["decision"]["status"],"REVOKED")

    def test_no_duplicate_history(self):
        s=ready()
        e=event()
        s["events"][e["id"]]=e
        reconcile(s,T)
        n=len(s["history"])
        reconcile(s,T)
        self.assertEqual(len(s["history"]),n)

    def test_cap_update_supersedes_old_id(self):
        s=ready()
        old=event()
        s["events"][old["id"]]=old
        f=weather()
        f["properties"].update(id="https://api.weather.gov/alerts/new",references=[dict(identifier="https://api.weather.gov/alerts/test")])
        ingest_batch(s,"NWS",dict(type="FeatureCollection",features=[f]),{"response_sha256":"fixture"},T)
        self.assertEqual(s["events"][old["id"]]["status"],"cancelled")

    def test_older_revision_cannot_reactivate(self):
        s=ready()
        old=event()
        old.update(status="cancelled",updated_at=iso(T))
        s["events"][old["id"]]=old
        counts=ingest_batch(s,"NWS",dict(type="FeatureCollection",features=[weather()]),{"response_sha256":"fixture"},T)
        self.assertEqual(counts["skipped"],1)
        self.assertEqual(s["events"][old["id"]]["status"],"cancelled")

    def test_stale_live_usgs_collection_rejected(self):
        with self.assertRaises(ValueError):
            ingest_batch(ready(),"USGS",dict(type="FeatureCollection",features=[],metadata=dict(generated=(T-7201)*1000)),{},T)

    def test_empty_valid_feed_is_zero_not_failure(self):
        c=ingest_batch(ready(),"NWS",dict(type="FeatureCollection",features=[]),{"response_sha256":"fixture"},T)
        self.assertEqual(c["accepted"],0)
        self.assertEqual(c["rejected"],0)

    def test_malformed_feature_counted(self):
        c=ingest_batch(ready(),"NWS",dict(type="FeatureCollection",features=[{}]),{"response_sha256":"fixture"},T)
        self.assertEqual(c["rejected"],1)

    def test_outage_is_not_replaced_with_fixture(self):
        s=empty_state()
        def offline(*_):
            raise OSError("TEST_OUTAGE")
        refresh(s,T,offline)
        self.assertEqual(len(s["events"]),0)
        self.assertTrue(all(v["result"]=="FAIL" for v in s["sources"].values()))

    def test_round_trip_persistent_state(self):
        s=ready()
        e=event()
        s["events"][e["id"]]=e
        reconcile(s,T)
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"memory.json"
            save(p,s)
            self.assertEqual(sha(read_state(p)),sha(s))

    def test_modified_profiles_cannot_publish(self):
        s=empty_state()
        s["profiles"][0]["label"]="REAL PERSON"
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"memory.json"
            save(p,s)
            with self.assertRaises(ValueError):
                read_state(p)

    def test_retention_cap(self):
        s=ready()
        s["history"]=[dict(at=iso(T),decision={},event={}) for _ in range(500)]
        reconcile(s,T)
        self.assertEqual(len(s["history"]),400)

    def test_all_external_actions_denied(self):
        for action in ("payment","order","submit","message"):
            self.assertEqual(attempt(dict(action=action,approved=True)),dict(allowed=False,executed=False,reason="NO_EXTERNAL_EXECUTOR"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
