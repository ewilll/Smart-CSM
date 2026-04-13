"""
Outbound notifications: httpSMS + Gmail API (refresh token).
Environment (loaded from parent .env by main.py):
  HTTPSMS_API_KEY, HTTPSMS_FROM_NUMBER
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_SENDER_EMAIL
"""
from __future__ import annotations

import base64
import os
import re
from email.message import EmailMessage
from typing import Any, Optional

import httpx

HTTPSMS_SEND_URL = "https://api.httpsms.com/v1/messages/send"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def normalize_ph_phone(phone: str) -> str:
    """Best-effort E.164 for Philippines (+63...)."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("63"):
        return "+" + digits
    if digits.startswith("0") and len(digits) >= 10:
        return "+63" + digits[1:]
    if digits.startswith("9") and len(digits) >= 10:
        return "+63" + digits
    if phone.strip().startswith("+"):
        return "+" + re.sub(r"\D", "", phone[1:])
    return "+" + digits if digits else ""


async def _google_access_token(client: httpx.AsyncClient) -> str:
    cid = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    refresh = os.getenv("GOOGLE_REFRESH_TOKEN", "").strip()
    if not (cid and secret and refresh):
        raise RuntimeError("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN")

    resp = await client.post(
        GOOGLE_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": cid,
            "client_secret": secret,
            "refresh_token": refresh,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30.0,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Google token error {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("Google token response missing access_token")
    return token


def _build_gmail_raw(sender: str, to: str, subject: str, body: str) -> str:
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    raw_bytes = msg.as_bytes()
    return base64.urlsafe_b64encode(raw_bytes).decode()


async def send_gmail_email(to: str, subject: str, body: str) -> dict[str, Any]:
    sender = os.getenv("GOOGLE_SENDER_EMAIL", "").strip()
    if not sender:
        raise RuntimeError("Missing GOOGLE_SENDER_EMAIL")

    async with httpx.AsyncClient() as client:
        access = await _google_access_token(client)
        raw = _build_gmail_raw(sender, to, subject, body)
        resp = await client.post(
            GMAIL_SEND_URL,
            headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
            json={"raw": raw},
            timeout=30.0,
        )
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Gmail send error {resp.status_code}: {resp.text[:500]}")
        return {"ok": True, "provider": "gmail", "detail": resp.json()}


async def send_httpsms(to: str, content: str) -> dict[str, Any]:
    api_key = os.getenv("HTTPSMS_API_KEY", "").strip()
    from_no = os.getenv("HTTPSMS_FROM_NUMBER", "").strip()
    if not api_key or not from_no:
        raise RuntimeError("Missing HTTPSMS_API_KEY or HTTPSMS_FROM_NUMBER")

    to_e164 = normalize_ph_phone(to)
    if not to_e164 or len(to_e164) < 10:
        raise RuntimeError(f"Invalid phone number: {to!r}")

    payload = {"from": from_no, "to": to_e164, "content": content}
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            HTTPSMS_SEND_URL,
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=60.0,
        )
        text = resp.text[:1000]
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"httpSMS error {resp.status_code}: {text}")
        try:
            data = resp.json()
        except Exception:
            data = {"raw": text}
        return {"ok": True, "provider": "httpsms", "detail": data}
