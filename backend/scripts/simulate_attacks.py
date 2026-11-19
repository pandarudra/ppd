"""Attack simulator: replays realistic cyber-attack scenarios into Sentinel so you can demo alerts,
the attack map, attack paths and kill chains.

    python scripts/simulate_attacks.py --list
    python scripts/simulate_attacks.py phishing
    python scripts/simulate_attacks.py port_scan ssh_brute_force --repeat 3
    python scripts/simulate_attacks.py campaign          # one attacker walks recon -> brute force -> access -> exfil
    python scripts/simulate_attacks.py all --delay 0.4   # every scenario once, with benign noise mixed in
    python scripts/simulate_attacks.py all --dry-run     # print events without sending

Stdlib only. Needs backend + ml_service running and the seeded analyst account.

How detection works here: the ML models score flow statistics (ports, packet sizes, SYN counts,
failed-auth ratio, ...). A single log line can't carry those, so each simulated event carries the
flow stats that attack would produce on the wire (top-level JSON fields, which the backend feeds
to the models). Phishing has no network signature of its own, so its events model the traffic it
causes: the credential-harvesting POST, the C2 callback, the attacker's login.
"""
import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request

INTERNAL = ["10.0.0.5", "10.0.0.12", "10.0.1.20", "10.0.2.8", "10.0.3.15"]
WEB = ["10.0.1.20", "10.0.1.21"]
DB = ["10.0.2.8"]
DC = ["10.0.0.5"]  # domain controller / file server
USERS = [f"10.0.5.{i}" for i in range(2, 40)]  # workstations
ATTACKERS = [
    "203.0.113.50", "198.51.100.23", "45.155.205.9", "91.240.118.4", "185.220.101.7", "103.27.8.11",
    "177.54.12.200", "41.203.67.5", "5.188.62.14", "122.176.4.9", "89.248.165.2", "193.32.162.7",
]
PHISH_HOSTS = ["185.234.72.19", "194.165.16.11", "45.9.148.108"]  # rogue credential-harvest servers
C2_SERVERS = ["185.141.27.62", "94.102.61.7", "23.106.215.80"]

# Flow-stat profiles: what each attack looks like on the wire.
SCAN = dict(packet_size_avg=60, packet_count=900, syn_count=800, unique_dst_ports=600, port_entropy=0.95, conn_rate=120.0, failed_auth_ratio=0.0, bytes_sent=54000, bytes_recv=2000, ttl_avg=48, duration=6)
BRUTE = dict(packet_size_avg=80, packet_count=300, syn_count=120, unique_dst_ports=1, port_entropy=0.1, conn_rate=40.0, failed_auth_ratio=0.9, bytes_sent=24000, bytes_recv=1200, ttl_avg=50, duration=30)
FLOOD = dict(packet_size_avg=54, packet_count=50000, syn_count=48000, unique_dst_ports=1, port_entropy=0.05, conn_rate=9000.0, failed_auth_ratio=0.0, bytes_sent=2700000, bytes_recv=0, ttl_avg=44, duration=10)
WEBATK = dict(packet_size_avg=900, packet_count=400, syn_count=60, unique_dst_ports=1, port_entropy=0.1, conn_rate=35.0, failed_auth_ratio=0.3, bytes_sent=360000, bytes_recv=90000, ttl_avg=52, duration=20)
BEACON = dict(packet_size_avg=120, packet_count=40, syn_count=4, unique_dst_ports=1, port_entropy=0.05, conn_rate=0.2, failed_auth_ratio=0.0, bytes_sent=4800, bytes_recv=9000, ttl_avg=56, duration=3600)
EXFIL = dict(packet_size_avg=1400, packet_count=90000, syn_count=6, unique_dst_ports=1, port_entropy=0.05, conn_rate=6.0, failed_auth_ratio=0.0, bytes_sent=126000000, bytes_recv=200000, ttl_avg=60, duration=900)
LATERAL = dict(packet_size_avg=300, packet_count=700, syn_count=300, unique_dst_ports=3, port_entropy=0.4, conn_rate=60.0, failed_auth_ratio=0.6, bytes_sent=210000, bytes_recv=90000, ttl_avg=128, duration=40)
TUNNEL = dict(packet_size_avg=480, packet_count=6000, syn_count=0, unique_dst_ports=1, port_entropy=0.05, conn_rate=80.0, failed_auth_ratio=0.0, bytes_sent=2900000, bytes_recv=2900000, ttl_avg=57, duration=600)


def ev(src, dst, port, proto, etype, profile, **extra):
    e = {"source_ip": src, "dest_ip": dst, "source_port": random.randint(1024, 65000), "dest_port": port,
         "protocol": proto, "event_type": etype, **profile, **extra}
    # jitter numeric stats a little so repeated runs aren't identical
    for k, v in profile.items():
        if isinstance(v, (int, float)) and v:
            e[k] = type(v)(v * random.uniform(0.85, 1.15))
    return e


def atk():
    return random.choice(ATTACKERS)


