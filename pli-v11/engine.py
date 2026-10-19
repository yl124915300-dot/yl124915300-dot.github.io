#!/usr/bin/env python3
"""Hourly public-data batch rules; no public server and no external executor."""
import argparse
import copy
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

VERSION = "1.1.0"
STALE_SECONDS = 7200
FEEDS = {
    "USGS": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    "NWS": "https://api.weather.gov/alerts/active?area=CA,WA,NY,FL,IL",
}
PROFILES = [
    dict(id="S1", label="纽约通勤者", city="New York", lat=40.75, lon=-73.99, county="NYC061", spare_minutes=20, goal="按时通勤"),
    dict(id="S2", label="西雅图配送员", city="Seattle", lat=47.61, lon=-122.33, county="WAC033", spare_minutes=15, goal="安全规划配送"),
    dict(id="S3", label="洛杉矶旅客", city="Los Angeles", lat=34.05, lon=-118.24, county="CAC037", spare_minutes=30, goal="核验出行条件"),
    dict(id="S4", label="旧金山家庭", city="San Francisco", lat=37.77, lon=-122.42, county="CAC075", spare_minutes=10, goal="协调家庭安排"),
    dict(id="S5", label="迈阿密店主", city="Miami", lat=25.77, lon=-80.19, county="FLC086", spare_minutes=5, goal="检查营业影响"),
    dict(id="S6", label="芝加哥学生", city="Chicago", lat=41.88, lon=-87.63, county="ILC031", spare_minutes=0, goal="协调上课出行"),
]

