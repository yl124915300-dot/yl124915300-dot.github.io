import importlib.util
from pathlib import Path
import threading
import unittest
import urllib.request
import urllib.error

spec = importlib.util.spec_from_file_location("launcher", Path(__file__).resolve().parents[1] / "launch.py")
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

class LauncherTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = launcher.ThreadingHTTPServer(("127.0.0.1", 0), launcher.Handler)
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
    def test_static_and_mime(self):
        with urllib.request.urlopen(self.url + "/core.mjs") as r:
            self.assertEqual(r.status, 200)
            self.assertIn("javascript", r.headers["Content-Type"])
            self.assertIn("frame-ancestors 'none'", r.headers["Content-Security-Policy"])
    def test_arbitrary_host_rejected(self):
        req = urllib.request.Request(self.url + "/", headers={"Host": "attacker.example"})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(req)
        self.assertEqual(cm.exception.code, 403)
    def test_post_rejected(self):
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(urllib.request.Request(self.url + "/", data=b"image", method="POST"))
        self.assertEqual(cm.exception.code, 405)
    def test_traversal_and_source_files_rejected(self):
        for path in ["/%2e%2e/README.md", "/launch.py", "/tests/core.test.mjs", "/package.json", "/vendor/"]:
            with self.subTest(path=path), self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(self.url + path)
            self.assertEqual(cm.exception.code, 404)
if __name__ == "__main__":
    unittest.main()
