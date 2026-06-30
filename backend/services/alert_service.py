"""
Sentinel — Alert Service
Handles CRUD for alerts in the PostgreSQL (Supabase) database.
"""

import os
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# DB connection
# ---------------------------------------------------------------------------

def _get_conn():
    """Open a new connection to the Supabase PostgreSQL database."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise EnvironmentError("DATABASE_URL is not set in environment variables")
    return psycopg2.connect(db_url)


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def create_alert(user_id: str, ticker: str, target_price: float, condition: str) -> dict:
    """
    Insert a new alert row.
    condition must be 'ABOVE' or 'BELOW'.
    """
    condition = condition.upper()
    if condition not in ("ABOVE", "BELOW"):
        raise ValueError("condition must be 'ABOVE' or 'BELOW'")

    sql = """
        INSERT INTO "Alert" (id, "userId", ticker, "targetPrice", condition,
                             "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, %s, %s, %s, %s, true,
                NOW(), NOW())
        RETURNING id, "userId", ticker, "targetPrice", condition,
                  "isActive", "lastTriggered", "createdAt", "updatedAt";
    """
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (user_id, ticker.upper(), target_price, condition))
            conn.commit()
            return dict(cur.fetchone())


def get_alerts_for_user(user_id: str) -> list[dict]:
    """Fetch all alerts belonging to a user, newest first."""
    sql = """
        SELECT id, "userId", ticker, "targetPrice", condition,
               "isActive", "lastTriggered", "createdAt", "updatedAt"
        FROM "Alert"
        WHERE "userId" = %s
        ORDER BY "createdAt" DESC;
    """
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, (user_id,))
            return [dict(row) for row in cur.fetchall()]


def get_all_active_alerts() -> list[dict]:
    """Fetch all active alerts across all users (used by the price monitor job)."""
    sql = """
        SELECT a.id, a."userId", a.ticker, a."targetPrice", a.condition,
               a."lastTriggered", u.email, u.name
        FROM "Alert" a
        JOIN "User" u ON u.id = a."userId"
        WHERE a."isActive" = true;
    """
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            return [dict(row) for row in cur.fetchall()]


def delete_alert(alert_id: str, user_id: str) -> bool:
    """Delete an alert. Only deletes if it belongs to the given user."""
    sql = """
        DELETE FROM "Alert"
        WHERE id = %s AND "userId" = %s
        RETURNING id;
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (alert_id, user_id))
            conn.commit()
            return cur.rowcount > 0


def mark_alert_triggered(alert_id: str) -> None:
    """Update lastTriggered timestamp when an alert fires."""
    sql = """
        UPDATE "Alert"
        SET "lastTriggered" = NOW(), "updatedAt" = NOW()
        WHERE id = %s;
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (alert_id,))
            conn.commit()


def deactivate_alert(alert_id: str) -> None:
    """Permanently deactivate a triggered alert so it doesn't re-fire."""
    sql = """
        UPDATE "Alert"
        SET "isActive" = false, "lastTriggered" = NOW(), "updatedAt" = NOW()
        WHERE id = %s;
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (alert_id,))
            conn.commit()
