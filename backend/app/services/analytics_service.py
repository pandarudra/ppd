import json
from datetime import datetime, timedelta, timezone

import redis.asyncio as redis
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Alert, Incident, SecurityEvent

DASHBOARD_CACHE_KEY = "cache:dashboard"
DASHBOARD_CACHE_TTL = 30


def _hourly_buckets(db: Session, start: datetime, end: datetime) -> list[dict]:
    rows = (
        db.query(func.date_trunc("hour", SecurityEvent.ingested_at).label("hour"), func.count(SecurityEvent.id))
        .filter(SecurityEvent.ingested_at >= start, SecurityEvent.ingested_at <= end)
        .group_by("hour")
        .order_by("hour")
        .all()
    )
    return [{"hour": hour.strftime("%H:%M"), "count": count} for hour, count in rows]


def _in_own_session(fn, *args):
    """Run a query function on its own session so several can overlap in threads."""
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        return fn(db, *args)
    finally:
        db.close()


async def get_dashboard(db: Session, redis_client: redis.Redis) -> dict:
    import asyncio

    from starlette.concurrency import run_in_threadpool

    cached = await redis_client.get(DASHBOARD_CACHE_KEY)
    if cached:
        return json.loads(cached)

    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    # The DB is remote (~0.4 s per query), so fan the independent queries out in parallel
    # instead of running them back to back.
    def counts(d):
        total_events = d.query(func.count(SecurityEvent.id)).filter(SecurityEvent.ingested_at >= day_ago).scalar()
        a = (
            d.query(
                func.count(Alert.id).filter(Alert.created_at >= day_ago),
                func.count(Alert.id).filter(Alert.status == "open"),
                func.count(Alert.id).filter(Alert.severity == "CRITICAL", Alert.status == "open"),
            ).one()
        )
        return total_events, a

    def incidents(d):
        return d.query(func.count(Incident.id)).filter(Incident.status.notin_(["closed", "resolved"])).scalar()

    def severity(d):
        return dict(
            d.query(Alert.severity, func.count(Alert.id)).filter(Alert.created_at >= week_ago).group_by(Alert.severity).all()
        )

    def top_ips(d):
        rows = (
            d.query(SecurityEvent.source_ip, func.count(Alert.id))
            .join(Alert, Alert.event_id == SecurityEvent.id)
            .filter(SecurityEvent.source_ip.isnot(None))
            .group_by(SecurityEvent.source_ip)
            .order_by(func.count(Alert.id).desc())
            .limit(5)
            .all()
        )
        return [{"ip": ip, "alert_count": count} for ip, count in rows]

    (total_events, (total_alerts, open_alerts, critical_alerts)), open_incidents, alerts_by_severity, top_source_ips, hourly = (
        await asyncio.gather(
            run_in_threadpool(_in_own_session, counts),
            run_in_threadpool(_in_own_session, incidents),
            run_in_threadpool(_in_own_session, severity),
            run_in_threadpool(_in_own_session, top_ips),
            run_in_threadpool(_in_own_session, lambda d: _hourly_buckets(d, day_ago, now)),
        )
    )

    result = {
        "period": "last_24h",
        "total_events": total_events,
        "total_alerts": total_alerts,
        "open_alerts": open_alerts,
        "critical_alerts": critical_alerts,
        "open_incidents": open_incidents,
        "events_per_hour": hourly,
        "alerts_by_severity": alerts_by_severity,
        "top_source_ips": top_source_ips,
        # No analyst-feedback loop exists yet in this MVP slice to compute a
        # real detection accuracy (plan/ROADMAP.md "Known Limitations"); left
        # null rather than fabricated.
        "detection_accuracy": None,
    }
    await redis_client.set(DASHBOARD_CACHE_KEY, json.dumps(result, default=str), ex=DASHBOARD_CACHE_TTL)
    return result


def get_trends(db: Session, period: str, metric: str) -> dict:
    days = int(period.rstrip("d")) if period.rstrip("d").isdigit() else 7
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    if metric == "alert_volume":
        model, date_col = Alert, Alert.created_at
    else:
        model, date_col = SecurityEvent, SecurityEvent.ingested_at

    rows = (
        db.query(func.date_trunc("day", date_col).label("day"), func.count(model.id))
        .filter(date_col >= start)
        .group_by("day")
        .order_by("day")
        .all()
    )
    data_points = [{"date": day.date().isoformat(), "value": count} for day, count in rows]

    if len(data_points) >= 2 and data_points[0]["value"]:
        first, last = data_points[0]["value"], data_points[-1]["value"]
        change_percent = round((last - first) / first * 100, 1)
        trend = "increasing" if last > first else "decreasing" if last < first else "stable"
    else:
        change_percent = 0.0
        trend = "stable"

    return {
        "period": period,
        "metric": metric,
        "data_points": data_points,
        "trend": trend,
        "change_percent": change_percent,
    }


# ---- attack views ---------------------------------------------------------------

