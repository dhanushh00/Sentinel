"""
Sentinel — Price Monitor (APScheduler Job)

Runs every 5 minutes via APScheduler.
Fetches all active alerts, checks current prices via yfinance,
and sends Resend emails when conditions are met.
"""

import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger("sentinel.price_monitor")


# ---------------------------------------------------------------------------
# Cooldown: don't re-trigger the same alert within 1 hour
# ---------------------------------------------------------------------------

TRIGGER_COOLDOWN_HOURS = 1


def _is_on_cooldown(last_triggered) -> bool:
    """Return True if the alert fired within the cooldown window."""
    if last_triggered is None:
        return False
    if isinstance(last_triggered, str):
        # psycopg2 can return strings in some configurations
        try:
            last_triggered = datetime.fromisoformat(last_triggered)
        except ValueError:
            return False
    if last_triggered.tzinfo is None:
        last_triggered = last_triggered.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - last_triggered
    return delta < timedelta(hours=TRIGGER_COOLDOWN_HOURS)


# ---------------------------------------------------------------------------
# Core check job
# ---------------------------------------------------------------------------

def check_price_alerts():
    """
    Called by APScheduler every 5 minutes.
    1. Fetch all active alerts with user emails.
    2. Get latest price from yfinance.
    3. Evaluate condition (ABOVE / BELOW).
    4. Send Resend email + mark triggered (with cooldown).
    """
    try:
        from services.alert_service import get_all_active_alerts, mark_alert_triggered
        from services.email_service import send_alert_email
        import yfinance as yf

        alerts = get_all_active_alerts()
        if not alerts:
            logger.info("[PriceMonitor] No active alerts to check.")
            return

        logger.info(f"[PriceMonitor] Checking {len(alerts)} active alerts…")

        # Group by ticker to minimise yfinance calls
        tickers: dict[str, list] = {}
        for alert in alerts:
            tickers.setdefault(alert["ticker"], []).append(alert)

        for ticker, ticker_alerts in tickers.items():
            try:
                data = yf.Ticker(ticker).fast_info
                current_price = data.get("last_price") or data.get("lastPrice")
                if current_price is None:
                    logger.warning(f"[PriceMonitor] Could not fetch price for {ticker}")
                    continue
                current_price = float(current_price)
            except Exception as e:
                logger.error(f"[PriceMonitor] yfinance error for {ticker}: {e}")
                continue

            for alert in ticker_alerts:
                target = float(alert["targetPrice"])
                condition = alert["condition"]

                triggered = (
                    (condition == "ABOVE" and current_price > target)
                    or (condition == "BELOW" and current_price < target)
                )

                if not triggered:
                    continue

                if _is_on_cooldown(alert.get("lastTriggered")):
                    logger.info(
                        f"[PriceMonitor] {ticker} alert (id={alert['id']}) on cooldown — skipping"
                    )
                    continue

                logger.info(
                    f"[PriceMonitor] 🔔 Alert triggered: {ticker} {condition} ₹{target} "
                    f"(current: ₹{current_price:.2f}) → {alert['email']}"
                )

                # Send email
                send_alert_email(
                    to_email=alert["email"],
                    user_name=alert.get("name", ""),
                    ticker=ticker,
                    condition=condition,
                    target_price=target,
                    current_price=current_price,
                )

                # Update DB timestamp
                mark_alert_triggered(alert["id"])

    except Exception as e:
        logger.error(f"[PriceMonitor] Unexpected error: {e}", exc_info=True)


# ---------------------------------------------------------------------------
# Scheduler factory
# ---------------------------------------------------------------------------

def create_scheduler() -> BackgroundScheduler:
    """
    Build and return a configured BackgroundScheduler.
    Call scheduler.start() once at FastAPI startup.
    """
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        func=check_price_alerts,
        trigger="interval",
        minutes=5,
        id="price_monitor",
        name="Sentinel Price Monitor",
        replace_existing=True,
        max_instances=1,       # Prevent overlapping runs
        misfire_grace_time=60, # Skip missed jobs older than 60s
    )
    return scheduler
