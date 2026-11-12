"""Read-only original-file scope audit on the cloud runner."""
import subprocess,json
from pathlib import Path
base="578a1c9761faef7f3c16c23ffbd5e30458dc7b14"
def tree(ref):
 lines=subprocess.check_output(["git","ls-tree","-r",ref],text=True).splitlines()
 return {s.split("\t",1)[1]:s.split("\t",1)[0].split()[2] for s in lines}
a,b=tree(base),tree("HEAD")
changed=[p for p,s in a.items() if b.get(p)!=s]
added=[p for p in b if p not in a]
assert not changed,changed
assert all(p.startswith("pli-v131/") or p==".github/workflows/pli-v131-semantic.yml" for p in added),added
print(json.dumps({"base":base,"original_files":len(a),"original_changed":changed,"added":added}))
