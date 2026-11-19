"""Real IP -> location via the free ipwho.is service (no key). Results are cached in memory.

Private/reserved IPs return None (they have no location). Lookup failures return None and
are retried next time - nothing is ever invented.
ponytail: blocking urllib call, once per distinct IP; swap for a GeoLite2 file (geoip2) if
you outgrow ipwho.is's free-tier limits - callers don't change.
"""
import ipaddress
import json
import urllib.request

_cache: dict[str, dict] = {}


def _lookup(ip: str = "") -> dict | None:
    try:
        with urllib.request.urlopen(f"https://ipwho.is/{ip}", timeout=3) as r:
            d = json.load(r)
        if not d.get("success"):
            return None
        return {"city": d.get("city"), "country": d.get("country_code"), "lat": d["latitude"], "lon": d["longitude"]}
    except Exception:
        return None


def locate(ip: str | None) -> dict | None:
    try:
        addr = ipaddress.ip_address(ip)
    except (ValueError, TypeError):
        return None
    if not addr.is_global:
        return None
    key = str(addr)
    if key not in _cache and (g := _lookup(key)):
        _cache[key] = g
    return _cache.get(key)


def home() -> dict | None:
    """Where this server is: ipwho.is geolocates the caller's own public IP."""
    if "home" not in _cache and (g := _lookup()):
        _cache["home"] = g
    return _cache.get("home")
