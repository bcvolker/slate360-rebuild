"""Local Spark harness server (render-only diagnostic). /nm/* -> the app's own node_modules (C:/s360: @sparkjsdev/spark
2.1.0, three 0.184.0); /d/* -> the diagnostic data dir (PLYs, poses); POST /save?name= writes lossless PNG bytes and
POST /json?name= writes JSON into <data>/out_spark/."""
import http.server
import os
import sys
import urllib.parse
from pathlib import Path

HERE = Path(__file__).parent
NM = Path(r"C:\s360\node_modules")
DATA = Path(sys.argv[1])
OUT = DATA / "out_spark"
OUT.mkdir(exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        if p.startswith("/nm/"):
            return str(NM / p[4:])
        if p.startswith("/p/"):
            return str(HERE / "spark-2.1.0-shfix" / p[3:])
        if p.startswith("/d/"):
            return str(DATA / p[3:])
        return str(HERE / p.lstrip("/"))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q["name"][0])
        n = int(self.headers["Content-Length"])
        (OUT / name).write_bytes(self.rfile.read(n))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *a):
        pass


H.extensions_map.update({".js": "application/javascript", ".mjs": "application/javascript", ".wasm": "application/wasm"})
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[2]) if len(sys.argv) > 2 else 8766), H).serve_forever()