# ---- scenarios: name -> (stage, description, generator returning a list of events) -------------

def port_scan(src=None, n=6):
    src = src or atk(); dst = random.choice(INTERNAL)
    return [ev(src, dst, random.choice([21, 22, 23, 80, 443, 445, 3389, 8080]), "TCP", "port_scan_detected", SCAN) for _ in range(n)]


def ssh_brute_force(src=None, n=8):
    src = src or atk(); dst = random.choice(INTERNAL)
    return [ev(src, dst, 22, "TCP", "ssh_login_failed", BRUTE) for _ in range(n)]


def rdp_brute_force(src=None, n=8):
    src = src or atk(); dst = random.choice(DC + USERS[:3])
    return [ev(src, dst, 3389, "TCP", "rdp_login_failed", BRUTE) for _ in range(n)]


def ftp_brute_force(src=None, n=6):
    src = src or atk()
    return [ev(src, random.choice(INTERNAL), 21, "TCP", "ftp_login_failed", BRUTE) for _ in range(n)]


def credential_stuffing(src=None, n=8):
    src = src or atk()
    return [ev(src, random.choice(WEB), 443, "TCP", "web_login_failed_credential_stuffing", dict(BRUTE, packet_size_avg=300, bytes_sent=90000)) for _ in range(n)]


def phishing(victim=None, n=1):
    """Email lands -> user clicks -> credentials harvested -> payload callback -> attacker logs in."""
    victim = victim or random.choice(USERS); host = random.choice(PHISH_HOSTS); c2 = random.choice(C2_SERVERS); a = atk()
    return [
        ev(host, victim, 25, "TCP", "phishing_email_delivered", dict(WEBATK, failed_auth_ratio=0.0, packet_count=200, syn_count=30), tag="mail gateway: lookalike sender, urgent invoice lure"),
        ev(victim, host, 443, "TCP", "phishing_link_clicked_credential_harvest", dict(WEBATK, failed_auth_ratio=0.4, bytes_sent=180000), tag="proxy: POST to newly registered domain"),
        ev(victim, c2, 8080, "TCP", "phishing_payload_c2_callback", BEACON, tag="macro dropper beaconing"),
        ev(a, random.choice(DC), 443, "TCP", "suspicious_login_success_after_phish", dict(BRUTE, failed_auth_ratio=0.5, syn_count=60), tag="stolen creds used from foreign IP"),
    ]


def spear_phishing_attachment(victim=None):
    victim = victim or random.choice(USERS); c2 = random.choice(C2_SERVERS)
    return [
        ev(random.choice(PHISH_HOSTS), victim, 25, "TCP", "phishing_malicious_attachment_delivered", dict(WEBATK, packet_count=300), tag="macro-enabled doc"),
        ev(victim, c2, 4444, "TCP", "malware_c2_beacon", BEACON, tag="reverse shell staged after macro ran"),
    ]


def syn_flood(src=None, n=5):
    src = src or atk(); dst = random.choice(WEB)
    return [ev(src, dst, 443, "TCP", "ddos_syn_flood", FLOOD) for _ in range(n)]


def udp_flood(src=None, n=4):
    src = src or atk()
    return [ev(src, random.choice(WEB), 53, "UDP", "ddos_udp_flood", dict(FLOOD, packet_size_avg=512, syn_count=0)) for _ in range(n)]


def sql_injection(src=None, n=5):
    src = src or atk()
    return [ev(src, random.choice(WEB), random.choice([80, 443]), "TCP", "sql_injection_attempt", WEBATK) for _ in range(n)]


def web_exploit(src=None, n=4):
    src = src or atk()
    return [ev(src, random.choice(WEB), 8080, "TCP", "web_exploit_rce_attempt", dict(WEBATK, packet_size_avg=1100)) for _ in range(n)]


def malware_c2(victim=None, n=5):
    victim = victim or random.choice(USERS); c2 = random.choice(C2_SERVERS)
    return [ev(victim, c2, random.choice([4444, 8080, 8443]), "TCP", "malware_c2_beacon", BEACON) for _ in range(n)]


def data_exfiltration(victim=None, n=3):
    victim = victim or random.choice(DB + DC); out = random.choice(C2_SERVERS)
    return [ev(victim, out, 443, "TCP", "data_exfiltration_large_upload", EXFIL) for _ in range(n)]


def dns_tunneling(victim=None, n=5):
    victim = victim or random.choice(USERS)
    return [ev(victim, "198.51.100.77", 53, "UDP", "dns_tunneling_exfil", TUNNEL) for _ in range(n)]


def ransomware_lateral(src=None, n=6):
    src = src or random.choice(USERS); 
    return [ev(src, random.choice(INTERNAL), 445, "TCP", "ransomware_smb_lateral_movement", LATERAL) for _ in range(n)]


def privilege_escalation(src=None, n=3):
    src = src or random.choice(USERS)
    return [ev(src, random.choice(DC), 445, "TCP", "privilege_escalation_exploit", dict(LATERAL, failed_auth_ratio=0.8)) for _ in range(n)]


