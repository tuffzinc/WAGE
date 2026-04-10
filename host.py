from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
import os
import socket

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 5173


class RootHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def detect_host():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def main():
    parser = argparse.ArgumentParser(description="Serve the project root for index.html")
    parser.add_argument("--host", default="0.0.0.0", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", DEFAULT_PORT)), help="Port to bind")
    args = parser.parse_args()

    os.chdir(ROOT)

    server = ThreadingHTTPServer((args.host, args.port), RootHandler)
    local_ip = detect_host()

    print(f"Serving {ROOT}")
    print(f"Local:   http://127.0.0.1:{args.port}/index.html")
    if args.host == "0.0.0.0":
        print(f"Network: http://{local_ip}:{args.port}/index.html")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
