"""Loopback-only static launcher. No game API, screenshots or credentials are read."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import threading
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
STATIC = {"index.html", "style.css", "core.mjs", "recognition.mjs", "app.mjs", "sw.js", "manifest.webmanifest", "icon.svg", "README.md"}
CSP = ("default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; "
       "connect-src 'self' blob:; img-src 'self' data: blob:; media-src 'self' blob:; "
       "style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'")
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass
    def allowed(self):
        if self.headers.get("Host") not in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}:
            self.send_error(403, "Invalid Host")
            return False
        path = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        target = (ROOT / path).resolve()
        if ".." in Path(path).parts or not target.is_relative_to(ROOT) or not target.is_file():
            self.send_error(404)
            return False
        if path not in STATIC and not path.startswith("vendor/"):
            self.send_error(404)
            return False
        return True
    def do_GET(self):
        if self.allowed():
            super().do_GET()
    def do_HEAD(self):
        if self.allowed():
            super().do_HEAD()
    def do_POST(self):
        self.send_error(405, "Read-only static companion")
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
    def guess_type(self, path):
        if path.endswith(".mjs"):
            return "text/javascript"
        if path.endswith(".wasm"):
            return "application/wasm"
        return super().guess_type(path)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--no-browser", action="store_true")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://127.0.0.1:{server.server_port}/"
    if args.self_test:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        with urllib.request.urlopen(url) as r:
            assert r.status == 200 and b"GamePilot" in r.read()
        server.shutdown()
        server.server_close()
        print("LOOPBACK_INSTALL_SELF_TEST_PASS")
        return
    print(url, flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
