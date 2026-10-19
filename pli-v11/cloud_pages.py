"""Read existing Pages config; request a rebuild after an own-data-only commit."""
import argparse
import json
import os
from pathlib import Path
from urllib.request import Request,urlopen

def api(path,method="GET"):
    repo=os.environ["GITHUB_REPOSITORY"]
    if repo!="yl124915300-dot/yl124915300-dot.github.io":
        raise ValueError("wrong repository")
    req=Request("https://api.github.com/repos/"+repo+path,method=method,
        data=b"{}" if method=="POST" else None,
        headers={"Accept":"application/vnd.github+json","Authorization":"Bearer "+os.environ["GH_TOKEN"],
                 "X-GitHub-Api-Version":"2022-11-28","User-Agent":"PLI-V1.1-cloud-check"})
    with urlopen(req,timeout=25) as response:
        return response.status,json.load(response)

p=argparse.ArgumentParser()
p.add_argument("command",choices=["inspect","build"])
args=p.parse_args()
status,site=api("/pages")
receipt=dict(http_status=status,html_url=site.get("html_url"),build_type=site.get("build_type"),source=site.get("source"),public=site.get("public"),status=site.get("status"))
if site.get("source")!={"branch":"main","path":"/"} or site.get("build_type") not in ("legacy",None):
    raise ValueError("existing Pages config is not main/root legacy; no setting change allowed")
if args.command=="build":
    if os.environ.get("GITHUB_REF")!="refs/heads/main":
        raise ValueError("only own data updates on main can request a build")
    code,build=api("/pages/builds","POST")
    if code!=201:
        raise ValueError("Pages build not accepted")
    receipt["build_request"]=dict(http_status=code,status=build.get("status"),url=build.get("url"))
out=Path(__file__).resolve().parent/"evidence"
out.mkdir(exist_ok=True)
(out/("pages-config.json" if args.command=="inspect" else "pages-build.json")).write_text(json.dumps(receipt),encoding="utf-8")
print(json.dumps(receipt))
