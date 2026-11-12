from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent
out = root / "test-results"
out.mkdir(exist_ok=True)
paths = ["index.html", "style.css", "app.mjs", "core.mjs", "recognition.mjs", "sw.js", "manifest.webmanifest", "icon.svg", "launch.py", "README.md"]
paths += [str(p.relative_to(root)) for p in (root / "vendor").rglob("*") if p.is_file()]
checksums = {}
archive = out / "GamePilot-Capture-Review-Research.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    for name in sorted(paths):
        data = (root / name).read_bytes()
        z.writestr("GamePilot-Capture-Review/" + name, data)
        checksums[name] = hashlib.sha256(data).hexdigest()
    z.writestr("GamePilot-Capture-Review/SHA256.json", json.dumps(checksums, indent=2))
(out / "bundle-sha256.txt").write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n")
print(f"Built {archive.name}: {len(paths)} files")
