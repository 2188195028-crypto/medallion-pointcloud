# -*- coding: utf-8 -*-
"""serve_debug.py — 静态服务器 + /shot 截图上报接口
用法: python serve_debug.py [port]
- GET   : 静态文件服务(同 http.server,允许跨域)
- POST /shot : 接收 PNG body,保存到 shots/ 目录,返回文件名
- POST /diag : 接收诊断 JSON,保存到 shots/diag-<时间戳>.json
作者: Ligong-Wenchang  日期: 2026-08-04
"""
import os, sys, time, json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT_DIR = os.path.join(ROOT, "shots")
os.makedirs(SHOT_DIR, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        if self.path == "/shot":
            name = "shot-%s.png" % time.strftime("%Y%m%d-%H%M%S")
            # 同名覆盖,便于脚本断言最新截图
            latest = os.path.join(SHOT_DIR, "latest.png")
            with open(os.path.join(SHOT_DIR, name), "wb") as f:
                f.write(body)
            with open(latest, "wb") as f:
                f.write(body)
            msg = json.dumps({"saved": name})
        elif self.path == "/diag":
            name = "diag-%s.json" % time.strftime("%Y%m%d-%H%M%S")
            try:
                data = json.loads(body.decode("utf-8"))
            except Exception:
                data = {"raw": body.decode("utf-8", "replace")}
            with open(os.path.join(SHOT_DIR, name), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            msg = json.dumps({"saved": name})
        else:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(msg)))
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (time.strftime("%H:%M:%S"), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8137
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("serve_debug on http://127.0.0.1:%d (root=%s)" % (port, ROOT))
    srv.serve_forever()
