#!/usr/bin/env python3
"""Discover GOV.UK policy content candidates using the public Search API.

Search hits are only leads. Neither new nor existing hits are automatically
published to RSS, calendar, entitlement decisions, or sent to residents.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
import json
import re
import sys
import time
import urllib.request

ROOT=Path(__file__).resolve().parent
DEST=ROOT/"data"/"discovery_queue.json"
QUERIES=[
    ("warm-home-discount","warm home discount"),
    ("cold-weather-payment","cold weather payment"),
    ("childcare","free childcare working parents"),
    ("energy","energy price cap"),
    ("local-support","crisis resilience fund"),
]
MAX_PER_QUERY=75
MAX_QUEUE=120

# Search API uses broad token matching; never treat a search hit as relevant
# unless its title or description contains one of these explicit phrases.
TOPIC_PHRASES={
    "warm-home-discount":("warm home discount",),
    "cold-weather-payment":("cold weather payment","cold weather payments"),
    "childcare":("free childcare","working parents","childcare entitlement","childcare support","funded childcare","childcare funding","childcare costs"),
    "energy":("energy price cap","energy-price cap","default tariff price cap"),
    "local-support":("crisis and resilience fund","crisis resilience fund"),
}

def likely_relevant(entry, topic):
    path=str(entry.get("link") or entry.get("official_url") or "")
    if "/employment-tribunal-decisions/" in path or "/government/people/" in path:
        return False
    if "/government/statistics/announcements/" in path:
        return False
    if str(entry.get("title") or "").lower().startswith("easy read:"):
        return False
    if "(estimated)" in str(entry.get("title") or "").lower():
        return False
    title=str(entry.get("title") or "").lower()
    description=str(entry.get("description") or "").lower()
    text=title+" "+description
    return any(phrase in text for phrase in TOPIC_PHRASES[topic])

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00","Z")

def fetch_json(url):
    request=urllib.request.Request(url,headers={
        "Accept":"application/json",
        "User-Agent":"PolicyRadarUK/0.1 (source-linked, no user data)"})
    with urllib.request.urlopen(request,timeout=30) as resp:
        raw=resp.read(3_000_000)
        if len(raw)>=3_000_000: raise ValueError("Search response too large")
        payload=json.loads(raw.decode("utf-8"))
    if not isinstance(payload.get("results"),list):
        raise ValueError("Unexpected GOV.UK Search API response")
    return payload

def main():
    now=now_iso()
    from_date=(datetime.now(timezone.utc)-timedelta(days=45)).date().isoformat()
    previous={}
    if DEST.exists():
        try:
            older=json.loads(DEST.read_text(encoding="utf-8"))
            previous={p["official_url"]:p for p in older.get("candidates",[])}
        except (OSError,ValueError,KeyError):
            previous={}
    candidates={}
    failed_queries=[]
    for topic,q in QUERIES:
        params=urlencode({
            "q":q,
            "count":MAX_PER_QUERY,
            "filter_public_timestamp":f"from:{from_date}",
            "fields":"title,description,link,public_timestamp,format",
        })
        try:
            payload=fetch_json("https://www.gov.uk/api/search.json?"+params)
            results=payload["results"]
            print(f"{topic}: {len(results)} search hits")
        except Exception as exc:
            failed_queries.append({"topic":topic,"error":str(exc)[:250]})
            print(f"{topic}: search failed: {exc}",file=sys.stderr)
            continue
        for entry in results:
            path=entry.get("link","")
            if not isinstance(path,str) or not re.fullmatch(r"/[a-zA-Z0-9/_-]{1,300}",path):
                continue
            title=entry.get("title","")
            published=entry.get("public_timestamp")
            if not isinstance(title,str) or not isinstance(published,str):
                continue
            if not likely_relevant(entry,topic):
                continue
            url="https://www.gov.uk"+path
            old=previous.get(url,{})
            current=candidates.get(url)
            if current:
                if topic not in current["matched_topics"]:current["matched_topics"].append(topic)
                continue
            candidates[url]={
                "official_url":url,
                "title":title[:260],
                "description":str(entry.get("description") or "")[:500],
                "published_at":published,
                "format":str(entry.get("format") or "")[:80],
                "matched_topics":[topic],
                "first_seen_utc":old.get("first_seen_utc",now),
                "last_seen_utc":now,
                "review_status":old.get("review_status","needs_human_review"),
            }
        time.sleep(0.4)
    for url,old in previous.items():
        if url not in candidates and old.get("review_status")=="needs_human_review":
            if any(likely_relevant(old,t) for t in old.get("matched_topics",[]) if t in TOPIC_PHRASES):
                candidates[url]=old
    ranked=sorted(candidates.values(),key=lambda x:x.get("published_at",""),reverse=True)[:MAX_QUEUE]
    result={
        "schema_version":1,
        "last_searched_utc":now,
        "purpose":"Discovery queue, not verified policy or eligibility advice",
        "from_date":from_date,
        "queries":[{"topic":k,"search_terms":q} for k,q in QUERIES],
        "failed_queries":failed_queries,
        "candidate_count":len(ranked),
        "candidates":ranked
    }
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Queued {len(ranked)} source-linked hits for editorial review; {len(failed_queries)} search errors.")
    if len(failed_queries)==len(QUERIES):
        raise RuntimeError("All official Search API queries failed")

if __name__=="__main__":
    main()
