"""Port scan: one attacker probing many different ports on one host.   python port_scan.py [--src IP]"""
import json
from _common import run

PORTS = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 1433, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017]
run("port_scan",
    lambda s, d, i: json.dumps({"source_ip": s, "dest_ip": d, "source_port": 40000 + i, "dest_port": PORTS[i % len(PORTS)],
                                "protocol": "TCP", "event_type": "port_scan", "unique_dst_ports": 900, "port_entropy": 0.97,
                                "syn_count": 900, "conn_rate": 300, "packet_size_avg": 44}),
    default_count=len(PORTS), json_format=True)
