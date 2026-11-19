"""Shared helper for the attack demo scripts. Stdlib only.

Each attack script builds a list of log lines and calls run(). Attacker IPs default to
real public addresses (so the map geolocates them for real); override with --src.
Needs backend (:8000) + ml_service (:8001) running.
"""
import argparse
import json
import random
import time
import urllib.error
import urllib.request

# Real public IPs in different countries (well-known public DNS resolvers) - they are only
# *labels* inside the fake log lines; nothing is ever sent to them.
SOURCES = ["77.88.8.8", "114.114.114.114", "180.76.76.76", "8.8.8.8", "1.1.1.1", "208.67.222.222", "185.228.168.9"]


def post(url, body, token=None):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def syslog(src, dst, dpt, action="DROP", proto="TCP"):
    ts = time.strftime("%b %d %H:%M:%S")
    return f"{ts} firewall kernel: {action} IN=eth0 SRC={src} DST={dst} PROTO={proto} SPT={random.randint(1024, 65000)} DPT={dpt}"


def run(name, make_log, default_count=40, default_rate=5, json_format=False):
    """make_log(src, dst, i) -> raw log string."""
    ap = argparse.ArgumentParser(description=name)
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--email", default="analyst@sentinel.local")
    ap.add_argument("--password", default="analyst123")
    ap.add_argument("--src", default=None, help="attacker IP (default: random real public IP)")
    ap.add_argument("--dst", default="10.0.0.12", help="victim IP")
    ap.add_argument("--count", type=int, default=default_count)
    ap.add_argument("--rate", type=float, default=default_rate, help="events/second")
    a = ap.parse_args()

    src = a.src or random.choice(SOURCES)
    login = lambda: post(f"{a.url}/api/v1/auth/login", {"email": a.email, "password": a.password})["access_token"]
    token = login()
    print(f"[{name}] {a.count} events {src} -> {a.dst}")
    sent = 0
    for i in range(a.count):
        body = {"raw_log": make_log(src, a.dst, i), "source_format": "json" if json_format else "syslog"}
        try:
            try:
                post(f"{a.url}/api/v1/events/ingest", body, token)
            except urllib.error.HTTPError as e:
                if e.code != 401:
                    raise
                token = login()  # 15-min token expired
                post(f"{a.url}/api/v1/events/ingest", body, token)
            sent += 1
        except (TimeoutError, urllib.error.URLError) as e:
            print("skipped:", e)
        time.sleep(1 / a.rate)
    print(f"sent {sent}/{a.count}. Check Events, Alerts and the Dashboard map.")
