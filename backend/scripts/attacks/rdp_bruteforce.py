"""RDP brute force: repeated failed logins on port 3389.   python rdp_bruteforce.py [--src IP]"""
import json
from _common import run

run("rdp_bruteforce",
    lambda s, d, i: json.dumps({"source_ip": s, "dest_ip": d, "source_port": 50000 + i, "dest_port": 3389, "protocol": "TCP",
                                "event_type": "rdp_login_failed", "failed_auth_ratio": 0.9}),
    default_count=40, json_format=True)
