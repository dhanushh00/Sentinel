"""
Sentinel — Alerts Router (FastAPI)

Endpoints:
  POST   /api/alerts          Create a new alert
  GET    /api/alerts          Get all alerts for a user
  DELETE /api/alerts/{id}     Delete an alert
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from services.alert_service import (
    create_alert,
    get_alerts_for_user,
    delete_alert,
)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateAlertRequest(BaseModel):
    userId: str          # Passed by the frontend from the NextAuth session
    ticker: str
    targetPrice: float
    condition: str       # "ABOVE" or "BELOW"


class DeleteAlertRequest(BaseModel):
    userId: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("")
async def create_alert_endpoint(req: CreateAlertRequest):
    """Create a new price alert for a user."""
    try:
        alert = create_alert(
            user_id=req.userId,
            ticker=req.ticker.upper(),
            target_price=req.targetPrice,
            condition=req.condition.upper(),
        )
        return {"success": True, "alert": alert}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {e}")


@router.get("")
async def get_alerts_endpoint(userId: str):
    """Get all alerts for a given user."""
    try:
        alerts = get_alerts_for_user(user_id=userId)
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {e}")


@router.delete("/{alert_id}")
async def delete_alert_endpoint(alert_id: str, req: DeleteAlertRequest):
    """Delete an alert. Only succeeds if the alert belongs to the given user."""
    try:
        deleted = delete_alert(alert_id=alert_id, user_id=req.userId)
        if not deleted:
            raise HTTPException(status_code=404, detail="Alert not found or access denied")
        return {"success": True, "deletedId": alert_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {e}")
