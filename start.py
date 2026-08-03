# -*- coding: utf-8 -*-
"""start.py — 一键启动展陈页
若 8137 端口服务器未运行则启动它,然后打开浏览器。
用法:双击 start.bat(或 python start.py)
作者: Ligong-Wenchang  日期: 2026-08-04
"""
import socket
import subprocess
import sys
import time
import webbrowser
import os

PORT = 8137
ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "http://127.0.0.1:%d/" % PORT


def port_open(port):
    s = socket.socket()
    s.settimeout(0.5)
    try:
        s.connect(("127.0.0.1", port))
        s.close()
        return True
    except Exception:
        try:
            s.close()
        except Exception:
            pass
        return False


def main():
    if not port_open(PORT):
        print("启动本地服务器 %s ..." % URL)
        # 新控制台窗口运行服务器,关闭时一并退出
        subprocess.Popen(
            [sys.executable, "tools/serve_debug.py", str(PORT)],
            cwd=ROOT,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
        for _ in range(50):  # 最多等 10 秒
            time.sleep(0.2)
            if port_open(PORT):
                break
    if port_open(PORT):
        print("服务器已就绪,打开浏览器 %s" % URL)
        webbrowser.open(URL)
        print("完成!关闭服务器窗口即可停止。")
    else:
        print("服务器启动失败,请检查 8137 端口是否被占用。")


if __name__ == "__main__":
    main()
