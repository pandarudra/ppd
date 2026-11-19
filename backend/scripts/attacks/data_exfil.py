"""Data exfiltration: a huge outbound transfer to an external host over 443.   python data_exfil.py [--src IP]"""
import json
from _common import run

run("data_exfil",
    lambda s, d, i: json.dumps({"source_ip": s, "dest_ip": d, "source_port": 50000 + i, "dest_port": 443, "protocol": "TCP",
                                "event_type": "data_exfiltration", "bytes_sent": 5e8, "bytes_recv": 2000, "duration": 600,
                                "packet_size_avg": 1400}),
    default_count=15, default_rate=2, json_format=True)
