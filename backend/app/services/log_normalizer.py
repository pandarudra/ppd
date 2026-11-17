import json
import re

SYSLOG_RE = re.compile(r"^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+\S+")
KV_RE = re.compile(r"\b(SRC|DST|SPT|DPT|PROTO)=([^\s]+)")

EMPTY_FIELDS = {
    "source_ip": None,
    "dest_ip": None,
    "source_port": None,
    "dest_port": None,
    "protocol": None,
    "event_type": None,
    "event_timestamp": None,
    "normalized_data": None,
}


def detect_format(raw_log: str) -> str:
    try:
        if not raw_log or not raw_log.strip():
            return "unknown"
        stripped = raw_log.strip()
        try:
            json.loads(stripped)
            return "json"
        except (json.JSONDecodeError, TypeError):
            pass
        if SYSLOG_RE.match(stripped):
            return "syslog"
        if "," in stripped and not stripped.startswith("{"):
            return "csv"
        return "unknown"
    except Exception:
        return "unknown"


def _normalize_syslog(raw_log: str) -> dict:
    fields = dict(EMPTY_FIELDS)
    try:
        kv = {k: v for k, v in KV_RE.findall(raw_log)}
        fields["source_ip"] = kv.get("SRC")
        fields["dest_ip"] = kv.get("DST")
        fields["source_port"] = int(kv["SPT"]) if kv.get("SPT", "").isdigit() else None
        fields["dest_port"] = int(kv["DPT"]) if kv.get("DPT", "").isdigit() else None
        fields["protocol"] = kv.get("PROTO")
        if "DPT=22" in raw_log:
            fields["event_type"] = "ssh_login_failed" if "DROP" in raw_log or "fail" in raw_log.lower() else "ssh_connection"
        elif kv.get("DPT"):
            fields["event_type"] = "network_connection"
        fields["normalized_data"] = kv
    except Exception:
        pass
    return fields


def _normalize_json(raw_log: str) -> dict:
    fields = dict(EMPTY_FIELDS)
    try:
        data = json.loads(raw_log)
        if not isinstance(data, dict):
            return fields
        fields["source_ip"] = data.get("source_ip") or data.get("src_ip")
        fields["dest_ip"] = data.get("dest_ip") or data.get("dst_ip")
        fields["source_port"] = data.get("source_port") or data.get("src_port")
        fields["dest_port"] = data.get("dest_port") or data.get("dst_port")
        fields["protocol"] = data.get("protocol")
        fields["event_type"] = data.get("event_type")
        fields["normalized_data"] = data
    except Exception:
        pass
    return fields


def normalize(raw_log: str, source_format: str) -> dict:
    try:
        if source_format == "syslog":
            return _normalize_syslog(raw_log)
        if source_format == "json":
            return _normalize_json(raw_log)
        return dict(EMPTY_FIELDS)
    except Exception:
        return dict(EMPTY_FIELDS)
