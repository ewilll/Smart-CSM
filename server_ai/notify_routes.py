"""
Secure notification HTTP API. All routes require the same dependency as AI routes (e.g. X-CSM-Secret).
Optional delivery_logs persistence when SUPABASE_SERVICE_ROLE_KEY is set.
"""
from __future__ import annotations

import asyncio
from typing import Any, Callable, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from delivery_logging import (
    delivery_logging_enabled,
    fetch_delivery_log,
    insert_delivery_log,
    insert_delivery_logs_bulk,
    normalize_uuid_str,
    update_delivery_log,
)
from notify_providers import normalize_ph_phone, send_gmail_email, send_httpsms


def _log_row(
    *,
    batch_id: Optional[str],
    channel: str,
    context_type: str,
    context_id: Optional[str],
    recipient: str,
    profile_id: Optional[str],
    sms_body: Optional[str],
    email_subject: Optional[str],
    email_body: Optional[str],
    status: str,
    failure_reason: Optional[str],
    provider_detail: Optional[dict[str, Any]],
    created_by: Optional[str],
    attempt_count: int = 1,
) -> dict[str, Any]:
    return {
        "batch_id": normalize_uuid_str(batch_id),
        "channel": channel,
        "context_type": context_type or "unspecified",
        "context_id": context_id,
        "recipient": recipient,
        "profile_id": normalize_uuid_str(profile_id),
        "sms_body": sms_body,
        "email_subject": email_subject,
        "email_body": email_body,
        "status": status,
        "attempt_count": attempt_count,
        "max_attempts": 5,
        "failure_reason": failure_reason,
        "provider_detail": provider_detail,
        "created_by": normalize_uuid_str(created_by),
    }


