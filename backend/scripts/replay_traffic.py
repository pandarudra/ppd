"""Demo traffic replayer: posts a mix of benign and attack-like syslog lines to /events/ingest.

    python scripts/replay_traffic.py [--rate 2] [--count 0] [--email analyst@sentinel.local --password analyst123]

--count 0 runs until Ctrl-C. Needs backend + ml_service running. Stdlib only.
"""
import argparse
import random
import time

import json
import urllib.error
import urllib.request

ATTACKERS = ["203.0.113.50", "198.51.100.23", "45.155.205.9", "91.240.118.4", "185.220.101.7",
             "103.27.8.11", "177.54.12.200", "41.203.67.5", "5.188.62.14", "122.176.4.9"]
INTERNAL = ["10.0.0.5", "10.0.0.12", "10.0.1.20", "10.0.2.8"]
BENIGN_SRC = ["10.0.5.%d" % i for i in range(2, 30)]
# (dst port, proto, action) per attacker behaviour
ATTACKS = [(22, "TCP", "DROP fail"), (3389, "TCP", "DROP"), (445, "TCP", "DROP"), (23, "TCP", "DROP"), (80, "TCP", "DROP")]


def line(src, dst, dpt, proto, action):
    ts = time.strftime("%b %d %H:%M:%S")
    return f"{ts} firewall kernel: {action} IN=eth0 SRC={src} DST={dst} PROTO={proto} SPT={random.randint(1024, 65000)} DPT={dpt}"


def next_log():
    if random.random() < 0.35:
        return line(random.choice(BENIGN_SRC), random.choice(INTERNAL), random.choice([443, 80, 53]), "TCP", "ACCEPT")
    dpt, proto, action = random.choice(ATTACKS)
    return line(random.choice(ATTACKERS), random.choice(INTERNAL), dpt, proto, action)


def post(url, body, token=None):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--email", default="analyst@sentinel.local")
    ap.add_argument("--password", default="analyst123")
    ap.add_argument("--rate", type=float, default=2, help="events per second")
    ap.add_argument("--count", type=int, default=0)
    a = ap.parse_args()

    token = post(f"{a.url}/api/v1/auth/login", {"email": a.email, "password": a.password})["access_token"]
    sent = 0
    while a.count == 0 or sent < a.count:
        try:
            post(f"{a.url}/api/v1/events/ingest", {"raw_log": next_log(), "source_format": "syslog"}, token)
        except urllib.error.HTTPError as e:
            if e.code != 401:
                raise
            token = post(f"{a.url}/api/v1/auth/login", {"email": a.email, "password": a.password})["access_token"]  # 15-min token expired
            continue
        except (TimeoutError, urllib.error.URLError) as e:  # ponytail: remote DB is slow, skip and keep going
            print("skipped:", e)
            continue
        sent += 1
        time.sleep(1 / a.rate)
    print(f"sent {sent} events")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