def iso(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat()

def stamp(s):
    t = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if t.tzinfo is None:
        raise ValueError("timezone required")
    return t.timestamp()

def canon(o):
    return json.dumps(o, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)

def sha(o):
    return hashlib.sha256(canon(o).encode()).hexdigest()

def finite(n):
    return type(n) in (int, float) and math.isfinite(n)

def distance(a, b, c, d):
    p, q = math.radians(a), math.radians(c)
    h = math.sin(math.radians(c-a)/2)**2 + math.cos(p)*math.cos(q)*math.sin(math.radians(d-b)/2)**2
    return 12742 * math.asin(math.sqrt(min(1, max(0, h))))

def in_ring(lon, lat, ring):
    if len(ring) < 4:
        raise ValueError("invalid polygon ring")
    points = []
    for vertex in ring:
        if len(vertex) < 2 or not all(finite(x) for x in vertex[:2]) or not -90 <= vertex[1] <= 90 or not -180 <= vertex[0] <= 180:
            raise ValueError("invalid polygon coordinate")
        x = vertex[0]
        if points:
            x += 360 * round((points[-1][0]-x)/360)
        points.append((x,vertex[1]))
    centre = sum(v[0] for v in points)/len(points)
    test_lon = lon + 360 * round((centre-lon)/360)
    inside = False
    for start, end in zip(points, points[1:] + points[:1]):
        x1, x2 = start[0]-test_lon, end[0]-test_lon
        y1, y2 = start[1]-lat, end[1]-lat
        if abs(x1*y2-x2*y1) < 1e-10 and min(x1,x2) <= 0 <= max(x1,x2) and min(y1,y2) <= 0 <= max(y1,y2):
            return True
        if (y1 > 0) != (y2 > 0) and 0 < x1 + (x2-x1)*(-y1)/(y2-y1):
            inside = not inside
    return inside

def in_geometry(p, geometry):
    kind = geometry.get("type")
    polys = [geometry["coordinates"]] if kind == "Polygon" else geometry["coordinates"] if kind == "MultiPolygon" else None
    if polys is None:
        raise ValueError("unsupported alert geometry")
    return any(rings and in_ring(p["lon"], p["lat"], rings[0]) and
               not any(in_ring(p["lon"], p["lat"], hole) for hole in rings[1:]) for rings in polys)

def weather_scope(event, profile, mapping, t):
    geometry = event["payload"].get("geometry")
    if geometry is not None:
        try:
            return in_geometry(profile, geometry), "official_polygon"
        except (ValueError, KeyError, TypeError, IndexError):
            return False, "invalid_geometry"
    if profile["county"] in event["payload"]["ugc"]:
        return True, "county_ugc"
    point = mapping.get(profile["id"], {})
    if 0 <= t - point.get("fetched_epoch", 0) <= 7*86400:
        if set(point.get("zones", [])) & set(event["payload"].get("zones", [])):
            return True, "nws_point_zone"
    return False, "no_verified_region_match"

def normalize(feature, name, t, live=False):
    """Fixture normalization is explicitly TEST_FIXTURE, never REAL_PUBLIC."""
    prop = feature["properties"]
    if name == "USGS":
        if prop.get("type") != "earthquake" or prop.get("mag") is None:
            return None
        xyz = feature["geometry"]["coordinates"]
        if len(xyz) < 3 or not all(finite(v) for v in xyz[:3]) or not finite(prop["mag"]):
            raise ValueError("invalid quake numeric values")
        lon, lat, depth = xyz[:3]
        if not (-180 <= lon <= 180 and -90 <= lat <= 90 and -10 <= prop["mag"] <= 10):
            raise ValueError("quake out of range")
        starts, updated = prop["time"]/1000, prop["updated"]/1000
        e = dict(id="usgs:"+str(feature["id"]), kind="earthquake", title=prop.get("title") or "USGS earthquake",
                 starts_at=iso(starts), updated_at=iso(updated), expires_at=iso(starts+86400),
                 status="active", official_url=prop.get("url"),
                 payload=dict(lat=lat, lon=lon, depth_km=depth, magnitude=prop["mag"]))
    elif name == "NWS":
        if prop.get("status") != "Actual" or prop.get("messageType") not in ("Alert", "Update", "Cancel"):
            return None
        ugc = prop.get("geocode", {}).get("UGC", [])
        zones = prop.get("affectedZones", [])
        if not isinstance(ugc, list) or not all(isinstance(x,str) for x in ugc):
            raise ValueError("invalid UGC")
        if not isinstance(zones, list) or not all(isinstance(x,str) and x.startswith("https://api.weather.gov/zones/") for x in zones):
            raise ValueError("invalid affected zones")
        severity = prop.get("severity", "Unknown")
        if severity not in ("Extreme", "Severe", "Moderate", "Minor", "Unknown"):
            raise ValueError("invalid severity")
        e = dict(id="nws:"+str(prop["id"]), kind="weather", title=prop.get("headline") or prop.get("event") or "NWS alert",
                 status="cancelled" if prop["messageType"] == "Cancel" else "active",
                 starts_at=prop.get("effective") or prop["sent"], updated_at=prop["sent"], expires_at=prop["expires"],
                 official_url=prop["id"], references=[str(x["identifier"]) for x in prop.get("references", []) if x.get("identifier")],
                 payload=dict(severity=severity, ugc=ugc, zones=zones, geometry=feature.get("geometry")))
    else:
        raise ValueError("unsupported source")
    if stamp(e["updated_at"]) > t+600 or stamp(e["starts_at"]) > t+31*86400:
        raise ValueError("implausible future event")
    if stamp(e["expires_at"]) <= stamp(e["starts_at"]):
        raise ValueError("invalid event interval")
    e.update(evidence="REAL_PUBLIC" if live else "TEST_FIXTURE", source=name, source_url=FEEDS[name],
             observed_at=iso(t), raw_sha256=sha(feature), raw=feature)
    return e

def fetch_json(url, t):
    host = urlsplit(url).hostname
    if host not in ("api.weather.gov", "earthquake.usgs.gov") or not url.startswith("https://"):
        raise ValueError("unapproved public source")
    req = Request(url, headers={"User-Agent":"PLI-V1.1-public-synthetic-demo (github.com/yl124915300-dot/yl124915300-dot.github.io)",
                                "Accept":"application/geo+json, application/json"})
    with urlopen(req, timeout=25) as response:
        if response.status != 200 or urlsplit(response.url).hostname != host or not response.url.startswith("https://"):
            raise ValueError("unexpected response origin/status")
        date = parsedate_to_datetime(response.headers["Date"]).timestamp()
        if not -600 <= t-date <= STALE_SECONDS:
            raise ValueError("stale/future HTTP response date")
        raw = response.read(8_000_001)
        if len(raw) > 8_000_000:
            raise ValueError("source exceeds 8 MB")
        return json.loads(raw), dict(http_status=200, final_url=response.url, http_date=iso(date),
                                    response_sha256=hashlib.sha256(raw).hexdigest())

def empty_state():
    return dict(format=VERSION, events={}, decisions={}, history=[], mappings={}, sources={},
                total_runs=0, profiles=[dict(p,classification="SYNTHETIC",budget_usd=100) for p in PROFILES])

def read_state(path):
    state = json.loads(path.read_text()) if path.exists() else empty_state()
    if state.get("format") != VERSION:
        raise ValueError("unsupported state format")
    if state["profiles"] != empty_state()["profiles"]:
        raise ValueError("only fixed SYNTHETIC profiles may be published")
    return state

def save(path, data):
    raw = canon(data)
    if len(raw.encode()) > 12_000_000:
        raise ValueError("state exceeds 12 MB; no partial overwrite")
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(raw, encoding="utf-8")
    os.replace(tmp, path)

def update_mapping(state, t, fetcher=fetch_json):
    errors = []
    for p in state["profiles"]:
        old = state["mappings"].get(p["id"], {})
        if 0 <= t-old.get("fetched_epoch", 0) <= 7*86400:
            continue
        url = "https://api.weather.gov/points/"+str(p["lat"])+","+str(p["lon"])
        try:
            data, receipt = fetcher(url,t)
            prop = data["properties"]
            zones = [prop[x] for x in ("forecastZone","county") if prop.get(x)]
            if not zones or not all(z.startswith("https://api.weather.gov/zones/") for z in zones):
                raise ValueError("invalid point zone mapping")
            state["mappings"][p["id"]] = dict(zones=zones,fetched_epoch=t,fetched_at=iso(t),url=url,receipt=receipt)
        except Exception as exc:
            errors.append(dict(profile_id=p["id"],error=str(exc),url=url))
    return errors

def ingest_batch(state, name, data, receipt, t):
    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        raise ValueError("not a FeatureCollection")
    if name == "USGS":
        generated = data["metadata"]["generated"]/1000
        if not -600 <= t-generated <= STALE_SECONDS:
            raise ValueError("stale/future USGS generation time")
        receipt["source_generated_at"] = iso(generated)
    accepted, skipped, rejected, errors = 0, 0, 0, []
    for feature in data["features"]:
        try:
            e = normalize(feature,name,t,live=True)
            if e is None:
                skipped += 1
                continue
            e["batch_sha256"] = receipt["response_sha256"]
            old = state["events"].get(e["id"])
            if old and stamp(old["updated_at"]) > stamp(e["updated_at"]):
                skipped += 1
                continue
            state["events"][e["id"]] = e
            if name == "NWS":
                for ref in e.get("references",[]):
                    prev = state["events"].get("nws:"+ref)
                    if prev and prev["id"] != e["id"] and stamp(prev["updated_at"]) <= stamp(e["updated_at"]):
                        prev.update(status="cancelled",superseded_by=e["id"],superseded_at=e["updated_at"])
            accepted += 1
        except (ValueError, TypeError, KeyError, IndexError, OverflowError) as exc:
            rejected += 1
            if len(errors) < 5:
                errors.append(str(exc))
    return dict(accepted=accepted,skipped=skipped,rejected=rejected,errors=errors,features=len(data["features"]))

def evaluate(event, profile, state, t):
    basis = dict(rule_version=VERSION,profile_classification="SYNTHETIC",event_evidence=event["evidence"])
    def result(status, reason, action=None):
        return dict(profile_id=profile["id"],event_id=event["id"],status=status,reason=reason,action=action,
                    basis=basis,external_execution=False,event_expires_at=event["expires_at"])
    if event["evidence"] != "REAL_PUBLIC":
        return result("NO_MATCH","fixture_or_synthetic_not_live")
    src = state["sources"].get(event["source"],{})
    if src.get("result") != "PASS" or not 0 <= t-stamp(src["success_at"]) <= STALE_SECONDS:
        return result("NO_MATCH","source_unavailable_or_stale")
    if event["status"] != "active" or stamp(event["expires_at"]) <= t:
        return result("NO_MATCH","cancelled_or_expired")
    if stamp(event["starts_at"]) > t:
        return result("NO_MATCH","not_yet_effective")
    if event["kind"] == "weather":
        matched, method = weather_scope(event,profile,state["mappings"],t)
        basis.update(matching_rule="R1",method=method,severity=event["payload"]["severity"])
        matched = matched and event["payload"]["severity"] in ("Moderate","Severe","Extreme")
    else:
        x = event["payload"]
        km = distance(profile["lat"],profile["lon"],x["lat"],x["lon"])
        radius = min(250,max(25,50*(x["magnitude"]-3)))
        matched = x["magnitude"] >= 4.5 and km <= radius
        basis.update(matching_rule="R2",distance_km=round(km,2),review_radius_km=radius,
                     magnitude=x["magnitude"],depth_km=x["depth_km"])
    if not matched:
        return result("NO_MATCH","scope_or_threshold_not_matched")
    action = "check_official_advice" if profile["spare_minutes"] >= 5 else "flag_schedule_conflict"
    basis.update(rule="R3",available_minutes=profile["spare_minutes"],required_minutes=5,cost_usd=0,goal=profile["goal"])
    return result("PROPOSED","human_review_of_official_source",action)

def reconcile(state, t):
    decisions = {}
    for e in state["events"].values():
        for p in state["profiles"]:
            key = p["id"]+"|"+e["id"]
            new = evaluate(e,p,state,t)
            old = state["decisions"].get(key)
            if new["status"] == "NO_MATCH" and old and old["status"] in ("PROPOSED","REVOKED"):
                new["status"] = "REVOKED"
            new["event_revision"] = sha({k:v for k,v in e.items() if k not in ("observed_at","batch_sha256")})
            if old != new:
                # Persist all proposal/revocation transitions, with inspectable event evidence.
                if new["status"] != "NO_MATCH":
                    compact = {k:v for k,v in e.items() if k != "raw"}
                    state["history"].append(dict(at=iso(t),decision=copy.deepcopy(new),event=compact))
            decisions[key] = new
    state["decisions"] = decisions
    state["history"] = [h for h in state["history"] if t-stamp(h["at"]) <= 7*86400][-400:]

def refresh(state, t, fetcher=fetch_json):
    mapping_errors = update_mapping(state,t,fetcher)
    for name,url in FEEDS.items():
        old = state["sources"].get(name,{})
        try:
            data,receipt = fetcher(url,t)
            counts = ingest_batch(state,name,data,receipt,t)
            # Rejected malformed features make this a degraded source, never an all-pass claim.
            state["sources"][name] = dict(name=name,url=url,attempted_at=iso(t),success_at=iso(t),
                result="PASS" if not counts["rejected"] else "DEGRADED",evidence="REAL_PUBLIC",**counts,**receipt)
        except Exception as exc:
            state["sources"][name] = dict(name=name,url=url,attempted_at=iso(t),
                success_at=old.get("success_at"),result="FAIL",evidence="FETCH_FAILURE",error=str(exc))
    reconcile(state,t)
    state["events"] = {k:e for k,e in state["events"].items() if stamp(e["expires_at"]) > t-2*86400}
    state["decisions"] = {k:d for k,d in state["decisions"].items() if d["event_id"] in state["events"]}
    state["mapping_errors"] = mapping_errors
    state["total_runs"] += 1
    state["last_run_at"] = iso(t)

def snapshot(state, t):
    events = [{k:v for k,v in e.items() if k != "raw"} for e in state["events"].values()]
    decisions = list(state["decisions"].values())
    return dict(version=VERSION,mode="RULE_ENGINE_BATCH",generated_at=iso(t),stale_after_seconds=STALE_SECONDS,
        schedule="每小时约第 23 分钟；可能延迟或跳过，不是实时预警",total_runs=state["total_runs"],
        profiles=state["profiles"],sources=list(state["sources"].values()),mapping_errors=state.get("mapping_errors",[]),
        mappings=state["mappings"],events=events,decisions=decisions,history=state["history"][-80:],
        transactions_executed=0,real_payments=0,net_income_usd=0,
        provenance_commit=os.environ.get("GITHUB_SHA"),workflow_run_url=os.environ.get("PLI_RUN_URL"),
        memory_sha256=sha(state),retention="事件过期后最多保留48小时；提议历史最多7天/400条，UI最近80条；Git提交保留版本")

def attempt(_):
    return dict(allowed=False,executed=False,reason="NO_EXTERNAL_EXECUTOR")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command",choices=["refresh","verify"])
    parser.add_argument("--root",default=str(Path(__file__).resolve().parent))
    args = parser.parse_args()
    root = Path(args.root)
    memory = root/"state"/"memory.json"
    state = read_state(memory)
    t = datetime.now(timezone.utc).timestamp()
    if args.command == "refresh":
        refresh(state,t)
        save(memory,state)
        save(root/"data.json",snapshot(state,t))
        receipt = dict(result="PASS" if all(s["result"]=="PASS" for s in state["sources"].values()) else "DEGRADED",
                       at=iso(t),sources=list(state["sources"].values()),mapping_errors=state.get("mapping_errors",[]),
                       memory_sha256=sha(state),total_runs=state["total_runs"])
        save(root/"state"/"refresh.json",receipt)
        print(canon(receipt))
    else:
        public = json.loads((root/"data.json").read_text())
        assert public["memory_sha256"] == sha(state)
        assert len(public["profiles"]) == 6 and all(p["classification"]=="SYNTHETIC" for p in public["profiles"])
        assert public["transactions_executed"] == public["real_payments"] == public["net_income_usd"] == 0
        assert all(not d["external_execution"] for d in public["decisions"])
        assert all(e["evidence"]=="REAL_PUBLIC" and e["raw_sha256"]==sha(e["raw"]) for e in state["events"].values())
        print(canon(dict(result="PASS",verification="independent_process_memory_and_public_snapshot",memory_sha256=sha(state),total_runs=state["total_runs"])))

if __name__ == "__main__":
    main()
