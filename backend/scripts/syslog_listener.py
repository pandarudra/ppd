"""Syslog UDP forwarder: receives syslog datagrams and POSTs each to /events/ingest.

    python scripts/syslog_listener.py [--port 5514] [--email ... --password ...]

Point rsyslog / a firewall / Fluent Bit's syslog output at udp://<host>:5514.
Port 514 needs root, so 5514 is the default. Re-logs in when the 15-minute token expires.
"""
import argparse
import json
import socket
import urllib.error
import urllib.request


def post(url, body, token=None):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--email", default="analyst@sentinel.local")
    ap.add_argument("--password", default="analyst123")
    ap.add_argument("--port", type=int, default=5514)
    a = ap.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", a.port))

    def login():
        return post(f"{a.url}/api/v1/auth/login", {"email": a.email, "password": a.password})["access_token"]

    token = login()
    print(f"listening on udp/{a.port}")
    while True:
        data, _ = sock.recvfrom(8192)
        body = {"raw_log": data.decode(errors="replace").strip(), "source_format": "syslog"}
        try:
            try:
                post(f"{a.url}/api/v1/events/ingest", body, token)
            except urllib.error.HTTPError as e:
                if e.code != 401:
                    raise
                token = login()
                post(f"{a.url}/api/v1/events/ingest", body, token)
        except urllib.error.URLError as e:
            print("ingest failed:", e)


if __name__ == "__main__":
    main()