SEVERITY_RANK = {"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
# Kill-chain order; first keyword hit wins. Matched against alert title + event_type.
STAGES = [
    ("recon", ("scan", "probe", "recon", "sweep", "enumerat")),
    ("brute_force", ("brute", "login_failed", "login failed", "stuffing", "password")),
    ("access", ("success", "privilege", "shell", "exploit", "injection", "phish", "credential_harvest",
                "c2", "beacon", "lateral", "ransom", "malware", "access")),
    ("exfiltration", ("exfil", "transfer", "upload", "leak", "tunnel")),
]
STAGE_ORDER = [s for s, _ in STAGES]


def _stage(text: str) -> str:
    text = (text or "").lower()
    return next((name for name, words in STAGES if any(w in text for w in words)), "other")


def _alert_rows(db: Session, hours: int):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    return (
        db.query(
            SecurityEvent.source_ip, SecurityEvent.dest_ip, SecurityEvent.dest_port,
            SecurityEvent.protocol, SecurityEvent.event_type, Alert.title, Alert.severity,
            Alert.created_at,
        )
        .join(Alert, Alert.event_id == SecurityEvent.id)
        .filter(Alert.created_at >= since, SecurityEvent.source_ip.isnot(None))
        .all()
    )


def _worst(a: str, b: str) -> str:
    return a if SEVERITY_RANK.get(a, 0) >= SEVERITY_RANK.get(b, 0) else b


def get_top_sources(db: Session, hours: int, limit: int = 10, rows=None) -> list[dict]:
    from app.services.geo import locate

    agg: dict[str, dict] = {}
    for src, _dst, _port, _proto, _et, _title, sev, ts in (_alert_rows(db, hours) if rows is None else rows):
        a = agg.setdefault(str(src), {"ip": str(src), "alert_count": 0, "severity": "INFO", "last_seen": ts})
        a["alert_count"] += 1
        a["severity"] = _worst(a["severity"], sev)
        a["last_seen"] = max(a["last_seen"], ts)
    rows = sorted(agg.values(), key=lambda r: r["alert_count"], reverse=True)[:limit]
    for r in rows:
        r["geo"] = locate(r["ip"])
    return rows


def get_top_targets(db: Session, hours: int, limit: int = 10, rows=None) -> list[dict]:
    agg: dict[str, dict] = {}
    for src, dst, port, _proto, _et, _title, sev, _ts in (_alert_rows(db, hours) if rows is None else rows):
        if not dst:
            continue
        a = agg.setdefault(str(dst), {"ip": str(dst), "alert_count": 0, "severity": "INFO", "ports": {}, "sources": set()})
        a["alert_count"] += 1
        a["severity"] = _worst(a["severity"], sev)
        a["sources"].add(str(src))
        if port:
            a["ports"][port] = a["ports"].get(port, 0) + 1
    rows = sorted(agg.values(), key=lambda r: r["alert_count"], reverse=True)[:limit]
    return [
        {**r, "sources": len(r["sources"]), "ports": sorted(r["ports"], key=r["ports"].get, reverse=True)[:5]}
        for r in rows
    ]


def get_attack_paths(db: Session, hours: int, limit: int = 40) -> dict:
    """src -> dst:port edges plus per-attacker kill-chain stages."""
    edges: dict[tuple, dict] = {}
    chains: dict[str, dict] = {}
    for src, dst, port, proto, et, title, sev, ts in _alert_rows(db, hours):
        stage = _stage(f"{title} {et}")
        e = edges.setdefault(
            (str(src), str(dst), port),
            {"source": str(src), "target": str(dst), "port": port, "protocol": proto,
             "count": 0, "severity": "INFO", "last_seen": ts},
        )
        e["count"] += 1
        e["severity"] = _worst(e["severity"], sev)
        e["last_seen"] = max(e["last_seen"], ts)
        c = chains.setdefault(str(src), {"ip": str(src), "stages": {}, "targets": set()})
        c["stages"].setdefault(stage, ts)
        c["stages"][stage] = min(c["stages"][stage], ts)
        c["targets"].add(str(dst))
    top_edges = sorted(edges.values(), key=lambda r: r["count"], reverse=True)[:limit]
    attackers = []
    for c in chains.values():
        ordered = sorted(c["stages"].items(), key=lambda kv: kv[1])
        attackers.append({
            "ip": c["ip"],
            "stages": [{"stage": s, "first_seen": t} for s, t in ordered],
            "targets": len(c["targets"]),
            "progress": max((STAGE_ORDER.index(s) + 1 for s, _ in ordered if s in STAGE_ORDER), default=0),
        })
    attackers.sort(key=lambda a: (a["progress"], len(a["stages"])), reverse=True)
    return {"edges": top_edges, "attackers": attackers[:15], "stage_order": STAGE_ORDER}


def get_geo(db: Session, hours: int, target_limit: int = 5) -> dict:
    """Located attack origins plus the org's own (most-hit) targets, for the world map."""
    from app.services.geo import home

    sources = [s for s in get_top_sources(db, hours, 50) if s["geo"]]
    return {
        "home": home(),
        "sources": sources,
        "targets": get_top_targets(db, hours, target_limit),
        "hours": hours,
    }
