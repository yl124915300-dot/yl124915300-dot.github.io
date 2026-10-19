"""Anonymous cloud read, no account headers or cookies."""
import hashlib
import json
import time
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import Request,urlopen

root=Path(__file__).resolve().parent
base="https://yl124915300-dot.github.io/pli-v11/"
expected=hashlib.sha256((root/"app.js").read_bytes()).hexdigest()
error=None
for attempt in range(48):
    try:
        nonce=str(time.time_ns())
        with urlopen(Request(base+"app.js?check="+nonce,headers={"Cache-Control":"no-cache"}),timeout=15) as r:
            assert r.status==200 and hashlib.sha256(r.read()).hexdigest()==expected,"deployed app hash differs"
        with urlopen(Request(base+"data.json?check="+nonce,headers={"Cache-Control":"no-cache"}),timeout=15) as r:
            data=json.load(r)
        assert data["version"]=="1.1.0"
        age=time.time()-datetime.fromisoformat(data["generated_at"]).timestamp()
        assert -600<=age<=7200,"public snapshot is stale"
        receipt=dict(result="PASS",at=datetime.now(timezone.utc).isoformat(),url=base,
                     authentication="none",cookie_jar="none",deployed_app_sha256=expected,
                     snapshot_at=data["generated_at"],memory_sha256=data["memory_sha256"],total_runs=data["total_runs"])
        (root/"evidence").mkdir(exist_ok=True)
        (root/"evidence"/"public-http.json").write_text(json.dumps(receipt),encoding="utf-8")
        print(json.dumps(receipt))
        break
    except Exception as exc:
        error=str(exc)
        time.sleep(5)
else:
    raise RuntimeError("Anonymous deployment verification failed: "+str(error))
