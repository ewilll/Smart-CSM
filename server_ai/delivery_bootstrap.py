"""
Apply delivery_logs DDL once at server startup (optional).

Supabase does not run repo SQL files from the browser. The REST API cannot
execute CREATE TABLE. If you set SUPABASE_DB_URL (Postgres URI from
Supabase → Project Settings → Database), this module runs the same SQL as
migrations/delivery_logs_migration.sql so you do not need to paste it manually.

Prefer the direct connection (port 5432) for DDL; the transaction pooler (6543)
can fail on some migrations.

Set DELIVERY_LOGS_AUTO_BOOTSTRAP=false to skip.
"""
from __future__ import annotations

import asyncio
import os
import re
from pathlib import Path


def _migration_sql() -> str:
    base = Path(__file__).resolve().parent.parent
    path = base / "migrations" / "delivery_logs_migration.sql"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def _strip_full_line_comments(sql: str) -> str:
    lines = []
    for ln in sql.splitlines():
        s = ln.strip()
        if s.startswith("--"):
            continue
        lines.append(ln)
    return "\n".join(lines).strip()


def _split_sql_statements(sql: str) -> list[str]:
    """Split migration file into single statements for psycopg2."""
    chunks = re.split(r";\s*\n(?=(?:CREATE|ALTER|DROP|COMMENT)\b)", sql, flags=re.I | re.M)
    out: list[str] = []
    for chunk in chunks:
        c = _strip_full_line_comments(chunk)
        if not c:
            continue
        cu = c.upper()
        if "COMMENT ON TABLE" in cu and cu.strip().startswith("CREATE POLICY"):
            idx = cu.find("COMMENT ON TABLE")
            p1 = c[:idx].strip().rstrip(";").strip()
            p2 = c[idx:].strip().rstrip(";").strip()
            for p in (p1, p2):
                if p:
                    out.append(p if p.endswith(";") else p + ";")
            continue
        if not c.endswith(";"):
            c = c + ";"
        out.append(c)
    return out


def run_delivery_logs_bootstrap_sync() -> None:
    url = os.getenv("SUPABASE_DB_URL", "").strip() or os.getenv("DATABASE_URL", "").strip()
    if not url:
        print(
            "[delivery_logs] Auto-bootstrap skipped: set SUPABASE_DB_URL (Postgres URI from "
            "Supabase → Settings → Database) in Smart-CSM/.env, or run migrations/delivery_logs_migration.sql manually."
        )
        return
    flag = os.getenv("DELIVERY_LOGS_AUTO_BOOTSTRAP", "true").strip().lower()
    if flag in ("0", "false", "no", "off"):
        print("[delivery_logs] Auto-bootstrap disabled (DELIVERY_LOGS_AUTO_BOOTSTRAP=false).")
        return

    raw = _migration_sql()
    if not raw.strip():
        print("[delivery_logs] Auto-bootstrap skipped: migrations/delivery_logs_migration.sql not found.")
        return

    statements = _split_sql_statements(raw)
    if not statements:
        print("[delivery_logs] Auto-bootstrap skipped: no SQL statements parsed from migration file.")
        return

    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError as e:
        print(f"[delivery_logs] Auto-bootstrap skipped: install psycopg2-binary ({e}).")
        return

    conn = None
    try:
        conn = psycopg2.connect(url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        for stmt in statements:
            cur.execute(stmt)
        cur.close()
        print(f"[delivery_logs] Schema bootstrap applied ({len(statements)} statements).")
    except Exception as e:
        print(f"[delivery_logs] Auto-bootstrap failed (check SUPABASE_DB_URL / use port 5432 / SSL): {e}")
    finally:
        if conn is not None:
            conn.close()


async def try_bootstrap_delivery_logs() -> None:
    await asyncio.to_thread(run_delivery_logs_bootstrap_sync)
