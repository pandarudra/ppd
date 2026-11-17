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


async def get_dashboard(db: Session, redis_client: redis.Redis) -> dict:
    cached = await redis_client.get(DASHBOARD_CACHE_KEY)
    if cached:
        return json.loads(cached)

    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)

    total_events = db.query(SecurityEvent).filter(SecurityEvent.ingested_at >= day_ago).count()
    total_alerts = db.query(Alert).filter(Alert.created_at >= day_ago).count()
    open_alerts = db.query(Alert).filter(Alert.status == "open").count()
    critical_alerts = (
        db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.status == "open").count()
    )
    open_incidents = (
        db.query(Incident).filter(Incident.status.notin_(["closed", "resolved"])).count()
    )

    severity_rows = (
        db.query(Alert.severity, func.count(Alert.id))
        .filter(Alert.created_at >= week_ago)
        .group_by(Alert.severity)
        .all()
    )
    alerts_by_severity = {severity: count for severity, count in severity_rows}

    top_ip_rows = (
        db.query(SecurityEvent.source_ip, func.count(Alert.id))
        .join(Alert, Alert.event_id == SecurityEvent.id)
        .filter(SecurityEvent.source_ip.isnot(None))
        .group_by(SecurityEvent.source_ip)
        .order_by(func.count(Alert.id).desc())
        .limit(5)
        .all()
    )
    top_source_ips = [{"ip": ip, "alert_count": count} for ip, count in top_ip_rows]

    result = {
        "period": "last_24h",
        "total_events": total_events,
        "total_alerts": total_alerts,
        "open_alerts": open_alerts,
        "critical_alerts": critical_alerts,
        "open_incidents": open_incidents,
        "events_per_hour": _hourly_buckets(db, day_ago, now),
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
