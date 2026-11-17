"""Map a normalized security event (single record, not a flow) onto the
16-feature vector the models were trained on.

Several training features describe flow-level statistics (port_entropy,
syn_count, conn_rate, ...) that a single log line cannot supply -- those get
a fixed "typical benign" default. Only what a single event genuinely carries
is derived: ports, protocol, private/public IP, and a failed-auth heuristic
from event_type.
"""
import ipaddress

PROTOCOL_MAP = {"TCP": 0, "UDP": 1, "ICMP": 2}

DEFAULTS = {
    "duration": 1.0,
    "src_port": 0,
    "dst_port": 0,
    "protocol_enc": 0,
    "packet_size_avg": 500.0,
    "bytes_sent": 1000.0,
    "bytes_recv": 1000.0,
    "packet_count": 10,
    "failed_auth_ratio": 0.05,
    "port_entropy": 0.1,
    "syn_count": 2,
    "unique_dst_ports": 1,
    "conn_rate": 1.0,
    "ttl_avg": 64.0,
    "is_private_src": 1,
    "is_private_dst": 1,
}

FEATURE_ORDER = list(DEFAULTS.keys())


def _is_private(ip: str | None) -> int | None:
    if not ip:
        return None
    try:
        return int(ipaddress.ip_address(ip).is_private)
    except ValueError:
        return None


def extract_features(event_fields: dict) -> dict:
    features = dict(DEFAULTS)

    if event_fields.get("source_port") is not None:
        features["src_port"] = event_fields["source_port"]
    if event_fields.get("dest_port") is not None:
        features["dst_port"] = event_fields["dest_port"]

    protocol = (event_fields.get("protocol") or "").upper()
    if protocol in PROTOCOL_MAP:
        features["protocol_enc"] = PROTOCOL_MAP[protocol]

    src_private = _is_private(event_fields.get("source_ip"))
    if src_private is not None:
        features["is_private_src"] = src_private
    dst_private = _is_private(event_fields.get("dest_ip"))
    if dst_private is not None:
        features["is_private_dst"] = dst_private

    event_type = (event_fields.get("event_type") or "").lower()
    if "fail" in event_type:
        features["failed_auth_ratio"] = 0.8
        features["syn_count"] = 6

    return features
