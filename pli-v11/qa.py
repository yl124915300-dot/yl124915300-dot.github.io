import json
from pathlib import Path
import unittest
from datetime import datetime, timezone

root=Path(__file__).resolve().parent
suite=unittest.defaultTestLoader.discover(str(root),pattern="test_engine.py")
result=unittest.TextTestRunner(verbosity=2).run(suite)
report=dict(at=datetime.now(timezone.utc).isoformat(),kind="TEST_FIXTURE_ONLY",tests=result.testsRun,
            failures=len(result.failures),errors=len(result.errors),skipped=len(result.skipped),
            result="PASS" if result.wasSuccessful() else "FAIL")
(root/"evidence").mkdir(exist_ok=True)
(root/"evidence"/"tests.json").write_text(json.dumps(report),encoding="utf-8")
print(json.dumps(report))
raise SystemExit(0 if result.wasSuccessful() else 1)
