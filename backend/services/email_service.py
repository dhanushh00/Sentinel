"""
Sentinel — Email Service
Sends professional AI-enhanced HTML alert emails via Resend.
"""

import os
import resend
from datetime import datetime

# ---------------------------------------------------------------------------
# Resend client initialisation
# ---------------------------------------------------------------------------

def _get_resend_client():
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        raise EnvironmentError("RESEND_API_KEY is not set in environment variables")
    resend.api_key = api_key


# ---------------------------------------------------------------------------
# HTML email template
# ---------------------------------------------------------------------------

def _build_alert_html(
    user_name: str,
    ticker: str,
    condition: str,
    target_price: float,
    current_price: float,
    ai_insight: str,
) -> str:
    direction = "above" if condition == "ABOVE" else "below"
    arrow = "↑" if condition == "ABOVE" else "↓"
    color = "#22c55e" if condition == "ABOVE" else "#ef4444"
    timestamp = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sentinel Price Alert</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1e2e,#16213e);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:28px;">🛡</span>
                <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">SENTINEL</span>
              </div>
              <p style="margin:8px 0 0;font-size:13px;color:#8888aa;letter-spacing:2px;">AI FINANCIAL INTELLIGENCE</p>
            </td>
          </tr>

          <!-- Alert badge -->
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <div style="display:inline-block;background:{color}22;border:1px solid {color}55;
                          border-radius:24px;padding:8px 20px;">
                <span style="color:{color};font-size:13px;font-weight:600;letter-spacing:1px;">
                  {arrow} PRICE ALERT TRIGGERED
                </span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0;font-size:16px;color:#cccccc;">
                Hello <strong style="color:#fff;">{user_name or 'Investor'}</strong>,
              </p>
              <p style="margin:10px 0 0;font-size:15px;color:#999;line-height:1.6;">
                Your price alert for <strong style="color:#fff;">{ticker}</strong> has been triggered.
                The stock has moved {direction} your target price.
              </p>
            </td>
          </tr>

          <!-- Price card -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#242424;border-radius:12px;border:1px solid #333;">
                <tr>
                  <td style="padding:20px 24px;border-right:1px solid #333;text-align:center;width:50%;">
                    <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Target Price</p>
                    <p style="margin:8px 0 0;font-size:26px;font-weight:700;color:#fff;">₹{target_price:,.2f}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#888;">{condition}</p>
                  </td>
                  <td style="padding:20px 24px;text-align:center;width:50%;">
                    <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Current Price</p>
                    <p style="margin:8px 0 0;font-size:26px;font-weight:700;color:{color};">₹{current_price:,.2f}</p>
                    <p style="margin:4px 0 0;font-size:11px;color:{color};">Live</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AI Insights -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#1e1e2e;border-radius:12px;border:1px solid #2a2a3e;padding:20px 24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:12px;color:#7c7caa;letter-spacing:1px;text-transform:uppercase;">
                      🤖 Sentinel AI Insight
                    </p>
                    <p style="margin:0;font-size:14px;color:#ccccdd;line-height:1.7;">{ai_insight}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
                Generated by <strong style="color:#7c7caa;">Sentinel AI</strong> at {timestamp}<br/>
                This is an automated alert. Not financial advice.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# AI insight generator
# ---------------------------------------------------------------------------

def _generate_ai_insight(ticker: str, current_price: float, target_price: float) -> str:
    """Generate a short AI financial insight for the triggered alert."""
    try:
        import os
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage

        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY", ""),
            temperature=0.3,
        )
        prompt = f"""Generate a concise financial insight for {ticker}.
Current Price: ₹{current_price:.2f}
Target Price: ₹{target_price:.2f}

Include in 3 bullet points (max 80 words total):
- Market sentiment
- Technical outlook
- Risk level

Keep it factual and non-predictive. No disclaimers."""
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        print(f"[EmailService] AI insight error: {e}")
        return (
            f"• Current price ₹{current_price:.2f} has reached your target of ₹{target_price:.2f}.\n"
            "• Review current market conditions before acting.\n"
            "• Risk level: Moderate — always consider your investment horizon."
        )


# ---------------------------------------------------------------------------
# Public send function
# ---------------------------------------------------------------------------

def send_alert_email(
    to_email: str,
    user_name: str,
    ticker: str,
    condition: str,
    target_price: float,
    current_price: float,
) -> bool:
    """
    Send a Sentinel price alert email with AI insights via Resend.
    Returns True on success, False on failure.
    """
    try:
        _get_resend_client()

        ai_insight = _generate_ai_insight(ticker, current_price, target_price)
        html_body = _build_alert_html(
            user_name, ticker, condition, target_price, current_price, ai_insight
        )

        from_email = os.getenv("ALERT_FROM_EMAIL", "onboarding@resend.dev")
        direction_label = "crossed above" if condition == "ABOVE" else "dropped below"

        params: resend.Emails.SendParams = {
            "from": from_email,
            "to": [to_email],
            "subject": f"🛡 Sentinel Alert: {ticker} {direction_label} ₹{target_price:,.0f}",
            "html": html_body,
        }

        result = resend.Emails.send(params)
        print(f"[EmailService] Alert sent to {to_email} | id: {result.get('id')}")
        return True

    except Exception as e:
        print(f"[EmailService] Failed to send email to {to_email}: {e}")
        return False
