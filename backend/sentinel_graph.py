"""
Sentinel LangGraph Multi-Agent Workflow (Phase 6)

Graph topology:
  START → planner → news → sentiment → technical → risk → report → END

The Planner node inspects the request and decides which agents are needed.
Each subsequent node runs its agent and merges results into shared AgentState.
"""

from typing import TypedDict, Optional, List, Literal
from langgraph.graph import StateGraph, END
import uuid
from datetime import datetime


# ---------------------------------------------------------------------------
# Shared Agent State
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    # Input
    symbol: str
    mode: Literal["full", "quick"]          # full = all agents; quick = technical+report only

    # Agent outputs
    news: Optional[dict]
    sentiment: Optional[dict]
    technical: Optional[dict]
    risk: Optional[dict]
    report: Optional[dict]

    # Pipeline metadata (returned to caller for history)
    run_id: str
    timestamp: str
    agents_run: List[str]
    errors: List[str]


# ---------------------------------------------------------------------------
# Planner Node — entry point, decides routing
# ---------------------------------------------------------------------------

def planner_node(state: AgentState) -> AgentState:
    """
    Planner Agent: Orchestrates the pipeline.

    In 'full' mode  → all 5 agents run sequentially.
    In 'quick' mode → skips news & sentiment, runs technical → risk → report.
    The planner stamps a unique run_id and ISO timestamp for history tracking.
    """
    run_id = str(uuid.uuid4())[:8]
    timestamp = datetime.utcnow().isoformat() + "Z"

    print(f"[Planner] Starting pipeline for {state['symbol']} | mode={state['mode']} | run_id={run_id}")
    return {
        **state,
        "run_id": run_id,
        "timestamp": timestamp,
        "agents_run": [],
        "errors": state.get("errors", [])
    }


# ---------------------------------------------------------------------------
# Agent Nodes
# ---------------------------------------------------------------------------

def news_node(state: AgentState) -> AgentState:
    """News Agent: Fetches and summarises news for the stock."""
    symbol = state["symbol"]
    mode = state.get("mode", "full")

    # Quick mode skips news agent
    if mode == "quick":
        return {**state, "news": None}

    try:
        from main import _fetch_news_sync
        result = _fetch_news_sync(symbol)
        print(f"[NewsAgent] Completed for {symbol}")
        return {
            **state,
            "news": result,
            "agents_run": state.get("agents_run", []) + ["news"]
        }
    except Exception as e:
        err = f"[NewsAgent] Error: {e}"
        print(err)
        return {
            **state,
            "news": {"summary": "News unavailable.", "importance": "Medium", "marketImpact": "Neutral"},
            "agents_run": state.get("agents_run", []) + ["news"],
            "errors": state.get("errors", []) + [err]
        }


def sentiment_node(state: AgentState) -> AgentState:
    """Sentiment Agent: Classifies news sentiment as positive/negative/neutral."""
    symbol = state["symbol"]
    mode = state.get("mode", "full")

    # Quick mode skips sentiment agent
    if mode == "quick":
        return {**state, "sentiment": None}

    try:
        from main import _fetch_sentiment_sync
        result = _fetch_sentiment_sync(symbol)
        print(f"[SentimentAgent] Completed for {symbol}")
        return {
            **state,
            "sentiment": result,
            "agents_run": state.get("agents_run", []) + ["sentiment"]
        }
    except Exception as e:
        err = f"[SentimentAgent] Error: {e}"
        print(err)
        return {
            **state,
            "sentiment": {"positive": 50, "negative": 30, "neutral": 20},
            "agents_run": state.get("agents_run", []) + ["sentiment"],
            "errors": state.get("errors", []) + [err]
        }


def technical_node(state: AgentState) -> AgentState:
    """Technical Agent: Computes RSI, MACD, SMA, EMA, and trend."""
    symbol = state["symbol"]
    try:
        from main import _fetch_technical_sync
        result = _fetch_technical_sync(symbol)
        print(f"[TechnicalAgent] Completed for {symbol}")
        return {
            **state,
            "technical": result,
            "agents_run": state.get("agents_run", []) + ["technical"]
        }
    except Exception as e:
        err = f"[TechnicalAgent] Error: {e}"
        print(err)
        return {
            **state,
            "technical": {"rsi": 50.0, "macd": "Neutral", "sma": 0.0, "ema": 0.0, "trend": "Sideways"},
            "agents_run": state.get("agents_run", []) + ["technical"],
            "errors": state.get("errors", []) + [err]
        }


