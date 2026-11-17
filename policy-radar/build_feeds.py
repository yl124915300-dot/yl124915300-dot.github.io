#!/usr/bin/env python3
"""Build public RSS and iCalendar subscriptions from editor-approved UK milestones.

Only manually verified entries in approved_events.json may be published.
Machine fingerprints in source_status.json are NEVER a source for this feed.
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timedelta, timezone, date
from email.utils import format_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "approved_events.json"
BASE = "https://yl124915300-dot.github.io/policy-radar/"
ATOM_NS = "http://www.w3.org/2005/Atom"

def esc_ics(value: str) -> str:
    return str(value).replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")

def fold(line: str) -> str:
    # RFC 5545 text line folding, taking Unicode bytes into account.
    chunks, current = [], ""
    for char in line:
        if len((current+char).encode("utf-8")) > 73:
            chunks.append(current)
            current = " " + char
        else:
            current += char
    return "\r\n".join(chunks)

def main() -> None:
    src = json.loads(DATA.read_text(encoding="utf-8"))
    if src.get("schema_version") != 1:
        raise ValueError("Unexpected approved-events schema")
    entries = src.get("events", [])
    if not isinstance(entries, list):
        raise ValueError("events must be an array")
    ids = set()
    curated = []
    for entry in entries:
        if entry.get("approved") is not True:
            continue
        if not entry.get("source", "").startswith(("https://www.gov.uk/", "https://www.ofgem.gov.uk/")):
            raise ValueError("Only allow official source URLs")
        if not re.fullmatch(r"[a-z0-9-]{8,120}", entry.get("id","")):
            raise ValueError("Bad event id")
        if entry["id"] in ids:
            raise ValueError("Duplicate event id")
        ids.add(entry["id"])
        if len(entry.get("title","")) > 200 or len(entry.get("description","")) > 900:
            raise ValueError("Event too long")
        d = date.fromisoformat(entry["date"])
        published = datetime.fromisoformat(entry["reviewed_at"].replace("Z","+00:00"))
        if published.utcoffset() is None:
            raise ValueError("Review date must have timezone")
        curated.append((entry,d,published))

    ET.register_namespace("atom", ATOM_NS)
    rss = ET.Element("rss", {"version":"2.0"})
    channel = ET.SubElement(rss, "channel")
    for tag,val in [
        ("title","Policy Radar UK — verified policy milestones"),
        ("link",BASE),
        ("description","Independent, source-linked UK policy dates. Entries are reviewed before publication. Personal eligibility is never guaranteed."),
        ("language","en-gb"),
        ("ttl","720"),
    ]:
        ET.SubElement(channel,tag).text=val
    ET.SubElement(channel,f"{{{ATOM_NS}}}link",{"href":BASE+"updates.xml","rel":"self","type":"application/rss+xml"})
    if curated:
        ET.SubElement(channel,"lastBuildDate").text=format_datetime(max(x[2] for x in curated).astimezone(timezone.utc),usegmt=True)
    for entry,d,published in sorted(curated,key=lambda x:x[2],reverse=True):
        item=ET.SubElement(channel,"item")
        for tag,value in [
            ("title",entry["title"]),
            ("link",entry["source"]),
            ("description",entry["description"]+" Source: "+entry["source"]+" · Status: "+entry["status"]+" · Reviewed: "+published.date().isoformat()),
            ("guid",entry["id"]+"@policy-radar.uk"),
            ("pubDate",format_datetime(published.astimezone(timezone.utc),usegmt=True)),
        ]:
            child=ET.SubElement(item,tag)
            child.text=value
            if tag=="guid": child.set("isPermaLink","false")
    ET.indent(rss)
    xml=b'<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(rss, encoding="utf-8") + b"\n"
    (ROOT/"updates.xml").write_bytes(xml)

    lines=[
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Policy Radar UK//Verified public policy dates//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Policy Radar UK — official milestones",
        "X-WR-CALDESC:Source-checked public dates only; not individual legal or benefits advice.",
    ]
    for entry,d,published in sorted(curated,key=lambda x:x[1]):
        lines.extend([
            "BEGIN:VEVENT",
            "UID:"+entry["id"]+"@policy-radar.uk",
            "DTSTAMP:"+published.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
            "DTSTART;VALUE=DATE:"+d.strftime("%Y%m%d"),
            "DTEND;VALUE=DATE:"+(d+timedelta(days=1)).strftime("%Y%m%d"),
            "SUMMARY:"+esc_ics(entry["title"]),
            "DESCRIPTION:"+esc_ics(entry["description"]+" Official source: "+entry["source"]),
            "URL:"+entry["source"],
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ])
    lines.append("END:VCALENDAR")
    (ROOT/"calendar.ics").write_bytes(("\r\n".join(fold(x) for x in lines)+"\r\n").encode("utf-8"))
    print(f"Generated {len(curated)} reviewed milestones. Machine-detected text differences were not published.")

if __name__ == "__main__":
    main()