def icmp_sweep(src=None, n=5):
    src = src or atk()
    return [ev(src, random.choice(INTERNAL), 0, "ICMP", "icmp_ping_sweep_recon", dict(SCAN, packet_size_avg=64, unique_dst_ports=0)) for _ in range(n)]


SCENARIOS = {
    "port_scan": ("recon", "Nmap-style TCP port scan across common services", port_scan),
    "icmp_sweep": ("recon", "ICMP ping sweep to map live hosts", icmp_sweep),
    "ssh_brute_force": ("brute force", "Repeated failed SSH logins", ssh_brute_force),
    "rdp_brute_force": ("brute force", "Repeated failed RDP logins against Windows hosts", rdp_brute_force),
    "ftp_brute_force": ("brute force", "Failed FTP logins", ftp_brute_force),
    "credential_stuffing": ("brute force", "Leaked-credential login attempts against the web app", credential_stuffing),
    "phishing": ("initial access", "Phishing email -> click -> credential harvest -> C2 -> attacker login", phishing),
    "spear_phishing_attachment": ("initial access", "Malicious attachment that opens a reverse shell", spear_phishing_attachment),
    "sql_injection": ("initial access", "SQL injection against the web tier", sql_injection),
    "web_exploit": ("initial access", "Remote-code-execution attempts on an app server", web_exploit),
    "privilege_escalation": ("access", "Local exploit to gain domain admin on the DC", privilege_escalation),
    "ransomware_lateral": ("lateral movement", "Ransomware spreading over SMB between hosts", ransomware_lateral),
    "malware_c2": ("command & control", "Infected host beaconing to a C2 server", malware_c2),
    "dns_tunneling": ("exfiltration", "Data smuggled out over DNS", dns_tunneling),
    "data_exfiltration": ("exfiltration", "Large outbound transfer from a database/file server", data_exfiltration),
    "syn_flood": ("impact", "DDoS SYN flood on the web tier", syn_flood),
    "udp_flood": ("impact", "DDoS UDP flood", udp_flood),
}


def campaign():
    """One attacker, full kill chain: shows up as a single progressing path on the Attack paths page."""
    a = atk(); target = random.choice(WEB)
    yield "recon", port_scan(a, 4)
    yield "brute force", ssh_brute_force(a, 6)
    yield "access", sql_injection(a, 3) + privilege_escalation(a, 2)
    yield "exfiltration", data_exfiltration(target, 2)


def benign(n=3):
    out = []
    for _ in range(n):
        out.append({"source_ip": random.choice(USERS), "dest_ip": random.choice(INTERNAL), "source_port": random.randint(1024, 65000),
                    "dest_port": random.choice([443, 80, 53]), "protocol": "TCP", "event_type": "network_connection"})
    return out


def post(url, body, token=None):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scenarios", nargs="*", help="scenario names, 'campaign', or 'all'")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--email", default="analyst@sentinel.local")
    ap.add_argument("--password", default="analyst123")
    ap.add_argument("--delay", type=float, default=0.6, help="seconds between events")
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--no-noise", action="store_true", help="skip benign background traffic")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if a.list or not a.scenarios:
        print(f"{'scenario':28} {'stage':18} description")
        for k, (stage, desc, _) in SCENARIOS.items():
            print(f"{k:28} {stage:18} {desc}")
        print(f"{'campaign':28} {'full chain':18} One attacker: recon -> brute force -> access -> exfiltration")
        print(f"{'all':28} {'':18} Every scenario above, once")
        return

    names = list(SCENARIOS) if "all" in a.scenarios else a.scenarios
    unknown = [n for n in names if n not in SCENARIOS and n != "campaign"]
    if unknown:
        sys.exit(f"unknown scenario(s): {', '.join(unknown)} (try --list)")

    token = None
    if not a.dry_run:
        login = lambda: post(f"{a.url}/api/v1/auth/login", {"email": a.email, "password": a.password})["access_token"]
        token = login()

    def send(event):
        nonlocal token
        raw = json.dumps(event)
        if a.dry_run:
            print(raw)
            return
        body = {"raw_log": raw, "source_format": "json"}
        try:
            post(f"{a.url}/api/v1/events/ingest", body, token)
        except urllib.error.HTTPError as e:
            if e.code != 401:
                raise
            token = login()  # 15-minute token expired
            post(f"{a.url}/api/v1/events/ingest", body, token)
        time.sleep(a.delay)

    for rep in range(a.repeat):
        for name in names:
            if name == "campaign":
                for stage, events in campaign():
                    print(f"[campaign] {stage}: {len(events)} events")
                    for e in events:
                        send(e)
                    if not a.no_noise:
                        for e in benign(2):
                            send(e)
                continue
            stage, desc, fn = SCENARIOS[name]
            events = fn()
            print(f"[{name}] {stage}: {desc} ({len(events)} events)")
            for e in events:
                send(e)
            if not a.no_noise:
                for e in benign(2):
                    send(e)
    print("done")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