def risk_node(state: AgentState) -> AgentState:
    """Risk Agent: Estimates volatility and market risk confidence."""
    symbol = state["symbol"]
    try:
        from main import _fetch_risk_sync
        result = _fetch_risk_sync(symbol)
        print(f"[RiskAgent] Completed for {symbol}")
        return {
            **state,
            "risk": result,
            "agents_run": state.get("agents_run", []) + ["risk"]
        }
    except Exception as e:
        err = f"[RiskAgent] Error: {e}"
        print(err)
        return {
            **state,
            "risk": {"volatility": "Moderate", "marketRisk": "Medium", "confidence": 65},
            "agents_run": state.get("agents_run", []) + ["risk"],
            "errors": state.get("errors", []) + [err]
        }


def report_node(state: AgentState) -> AgentState:
    """Report Agent: Synthesises all agent outputs into a final analyst report."""
    symbol = state["symbol"]
    technical = state.get("technical") or {}
    risk = state.get("risk") or {}
    news = state.get("news") or {}
    sentiment = state.get("sentiment") or {}

    try:
        from main import _get_gemini_llm
        from langchain_core.messages import HumanMessage
        import json

        llm = _get_gemini_llm()
        if not llm:
            raise Exception("Gemini LLM unavailable")

        prompt = f"""You are a senior equity analyst. Produce a final investment report for {symbol}.

Context from all agents:
- News Summary: {news.get('summary', 'N/A')} (Impact: {news.get('marketImpact', 'N/A')})
- Sentiment: Positive {sentiment.get('positive', 50)}%, Negative {sentiment.get('negative', 30)}%, Neutral {sentiment.get('neutral', 20)}%
- Technical: RSI={technical.get('rsi', 50)}, MACD={technical.get('macd', 'N/A')}, Trend={technical.get('trend', 'N/A')}
- Risk: Volatility={risk.get('volatility', 'N/A')}, MarketRisk={risk.get('marketRisk', 'N/A')}

Respond ONLY with raw JSON containing:
- outlook: one of Bullish, Moderately Bullish, Neutral, Moderately Bearish, Bearish
- confidence: integer 0-100
- reasons: list of 3 short strings
- risks: list of 2 short strings
- recommendation: one actionable sentence
No markdown, no code fences."""

        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        print(f"[ReportAgent] Completed for {symbol} | Outlook: {result.get('outlook')}")
        return {
            **state,
            "report": {
                "outlook": result.get("outlook", "Neutral"),
                "confidence": int(result.get("confidence", 60)),
                "reasons": result.get("reasons", ["Indicators within range"]),
                "risks": result.get("risks", ["Market uncertainty"]),
                "recommendation": result.get("recommendation", "Monitor closely.")
            },
            "agents_run": state.get("agents_run", []) + ["report"]
        }
    except Exception as e:
        err = f"[ReportAgent] Error: {e}"
        print(err)
        return {
            **state,
            "report": {
                "outlook": "Neutral",
                "confidence": 60,
                "reasons": ["Technical indicators within range", "Sector relatively stable", "Volume patterns suggest accumulation"],
                "risks": ["Broader market uncertainty", "Upcoming events may create volatility"],
                "recommendation": "Monitor closely before taking a position."
            },
            "agents_run": state.get("agents_run", []) + ["report"],
            "errors": state.get("errors", []) + [err]
        }


# ---------------------------------------------------------------------------
# Build the LangGraph Workflow
# ---------------------------------------------------------------------------

def build_sentinel_graph() -> StateGraph:
    """Construct the full Sentinel multi-agent LangGraph with Planner."""
    workflow = StateGraph(AgentState)

    # Register all nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("news", news_node)
    workflow.add_node("sentiment", sentiment_node)
    workflow.add_node("technical", technical_node)
    workflow.add_node("risk", risk_node)
    workflow.add_node("report", report_node)

    # Define edges: planner → news → sentiment → technical → risk → report → END
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "news")
    workflow.add_edge("news", "sentiment")
    workflow.add_edge("sentiment", "technical")
    workflow.add_edge("technical", "risk")
    workflow.add_edge("risk", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


# Singleton compiled graph — reused across requests
_sentinel_graph = None


def get_sentinel_graph():
    global _sentinel_graph
    if _sentinel_graph is None:
        _sentinel_graph = build_sentinel_graph()
    return _sentinel_graph


def run_sentinel_pipeline(symbol: str, mode: str = "full") -> dict:
    """
    Run the full Sentinel agent pipeline for a given stock symbol.

    Args:
        symbol: Stock ticker (e.g. "TCS.NS")
        mode:   "full" runs all 5 agents; "quick" skips news & sentiment

    Returns:
        Complete agent state with all results, run_id, and timestamp.
    """
    graph = get_sentinel_graph()
    initial_state: AgentState = {
        "symbol": symbol,
        "mode": mode,           # type: ignore[typeddict-item]
        "news": None,
        "sentiment": None,
        "technical": None,
        "risk": None,
        "report": None,
        "run_id": "",
        "timestamp": "",
        "agents_run": [],
        "errors": []
    }
    final_state = graph.invoke(initial_state)
    return final_state
