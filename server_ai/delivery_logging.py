"""
Persist notify outcomes to Supabase delivery_logs (optional).
Requires SUPABASE_SERVICE_ROLE_KEY plus SUPABASE_URL or VITE_SUPABASE_URL in .env.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

import httpx


def _sb_url() -> str:
    u = os.getenv("SUPABASE_URL", "").strip() or os.getenv("VITE_SUPABASE_URL", "").strip()
    return u.rstrip("/")


def _sb_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def delivery_logging_enabled() -> bool:
    return bool(_sb_url() and _sb_key())


def _headers() -> dict[str, str]:
    k = _sb_key()
    return {
        "apikey": k,
        "Authorization": f"Bearer {k}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_uuid_str(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    try:
        return str(UUID(str(val)))
    except (ValueError, TypeError):
        return None


def _parse_uuid(val: Optional[str]) -> Optional[str]:
    return normalize_uuid_str(val)


async def insert_delivery_logs_bulk(rows: list[dict[str, Any]]) -> None:
    if not rows or not delivery_logging_enabled():
        return
    url = f"{_sb_url()}/rest/v1/delivery_logs"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(url, headers=_headers(), json=rows, timeout=120.0)
            if r.status_code not in (200, 201):
                print(f"[delivery_logs] bulk insert {r.status_code}: {r.text[:400]}")
    except Exception as e:
        print(f"[delivery_logs] bulk insert error: {e}")


async def insert_delivery_log(row: dict[str, Any]) -> None:
    await insert_delivery_logs_bulk([row])


async def fetch_delivery_log(log_id: str) -> Optional[dict[str, Any]]:
    if not delivery_logging_enabled():
        return None
    uid = _parse_uuid(log_id)
    if not uid:
        return None
    url = f"{_sb_url()}/rest/v1/delivery_logs?id=eq.{uid}&select=*"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=_headers(), timeout=15.0)
            if r.status_code != 200:
                print(f"[delivery_logs] fetch {r.status_code}: {r.text[:300]}")
                return None
            data = r.json()
            return data[0] if isinstance(data, list) and data else None
    except Exception as e:
        print(f"[delivery_logs] fetch error: {e}")
        return None


async def update_delivery_log(log_id: str, fields: dict[str, Any]) -> bool:
    if not delivery_logging_enabled():
        return False
    uid = _parse_uuid(log_id)
    if not uid:
        return False
    url = f"{_sb_url()}/rest/v1/delivery_logs?id=eq.{uid}"
    body = {**fields, "updated_at": _iso_now()}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.patch(url, headers=_headers(), json=body, timeout=15.0)
            return r.status_code in (200, 204)
    except Exception as e:
        print(f"[delivery_logs] patch error: {e}")
        return False
