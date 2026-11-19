"""SYN flood (DDoS): very high connection/SYN rate at a web port.   python syn_flood.py [--src IP]"""
import json
from _common import run

run("syn_flood",
    lambda s, d, i: json.dumps({"source_ip": s, "dest_ip": d, "source_port": 1024 + i, "dest_port": 80, "protocol": "TCP",
                                "event_type": "syn_flood", "conn_rate": 5000, "syn_count": 20000, "packet_count": 50000,
                                "packet_size_avg": 60, "bytes_recv": 0}),
    default_count=40, default_rate=10, json_format=True)
