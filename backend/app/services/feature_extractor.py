"""Mirrors ml_service/pipeline/feature_extractor.py's mapping.

Duplicated rather than imported: the ML service is a separately deployable
process (plan/ARCHITECTURE.md §5.1's whole rationale for splitting it out),
so the backend can't import its package directly. Keep this in sync with
ml_service/pipeline/feature_extractor.py's FEATURE_ORDER/DEFAULTS if either
changes.
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


def _is_private(ip: str | None) -> int | None:
    if not ip:
        return None
    try:
        return int(ipaddress.ip_address(ip).is_private)
    except ValueError:
        return None


def extract_features(event) -> dict:
    """event: a SecurityEvent ORM instance (or any object with the same attrs)."""
    features = dict(DEFAULTS)

    if event.source_port is not None:
        features["src_port"] = event.source_port
    if event.dest_port is not None:
        features["dst_port"] = event.dest_port

    protocol = (event.protocol or "").upper()
    if protocol in PROTOCOL_MAP:
        features["protocol_enc"] = PROTOCOL_MAP[protocol]

    src_private = _is_private(event.source_ip)
    if src_private is not None:
        features["is_private_src"] = src_private
    dst_private = _is_private(event.dest_ip)
    if dst_private is not None:
        features["is_private_dst"] = dst_private

    event_type = (event.event_type or "").lower()
    if "fail" in event_type:
        # ponytail: a single log line can't carry the flow-level stats the
        # models were trained on (port_entropy, conn_rate, ...), so a
        # "failed auth" event nudges the whole feature set toward the
        # synthetic attack-class centroid from generate_synthetic_logs.py
        # rather than just the one or two fields a real flow would give us.
        # Upgrade path: real flow aggregation once events aren't scored
        # one-at-a-time.
        features.update(
            failed_auth_ratio=0.83,
            port_entropy=0.8,
            syn_count=120,
            unique_dst_ports=25,
            conn_rate=40.0,
            packet_size_avg=80.0,
            packet_count=300,
            bytes_sent=24000.0,
            bytes_recv=1200.0,
            ttl_avg=50.0,
        )

    return features
