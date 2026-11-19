"""Signature rules that sit alongside the ML ensemble (hybrid detection).

The ensemble scores flow statistics and is only as good as its training data; signature rules catch what
it can't see on a single event (phishing, C2, exfiltration...). A rule can only RAISE risk, never lower
what the models said. The rule hit is recorded in model_scores["signature_rules"] so analysts can see it.
"""

RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

# (name, event_type keywords, risk, confidence). First match with the highest risk wins.
KEYWORD_RULES = [
    ("data_exfiltration", ("exfil",), "CRITICAL", 0.95),
    ("ransomware", ("ransom",), "CRITICAL", 0.96),
    ("privilege_escalation", ("privilege_escalation", "priv_esc"), "CRITICAL", 0.93),
    ("ddos", ("ddos", "flood"), "CRITICAL", 0.92),
    ("phishing", ("phish",), "HIGH", 0.88),
    ("c2_beacon", ("c2", "beacon"), "HIGH", 0.9),
    ("sql_injection", ("sql_injection", "sqli"), "HIGH", 0.9),
    ("web_exploit", ("exploit", "rce"), "HIGH", 0.88),
    ("dns_tunneling", ("tunnel",), "HIGH", 0.87),
    ("credential_attack", ("brute", "stuffing", "login_failed"), "HIGH", 0.86),
    ("reconnaissance", ("scan", "sweep", "recon"), "MEDIUM", 0.75),
]


def evaluate(event, features: dict) -> tuple[str, str, float] | None:
    """Return (rule_name, risk_level, confidence) for the strongest matching rule, or None."""
    etype = (event.event_type or "").lower()
    hits = [(n, r, c) for n, kws, r, c in KEYWORD_RULES if any(k in etype for k in kws)]

    # Stat thresholds, for logs that carry flow stats but no descriptive event_type.
    if features.get("syn_count", 0) > 5000:
        hits.append(("syn_flood_volume", "CRITICAL", 0.9))
    if features.get("unique_dst_ports", 0) > 100:
        hits.append(("port_scan_volume", "MEDIUM", 0.75))
    if features.get("bytes_sent", 0) > 50_000_000 and not features.get("is_private_dst", 1):
        hits.append(("large_outbound_transfer", "HIGH", 0.85))

    return max(hits, key=lambda h: (RANK[h[1]], h[2])) if hits else None


def apply(ml_response: dict, event, features: dict) -> dict:
    """Raise the ML verdict to the rule's risk when the rule is stronger. Returns a new dict."""
    hit = evaluate(event, features)
    if hit is None:
        return ml_response
    name, risk, conf = hit
    if RANK[risk] <= RANK.get(ml_response.get("risk_level") or "LOW", 0):
        return ml_response
    out = dict(ml_response)
    out["prediction"] = "malicious"
    out["risk_level"] = risk
    out["confidence_score"] = max(ml_response.get("confidence_score") or 0, conf)
    out["model_scores"] = {**(ml_response.get("model_scores") or {}), "signature_rules": conf}
    out["rule"] = name
    return out