def create_notify_router(verify_secret_dep: Callable[..., Any]) -> APIRouter:
    router = APIRouter(prefix="/notify", tags=["notify"])

    class SmsSendBody(BaseModel):
        to: str = Field(..., description="Recipient phone (local or +63)")
        content: str = Field(..., min_length=1, max_length=2000)
        batch_id: Optional[str] = None
        context_type: Optional[str] = None
        context_id: Optional[str] = None
        created_by: Optional[str] = None
        profile_id: Optional[str] = None

    class SmsBulkBody(BaseModel):
        phones: List[str] = Field(..., min_length=1)
        content: str = Field(..., min_length=1, max_length=2000)
        batch_id: Optional[str] = None
        context_type: Optional[str] = None
        context_id: Optional[str] = None
        created_by: Optional[str] = None

    class EmailSendBody(BaseModel):
        to: str = Field(..., min_length=3)
        subject: str = Field(..., min_length=1, max_length=200)
        body: str = Field(..., min_length=1, max_length=10000)
        batch_id: Optional[str] = None
        context_type: Optional[str] = None
        context_id: Optional[str] = None
        created_by: Optional[str] = None
        profile_id: Optional[str] = None

    class EmailBulkBody(BaseModel):
        """Same subject/body for many recipients (broadcast). Capped for safety."""
        emails: List[str] = Field(..., min_length=1, max_length=400)
        subject: str = Field(..., min_length=1, max_length=200)
        body: str = Field(..., min_length=1, max_length=15000)
        batch_id: Optional[str] = None
        context_type: Optional[str] = None
        context_id: Optional[str] = None
        created_by: Optional[str] = None

    class IncidentNotifyBody(BaseModel):
        phone: Optional[str] = None
        email: Optional[str] = None
        sms_body: Optional[str] = None
        email_subject: Optional[str] = None
        email_body: Optional[str] = None
        send_sms: bool = True
        send_email: bool = True
        batch_id: Optional[str] = None
        context_type: Optional[str] = None
        context_id: Optional[str] = None
        created_by: Optional[str] = None

    class RetryDeliveryBody(BaseModel):
        delivery_log_id: str = Field(..., min_length=10)

    @router.post("/sms")
    async def notify_sms(body: SmsSendBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        ctx_type = body.context_type or "single_sms"
        try:
            result = await send_httpsms(body.to, body.content)
            await insert_delivery_log(
                _log_row(
                    batch_id=body.batch_id,
                    channel="sms",
                    context_type=ctx_type,
                    context_id=body.context_id,
                    recipient=body.to,
                    profile_id=body.profile_id,
                    sms_body=body.content,
                    email_subject=None,
                    email_body=None,
                    status="sent",
                    failure_reason=None,
                    provider_detail=result if isinstance(result, dict) else None,
                    created_by=body.created_by,
                )
            )
            return result
        except Exception as e:
            await insert_delivery_log(
                _log_row(
                    batch_id=body.batch_id,
                    channel="sms",
                    context_type=ctx_type,
                    context_id=body.context_id,
                    recipient=body.to,
                    profile_id=body.profile_id,
                    sms_body=body.content,
                    email_subject=None,
                    email_body=None,
                    status="failed",
                    failure_reason=str(e),
                    provider_detail=None,
                    created_by=body.created_by,
                )
            )
            raise HTTPException(status_code=502, detail=str(e)) from e

    @router.post("/sms-bulk")
    async def notify_sms_bulk(body: SmsBulkBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        results: list[dict[str, Any]] = []
        success = 0
        failed = 0
        ctx_type = body.context_type or "sms_bulk"
        bulk_logs: list[dict[str, Any]] = []
        for raw in body.phones:
            phone = normalize_ph_phone(raw) or raw
            try:
                r = await send_httpsms(phone, body.content)
                results.append({"phone": phone, "ok": True, "detail": r.get("detail")})
                success += 1
                bulk_logs.append(
                    _log_row(
                        batch_id=body.batch_id,
                        channel="sms",
                        context_type=ctx_type,
                        context_id=body.context_id,
                        recipient=phone,
                        profile_id=None,
                        sms_body=body.content,
                        email_subject=None,
                        email_body=None,
                        status="sent",
                        failure_reason=None,
                        provider_detail=r if isinstance(r, dict) else None,
                        created_by=body.created_by,
                    )
                )
            except Exception as e:
                results.append({"phone": phone, "ok": False, "error": str(e)})
                failed += 1
                bulk_logs.append(
                    _log_row(
                        batch_id=body.batch_id,
                        channel="sms",
                        context_type=ctx_type,
                        context_id=body.context_id,
                        recipient=phone,
                        profile_id=None,
                        sms_body=body.content,
                        email_subject=None,
                        email_body=None,
                        status="failed",
                        failure_reason=str(e),
                        provider_detail=None,
                        created_by=body.created_by,
                    )
                )
        await insert_delivery_logs_bulk(bulk_logs)
        return {
            "success": failed == 0,
            "successCount": success,
            "failedCount": failed,
            "total": len(body.phones),
            "results": results,
        }

    @router.post("/email")
    async def notify_email(body: EmailSendBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        ctx_type = body.context_type or "single_email"
        to = body.to.strip()
        try:
            result = await send_gmail_email(to, body.subject, body.body)
            await insert_delivery_log(
                _log_row(
                    batch_id=body.batch_id,
                    channel="email",
                    context_type=ctx_type,
                    context_id=body.context_id,
                    recipient=to,
                    profile_id=body.profile_id,
                    sms_body=None,
                    email_subject=body.subject,
                    email_body=body.body,
                    status="sent",
                    failure_reason=None,
                    provider_detail=result if isinstance(result, dict) else None,
                    created_by=body.created_by,
                )
            )
            return result
        except Exception as e:
            await insert_delivery_log(
                _log_row(
                    batch_id=body.batch_id,
                    channel="email",
                    context_type=ctx_type,
                    context_id=body.context_id,
                    recipient=to,
                    profile_id=body.profile_id,
                    sms_body=None,
                    email_subject=body.subject,
                    email_body=body.body,
                    status="failed",
                    failure_reason=str(e),
                    provider_detail=None,
                    created_by=body.created_by,
                )
            )
            raise HTTPException(status_code=502, detail=str(e)) from e

    @router.post("/email-bulk")
    async def notify_email_bulk(body: EmailBulkBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        seen: set[str] = set()
        unique: list[str] = []
        for raw in body.emails:
            em = (raw or "").strip().lower()
            if not em or "@" not in em or em in seen:
                continue
            seen.add(em)
            unique.append(raw.strip())
        unique = unique[:400]

        results: list[dict[str, Any]] = []
        success = 0
        failed = 0
        ctx_type = body.context_type or "email_bulk"
        bulk_logs: list[dict[str, Any]] = []
        for em in unique:
            try:
                r = await send_gmail_email(em, body.subject, body.body)
                results.append({"to": em, "ok": True})
                success += 1
                bulk_logs.append(
                    _log_row(
                        batch_id=body.batch_id,
                        channel="email",
                        context_type=ctx_type,
                        context_id=body.context_id,
                        recipient=em,
                        profile_id=None,
                        sms_body=None,
                        email_subject=body.subject,
                        email_body=body.body,
                        status="sent",
                        failure_reason=None,
                        provider_detail=r if isinstance(r, dict) else None,
                        created_by=body.created_by,
                    )
                )
            except Exception as e:
                results.append({"to": em, "ok": False, "error": str(e)})
                failed += 1
                bulk_logs.append(
                    _log_row(
                        batch_id=body.batch_id,
                        channel="email",
                        context_type=ctx_type,
                        context_id=body.context_id,
                        recipient=em,
                        profile_id=None,
                        sms_body=None,
                        email_subject=body.subject,
                        email_body=body.body,
                        status="failed",
                        failure_reason=str(e),
                        provider_detail=None,
                        created_by=body.created_by,
                    )
                )
            await asyncio.sleep(0.35)
        await insert_delivery_logs_bulk(bulk_logs)
        return {
            "success": failed == 0,
            "successCount": success,
            "failedCount": failed,
            "total": len(unique),
            "results": results,
        }

    @router.post("/incident-update")
    async def notify_incident_update(body: IncidentNotifyBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        out: dict[str, Any] = {"sms": None, "email": None}
        ctx_type = body.context_type or "incident_update"
        ctx_id = body.context_id
        batch_id = body.batch_id
        created_by = body.created_by
        incident_logs: list[dict[str, Any]] = []

        if body.send_sms and body.phone and body.sms_body:
            try:
                out["sms"] = await send_httpsms(body.phone, body.sms_body)
                incident_logs.append(
                    _log_row(
                        batch_id=batch_id,
                        channel="sms",
                        context_type=ctx_type,
                        context_id=ctx_id,
                        recipient=body.phone,
                        profile_id=None,
                        sms_body=body.sms_body,
                        email_subject=None,
                        email_body=None,
                        status="sent",
                        failure_reason=None,
                        provider_detail=out["sms"] if isinstance(out["sms"], dict) else None,
                        created_by=created_by,
                    )
                )
            except Exception as e:
                out["sms"] = {"ok": False, "error": str(e)}
                incident_logs.append(
                    _log_row(
                        batch_id=batch_id,
                        channel="sms",
                        context_type=ctx_type,
                        context_id=ctx_id,
                        recipient=body.phone,
                        profile_id=None,
                        sms_body=body.sms_body,
                        email_subject=None,
                        email_body=None,
                        status="failed",
                        failure_reason=str(e),
                        provider_detail=None,
                        created_by=created_by,
                    )
                )
        elif body.send_sms:
            out["sms"] = {"skipped": True, "reason": "no phone"}

        if body.send_email and body.email and body.email_subject and body.email_body:
            try:
                out["email"] = await send_gmail_email(body.email, body.email_subject, body.email_body)
                incident_logs.append(
                    _log_row(
                        batch_id=batch_id,
                        channel="email",
                        context_type=ctx_type,
                        context_id=ctx_id,
                        recipient=body.email,
                        profile_id=None,
                        sms_body=None,
                        email_subject=body.email_subject,
                        email_body=body.email_body,
                        status="sent",
                        failure_reason=None,
                        provider_detail=out["email"] if isinstance(out["email"], dict) else None,
                        created_by=created_by,
                    )
                )
            except Exception as e:
                out["email"] = {"ok": False, "error": str(e)}
                incident_logs.append(
                    _log_row(
                        batch_id=batch_id,
                        channel="email",
                        context_type=ctx_type,
                        context_id=ctx_id,
                        recipient=body.email,
                        profile_id=None,
                        sms_body=None,
                        email_subject=body.email_subject,
                        email_body=body.email_body,
                        status="failed",
                        failure_reason=str(e),
                        provider_detail=None,
                        created_by=created_by,
                    )
                )
        elif body.send_email:
            out["email"] = {"skipped": True, "reason": "no email or subject/body"}

        await insert_delivery_logs_bulk(incident_logs)
        return out

    @router.post("/retry-delivery")
    async def retry_delivery(body: RetryDeliveryBody, _: Any = Depends(verify_secret_dep)) -> dict[str, Any]:
        if not delivery_logging_enabled():
            raise HTTPException(status_code=503, detail="Delivery logging is not configured on the server")
        row = await fetch_delivery_log(body.delivery_log_id)
        if not row:
            raise HTTPException(status_code=404, detail="Delivery log not found")
        if (row.get("status") or "").lower() == "sent":
            raise HTTPException(status_code=400, detail="Cannot retry a successful delivery")
        attempts = int(row.get("attempt_count") or 1)
        max_a = int(row.get("max_attempts") or 5)
        if attempts >= max_a:
            raise HTTPException(status_code=400, detail="Max retry attempts reached for this log")

        new_attempt = attempts + 1
        ch = row.get("channel")
        recipient = (row.get("recipient") or "").strip()
        log_id = str(row.get("id") or body.delivery_log_id)

        try:
            if ch == "sms":
                sb = row.get("sms_body") or ""
                if not sb:
                    raise RuntimeError("Missing sms_body on delivery log row")
                detail = await send_httpsms(recipient, sb)
            elif ch == "email":
                sub = row.get("email_subject") or ""
                em_body = row.get("email_body") or ""
                if not sub or not em_body:
                    raise RuntimeError("Missing email_subject or email_body on delivery log row")
                detail = await send_gmail_email(recipient, sub, em_body)
            else:
                raise HTTPException(status_code=400, detail="Unknown channel on log row")
        except HTTPException:
            raise
        except Exception as e:
            await update_delivery_log(
                log_id,
                {
                    "status": "failed",
                    "failure_reason": str(e),
                    "attempt_count": new_attempt,
                    "provider_detail": None,
                },
            )
            raise HTTPException(status_code=502, detail=str(e)) from e

        pd: dict[str, Any] = detail if isinstance(detail, dict) else {"detail": detail}
        await update_delivery_log(
            log_id,
            {
                "status": "sent",
                "failure_reason": None,
                "attempt_count": new_attempt,
                "provider_detail": pd,
            },
        )
        return {
            "ok": True,
            "delivery_log_id": log_id,
            "attempt_count": new_attempt,
            "channel": ch,
        }

    return router
