from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import yfinance as yf
import random
from datetime import datetime, timedelta
import asyncio
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Sentinel API", description="Backend for Sentinel Financial Intelligence Platform")

# Allow CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PortfolioRequest(BaseModel):
    symbols: List[str]

# ---------------------------------------------------------------------------
# MODELS
# ---------------------------------------------------------------------------

class StockData(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float
    volume: int
    marketCap: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    previousClose: Optional[float] = None

class StockHistoricalData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class SearchResult(BaseModel):
    symbol: str
    name: str
    type: str
    region: str
    currency: str

# ---------------------------------------------------------------------------
# MARKET DATA ENDPOINTS (yfinance)
# ---------------------------------------------------------------------------

def get_mock_quote(symbol: str) -> StockData:
    base_price = 1000.0 + random.random() * 2000.0
    change = (random.random() - 0.5) * 50
    return StockData(
        symbol=symbol.upper(),
        name=symbol.upper().replace(".NS", ""),
        price=base_price,
        change=change,
        changePercent=(change / base_price) * 100,
        volume=int(random.random() * 10000000),
        marketCap=base_price * 1000000,
        high=base_price + 20,
        low=base_price - 20,
        open=base_price - change,
        previousClose=base_price - change
    )

def _fetch_quote_sync(symbol: str):
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    res = requests.get(url, headers=headers, timeout=5)
    
    if res.status_code != 200:
        raise Exception(f"Yahoo API failed with status {res.status_code}")
        
    data = res.json()
    result = data.get("chart", {}).get("result")
    
    if not result:
        raise Exception("No data in response")
        
    meta = result[0].get("meta", {})
    
    current_price = meta.get("regularMarketPrice", 0.0)
    previous_close = meta.get("chartPreviousClose", current_price)
    
    change = current_price - previous_close
    change_percent = (change / previous_close * 100) if previous_close else 0.0
    
    name = meta.get("shortName") or meta.get("longName") or symbol.upper().replace(".NS", "").replace(".BO", "")
    
    return StockData(
        symbol=symbol.upper(),
        name=name,
        price=current_price,
        change=change,
        changePercent=change_percent,
        volume=meta.get("regularMarketVolume", 0),
        marketCap=None,
        high=meta.get("regularMarketDayHigh"),
        low=meta.get("regularMarketDayLow"),
        open=meta.get("regularMarketPrice"),
        previousClose=previous_close
    )

@app.get("/api/stock/{symbol}/quote", response_model=StockData)
async def get_stock_quote(symbol: str):
    try:
        return await asyncio.to_thread(_fetch_quote_sync, symbol)
    except Exception as e:
        print(f"yfinance failed for {symbol}: {e}")
        return get_mock_quote(symbol)

def _fetch_history_sync(symbol: str, interval: str):
    period_map = {"daily": "1mo", "weekly": "3mo", "monthly": "1y"}
    interval_map = {"daily": "1d", "weekly": "1wk", "monthly": "1mo"}
    
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval_map[interval]}&range={period_map[interval]}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    res = requests.get(url, headers=headers, timeout=5)
    
    if res.status_code != 200:
        raise Exception(f"Yahoo API failed with status {res.status_code}")
        
    data = res.json()
    result = data.get("chart", {}).get("result")
    if not result:
        raise Exception("Empty history")
        
    timestamp = result[0].get("timestamp", [])
    indicators = result[0].get("indicators", {}).get("quote", [{}])[0]
    
    if not indicators:
        raise Exception("No indicator data")
        
    opens = indicators.get("open", [])
    highs = indicators.get("high", [])
    lows = indicators.get("low", [])
    closes = indicators.get("close", [])
    volumes = indicators.get("volume", [])
    
    hist_result = []
    for i in range(len(timestamp)):
        if closes and i < len(closes) and closes[i] is not None:
            date_str = datetime.fromtimestamp(timestamp[i]).strftime("%Y-%m-%d")
            hist_result.append(StockHistoricalData(
                date=date_str,
                open=float(opens[i]) if opens and i < len(opens) and opens[i] is not None else 0.0,
                high=float(highs[i]) if highs and i < len(highs) and highs[i] is not None else 0.0,
                low=float(lows[i]) if lows and i < len(lows) and lows[i] is not None else 0.0,
                close=float(closes[i]),
                volume=int(volumes[i]) if volumes and i < len(volumes) and volumes[i] is not None else 0
            ))
            
    hist_result.reverse()
    return hist_result

@app.get("/api/stock/{symbol}/history", response_model=List[StockHistoricalData])
async def get_stock_history(symbol: str, interval: str = Query("daily", regex="^(daily|weekly|monthly)$")):
    try:
        return await asyncio.to_thread(_fetch_history_sync, symbol, interval)
    except Exception as e:
        print(f"yfinance history failed for {symbol}: {e}")
        result = []
        base_price = 1500.0
        for i in range(30):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            base_price += (random.random() - 0.5) * 20
            result.append(StockHistoricalData(
                date=date,
                open=base_price - 5,
                high=base_price + 10,
                low=base_price - 10,
                close=base_price,
                volume=int(random.random() * 5000000)
            ))
        return result

NIFTY_50 = {
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy Services",
    "HDFCBANK.NS": "HDFC Bank",
    "ICICIBANK.NS": "ICICI Bank",
    "BHARTIARTL.NS": "Bharti Airtel",
    "SBIN.NS": "State Bank of India",
    "INFY.NS": "Infosys",
    "LICI.NS": "Life Insurance Corporation",
    "ITC.NS": "ITC Limited",
    "HINDUNILVR.NS": "Hindustan Unilever",
    "LT.NS": "Larsen & Toubro",
    "BAJFINANCE.NS": "Bajaj Finance",
    "HCLTECH.NS": "HCL Technologies",
    "MARUTI.NS": "Maruti Suzuki",
    "SUNPHARMA.NS": "Sun Pharmaceutical",
    "ADANIENT.NS": "Adani Enterprises",
    "KOTAKBANK.NS": "Kotak Mahindra Bank",
    "TITAN.NS": "Titan Company",
    "ONGC.NS": "Oil and Natural Gas Corporation",
    "TATAMOTORS.NS": "Tata Motors",
    "NTPC.NS": "NTPC Limited",
    "AXISBANK.NS": "Axis Bank",
    "DMART.NS": "Avenue Supermarts",
    "ADANIGREEN.NS": "Adani Green Energy",
    "ADANIPORTS.NS": "Adani Ports",
    "ULTRACEMCO.NS": "UltraTech Cement",
    "ASIANPAINT.NS": "Asian Paints",
    "COALINDIA.NS": "Coal India",
    "BAJAJFINSV.NS": "Bajaj Finserv",
    "BAJAJ-AUTO.NS": "Bajaj Auto",
    "POWERGRID.NS": "Power Grid Corporation",
    "NESTLEIND.NS": "Nestle India",
    "WIPRO.NS": "Wipro",
    "M&M.NS": "Mahindra & Mahindra",
    "IOC.NS": "Indian Oil Corporation",
    "JIOFIN.NS": "Jio Financial Services",
    "HAL.NS": "Hindustan Aeronautics",
    "DLF.NS": "DLF Limited",
    "TATASTEEL.NS": "Tata Steel",
    "SIEMENS.NS": "Siemens India",
    "SBILIFE.NS": "SBI Life Insurance",
    "GRASIM.NS": "Grasim Industries",
    "VBL.NS": "Varun Beverages",
    "HDFCLIFE.NS": "HDFC Life",
    "BEL.NS": "Bharat Electronics",
    "TECHM.NS": "Tech Mahindra",
    "HINDALCO.NS": "Hindalco Industries",
    "LTIM.NS": "LTIMindtree",
    "EICHERMOT.NS": "Eicher Motors",
    "DIVISLAB.NS": "Divi's Laboratories",
    "INDUSINDBK.NS": "IndusInd Bank",
    "ZOMATO.NS": "Zomato",
}

SENSEX_30 = {
    "RELIANCE.BO": "Reliance Industries",
    "TCS.BO": "Tata Consultancy Services",
    "HDFCBANK.BO": "HDFC Bank",
    "ICICIBANK.BO": "ICICI Bank",
    "BHARTIARTL.BO": "Bharti Airtel",
    "SBIN.BO": "State Bank of India",
    "INFY.BO": "Infosys",
    "ITC.BO": "ITC Limited",
    "HINDUNILVR.BO": "Hindustan Unilever",
    "LT.BO": "Larsen & Toubro",
    "BAJFINANCE.BO": "Bajaj Finance",
    "HCLTECH.BO": "HCL Technologies",
    "MARUTI.BO": "Maruti Suzuki",
    "SUNPHARMA.BO": "Sun Pharmaceutical",
    "KOTAKBANK.BO": "Kotak Mahindra Bank",
    "TITAN.BO": "Titan Company",
    "TATAMOTORS.BO": "Tata Motors",
    "NTPC.BO": "NTPC Limited",
    "AXISBANK.BO": "Axis Bank",
    "ULTRACEMCO.BO": "UltraTech Cement",
    "ASIANPAINT.BO": "Asian Paints",
    "BAJAJFINSV.BO": "Bajaj Finserv",
    "POWERGRID.BO": "Power Grid Corporation",
    "NESTLEIND.BO": "Nestle India",
    "WIPRO.BO": "Wipro",
    "M&M.BO": "Mahindra & Mahindra",
    "JSWSTEEL.BO": "JSW Steel",
    "TATASTEEL.BO": "Tata Steel",
    "INDUSINDBK.BO": "IndusInd Bank",
    "TECHM.BO": "Tech Mahindra",
}

def _fetch_search_sync(q: str):
    q_lower = q.lower()
    local_results = []
    
    # 1. Search local Nifty 50 database first
    for symbol, name in NIFTY_50.items():
        if q_lower in symbol.lower() or q_lower in name.lower():
            local_results.append(SearchResult(
                symbol=symbol,
                name=name,
                type="Equity",
                region="India",
                currency="INR"
            ))
            
    # Search Sensex 30
    for symbol, name in SENSEX_30.items():
        if symbol not in [r.symbol for r in local_results]:
            if q_lower in symbol.lower() or q_lower in name.lower():
                local_results.append(SearchResult(
                    symbol=symbol,
                    name=name,
                    type="Equity",
                    region="India",
                    currency="INR"
                ))
            
    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=10&newsCount=0"
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            existing_symbols = {r.symbol for r in local_results}
            
            for quote in data.get('quotes', []):
                symbol = quote.get('symbol', '')
                if (symbol.endswith('.NS') or symbol.endswith('.BO')) and symbol not in existing_symbols:
                    local_results.append(SearchResult(
                        symbol=symbol,
                        name=quote.get('shortname') or quote.get('longname') or symbol,
                        type=quote.get('quoteType', 'Equity'),
                        region="India",
                        currency="INR"
                    ))
    except Exception as e:
        print(f"Yahoo Search failed: {e}")
        
    if not local_results:
        local_results.append(SearchResult(
            symbol=f"{q.upper()}.NS",
            name=f"{q.upper()} (NSE)",
            type="Equity",
            region="India",
            currency="INR"
        ))
    return local_results[:15]

@app.get("/api/search", response_model=List[SearchResult])
async def search_stocks(q: str = Query(..., min_length=1)):
    try:
        return await asyncio.to_thread(_fetch_search_sync, q)
    except Exception as e:
        print(f"Search API error: {e}")
        return [SearchResult(
            symbol=f"{q.upper()}.NS",
            name=f"{q.upper()} (NSE)",
            type="Equity",
            region="India",
            currency="INR"
        )]

@app.get("/api/trending", response_model=List[StockData])
async def get_trending_stocks():
    symbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "SBIN.NS"]
    
    tasks = [asyncio.to_thread(_fetch_quote_sync, sym) for sym in symbols]
    results = []
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, res in enumerate(responses):
        if isinstance(res, Exception):
            print(f"yfinance failed for trending {symbols[i]}: {res}")
            results.append(get_mock_quote(symbols[i]))
        else:
            results.append(res)
            
    return results

@app.get("/api/nifty50", response_model=List[StockData])
async def get_nifty50_stocks():
    # Return all 50 of Nifty 50
    top_nifty = list(NIFTY_50.keys())
    
    tasks = [asyncio.to_thread(_fetch_quote_sync, sym) for sym in top_nifty]
    results = []
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, res in enumerate(responses):
        if isinstance(res, Exception):
            results.append(get_mock_quote(top_nifty[i]))
        else:
            results.append(res)
            
    return results

@app.get("/api/sensex", response_model=List[StockData])
async def get_sensex_stocks():
    # Return all 30 Sensex stocks
    top_sensex = list(SENSEX_30.keys())
    
    tasks = [asyncio.to_thread(_fetch_quote_sync, sym) for sym in top_sensex]
    results = []
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, res in enumerate(responses):
        if isinstance(res, Exception):
            results.append(get_mock_quote(top_sensex[i]))
        else:
            results.append(res)
            
    return results

# ---------------------------------------------------------------------------
# AGENT ENGINES (Real Gemini AI Agents)
# ---------------------------------------------------------------------------

def _get_gemini_llm():
    """Lazily initialise the Gemini LLM so startup never fails."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")
        return ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0.3)
    except Exception as e:
        print(f"[Gemini] Init error: {e}")
        return None

def _fetch_news_sync(symbol: str) -> dict:
    """Fetch recent news headlines and use Gemini to summarise them."""
    try:
        from bs4 import BeautifulSoup
        clean = symbol.replace(".NS", "").replace(".BO", "")
        url = f"https://news.google.com/rss/search?q={clean}+NSE+stock&hl=en-IN&gl=IN&ceid=IN:en"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        soup = BeautifulSoup(res.content, "xml")
        items = soup.find_all("item")[:6]
        headlines = [item.find("title").get_text(strip=True) for item in items if item.find("title")]
    except Exception as e:
        print(f"[News] Scrape error: {e}")
        headlines = []

    if not headlines:
        headlines = [f"{symbol} stock performance update", "Indian market outlook analysis", "Sector rotation in NSE equities"]

    llm = _get_gemini_llm()
    if not llm:
        return {
            "summary": f"Recent news for {symbol}: {headlines[0] if headlines else 'No headlines found.'}",
            "importance": "Medium",
            "marketImpact": "Neutral"
        }

    try:
        from langchain_core.messages import HumanMessage
        prompt = f"""You are a financial news analyst for Indian stock markets.

Here are the latest news headlines for {symbol}:
{chr(10).join(f'- {h}' for h in headlines)}

Respond with a JSON object with exactly these fields:
- summary: A single concise sentence (max 30 words) summarising the market sentiment.
- importance: One of: High, Medium, Low
- marketImpact: One of: Positive, Negative, Neutral

Respond ONLY with raw JSON, no markdown, no code fences."""
        response = llm.invoke([HumanMessage(content=prompt)])
        import json
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        return {
            "summary": result.get("summary", headlines[0]),
            "importance": result.get("importance", "Medium"),
            "marketImpact": result.get("marketImpact", "Neutral")
        }
    except Exception as e:
        print(f"[News] Gemini error: {e}")
        return {
            "summary": headlines[0] if headlines else f"No recent news found for {symbol}.",
            "importance": "Medium",
            "marketImpact": "Neutral"
        }

def _fetch_sentiment_sync(symbol: str) -> dict:
    """Use Gemini to classify sentiment of news as positive/negative/neutral scores."""
    try:
        from bs4 import BeautifulSoup
        clean = symbol.replace(".NS", "").replace(".BO", "")
        url = f"https://news.google.com/rss/search?q={clean}+NSE+India+stock&hl=en-IN&gl=IN&ceid=IN:en"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        soup = BeautifulSoup(res.content, "xml")
        items = soup.find_all("item")[:8]
        headlines = [item.find("title").get_text(strip=True) for item in items if item.find("title")]
    except Exception:
        headlines = []

    llm = _get_gemini_llm()
    if not llm or not headlines:
        return {"positive": 50, "negative": 30, "neutral": 20}

    try:
        from langchain_core.messages import HumanMessage
        import json
        prompt = f"""You are a financial sentiment analyser for Indian stock markets.

News headlines for {symbol}:
{chr(10).join(f'- {h}' for h in headlines)}

Given these headlines, estimate the percentage sentiment breakdown for this stock.
Respond with ONLY a JSON object with keys: positive, negative, neutral (all integers that sum to 100).
No markdown, no code fences."""
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        pos = int(result.get("positive", 50))
        neg = int(result.get("negative", 30))
        neu = 100 - pos - neg
        return {"positive": pos, "negative": neg, "neutral": max(0, neu)}
    except Exception as e:
        print(f"[Sentiment] Gemini error: {e}")
        return {"positive": 50, "negative": 30, "neutral": 20}

def _fetch_technical_sync(symbol: str) -> dict:
    """Calculate real RSI, MACD, SMA, EMA using pandas-ta."""
    try:
        import pandas as pd
        import pandas_ta as ta

        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=3mo"
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        result = data.get("chart", {}).get("result")
        if not result:
            raise Exception("No data")

        timestamps = result[0].get("timestamp", [])
        quotes = result[0].get("indicators", {}).get("quote", [{}])[0]
        closes = quotes.get("close", [])

        df = pd.DataFrame({"close": [c for c in closes if c is not None]})
        if len(df) < 26:
            raise Exception("Not enough data for indicators")

        df.ta.rsi(length=14, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
        df.ta.sma(length=20, append=True)
        df.ta.ema(length=20, append=True)

        rsi = round(float(df["RSI_14"].dropna().iloc[-1]), 2)
        macd_val = df["MACD_12_26_9"].dropna().iloc[-1] if "MACD_12_26_9" in df.columns else 0
        macd_signal = df["MACDs_12_26_9"].dropna().iloc[-1] if "MACDs_12_26_9" in df.columns else 0
        macd_str = "Bullish" if float(macd_val) > float(macd_signal) else "Bearish"
        sma = round(float(df["SMA_20"].dropna().iloc[-1]), 2)
        ema = round(float(df["EMA_20"].dropna().iloc[-1]), 2)
        current = df["close"].iloc[-1]
        trend = "Uptrend" if current > sma else ("Downtrend" if current < sma * 0.98 else "Sideways")

        return {"rsi": rsi, "macd": macd_str, "sma": sma, "ema": ema, "trend": trend}
    except Exception as e:
        print(f"[Technical] Error: {e}")
        return {"rsi": 50.0, "macd": "Neutral", "sma": 0.0, "ema": 0.0, "trend": "Sideways"}

def _fetch_risk_sync(symbol: str) -> dict:
    """Calculate real volatility and use Gemini to classify risk."""
    try:
        import pandas as pd
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1mo"
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=5)
        data = res.json()
        result = data.get("chart", {}).get("result")
        closes = result[0]["indicators"]["quote"][0].get("close", []) if result else []
        closes = [c for c in closes if c is not None]

        if len(closes) > 5:
            returns = [((closes[i] - closes[i-1]) / closes[i-1]) * 100 for i in range(1, len(closes))]
            std_dev = round((sum((r - sum(returns)/len(returns))**2 for r in returns) / len(returns))**0.5, 2)
            vol_label = "High" if std_dev > 2.5 else ("Low" if std_dev < 1.0 else "Moderate")
        else:
            std_dev = 1.5
            vol_label = "Moderate"

        llm = _get_gemini_llm()
        if not llm:
            return {"volatility": vol_label, "marketRisk": "Medium", "confidence": 70}

        from langchain_core.messages import HumanMessage
        import json
        prompt = f"""Stock: {symbol}. Daily return std deviation over 1 month: {std_dev}%.
Volatility classification: {vol_label}.
Provide a JSON with: marketRisk (one of: Low, Medium, High, Very High), confidence (integer 0-100).
No markdown, no code fences."""
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip().lstrip("```json").rstrip("```").strip()
        result_json = json.loads(text)
        return {
            "volatility": vol_label,
            "marketRisk": result_json.get("marketRisk", "Medium"),
            "confidence": int(result_json.get("confidence", 70))
        }
    except Exception as e:
        print(f"[Risk] Error: {e}")
        return {"volatility": "Moderate", "marketRisk": "Medium", "confidence": 65}

def _fetch_report_sync(symbol: str) -> dict:
    """Use Gemini to synthesise a full analyst report for a given stock."""
    try:
        technical = _fetch_technical_sync(symbol)
        risk = _fetch_risk_sync(symbol)

        llm = _get_gemini_llm()
        if not llm:
            raise Exception("No LLM")

        from langchain_core.messages import HumanMessage
        import json
        prompt = f"""You are a senior equity analyst at a top Indian brokerage firm.

Stock: {symbol}
Technical Summary:
- RSI: {technical['rsi']} ({'Overbought' if technical['rsi'] > 70 else 'Oversold' if technical['rsi'] < 30 else 'Neutral'})
- MACD: {technical['macd']}
- Trend: {technical['trend']}
- SMA20: ₹{technical['sma']}, EMA20: ₹{technical['ema']}

Risk Assessment:
- Volatility: {risk['volatility']}
- Market Risk: {risk['marketRisk']}

Write a concise analyst report. Respond ONLY with a JSON object with exactly these fields:
- outlook: One of: Bullish, Moderately Bullish, Neutral, Moderately Bearish, Bearish
- confidence: integer 0-100
- reasons: list of 3 short strings (reasons to be optimistic)
- risks: list of 2 short strings (key risks)
- recommendation: one sentence actionable advice

No markdown, no code fences."""
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        return {
            "outlook": result.get("outlook", "Neutral"),
            "confidence": int(result.get("confidence", 60)),
            "reasons": result.get("reasons", ["Technical indicators showing support"]),
            "risks": result.get("risks", ["Macroeconomic uncertainty"]),
            "recommendation": result.get("recommendation", "Monitor closely before taking a position.")
        }
    except Exception as e:
        print(f"[Report] Gemini error: {e}")
        return {
            "outlook": "Neutral",
            "confidence": 60,
            "reasons": ["Technical indicators within normal range", "Sector showing relative stability", "Volume patterns suggest accumulation"],
            "risks": ["Broader market uncertainty", "Upcoming earnings may create volatility"],
            "recommendation": "Monitor the stock closely. Wait for a clearer trend before entering."
        }

def _fetch_portfolio_analysis_sync(symbols: List[str]) -> dict:
    """Use Gemini to analyse a portfolio's sector diversification and risk."""
    try:
        import yfinance as yf
        from langchain_core.messages import HumanMessage
        import json

        llm = _get_gemini_llm()
        if not llm:
            return {
                "diversification_score": 50,
                "risk_level": "Medium",
                "analysis": "AI unavailable. Basic portfolio analysis cannot be completed.",
                "suggestions": ["Please check your API key."],
                "sector_breakdown": {}
            }

        sector_counts = {}
        if not symbols:
            return {
                "diversification_score": 0,
                "risk_level": "N/A",
                "analysis": "Your portfolio is empty.",
                "suggestions": ["Add some stocks to analyze your portfolio."],
                "sector_breakdown": {}
            }

        for sym in symbols:
            try:
                info = yf.Ticker(sym).info
                sector = info.get("sector", "Unknown")
                sector_counts[sector] = sector_counts.get(sector, 0) + 1
            except Exception:
                sector_counts["Unknown"] = sector_counts.get("Unknown", 0) + 1

        total = len(symbols)
        sector_breakdown = {k: round((v/total)*100, 1) for k, v in sector_counts.items()} if total > 0 else {}

        prompt = f"""You are an expert AI Portfolio Manager.
Analyze the following user portfolio based on its sector exposure:
Portfolio Symbols: {', '.join(symbols)}
Sector Breakdown: {json.dumps(sector_breakdown)}

Provide a JSON object exactly with these fields:
- diversification_score: integer 0-100 (how well diversified it is)
- risk_level: One of: Low, Medium, High, Very High
- analysis: A 2-3 sentence paragraph explaining your assessment.
- suggestions: A list of 2-3 short, actionable suggestions (e.g. "Add exposure to Healthcare").

Respond ONLY with raw JSON, no markdown, no code fences.
"""
        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        
        result = json.loads(text)
        return {
            "diversification_score": int(result.get("diversification_score", 50)),
            "risk_level": result.get("risk_level", "Medium"),
            "analysis": result.get("analysis", "Sector breakdown calculated."),
            "suggestions": result.get("suggestions", ["Consider diversifying further."]),
            "sector_breakdown": sector_breakdown
        }
    except Exception as e:
        print(f"[Portfolio] Gemini error: {e}")
        return {
            "diversification_score": 50,
            "risk_level": "Medium",
            "analysis": "An error occurred during portfolio analysis.",
            "suggestions": ["Try again later."],
            "sector_breakdown": {}
        }

# ---------------------------------------------------------------------------
# AGENT ENDPOINTS (Powered by Gemini)
# ---------------------------------------------------------------------------

@app.get("/api/agent/{symbol}/news")
async def get_agent_news(symbol: str):
    return await asyncio.to_thread(_fetch_news_sync, symbol)

@app.get("/api/agent/{symbol}/sentiment")
async def get_agent_sentiment(symbol: str):
    return await asyncio.to_thread(_fetch_sentiment_sync, symbol)

@app.get("/api/agent/{symbol}/technical")
async def get_agent_technical(symbol: str):
    return await asyncio.to_thread(_fetch_technical_sync, symbol)

@app.get("/api/agent/{symbol}/risk")
async def get_agent_risk(symbol: str):
    return await asyncio.to_thread(_fetch_risk_sync, symbol)

@app.get("/api/agent/{symbol}/report")
async def get_agent_report(symbol: str):
    return await asyncio.to_thread(_fetch_report_sync, symbol)

@app.post("/api/agent/portfolio")
async def get_agent_portfolio(req: PortfolioRequest):
    return await asyncio.to_thread(_fetch_portfolio_analysis_sync, req.symbols)

@app.get("/api/agent/{symbol}/pipeline")
async def run_agent_pipeline(
    symbol: str,
    mode: str = Query(default="full", regex="^(full|quick)$")
):
    """
    Run the Sentinel LangGraph multi-agent pipeline for a stock.

    Query params:
      mode: 'full'  → Planner → News → Sentiment → Technical → Risk → Report
            'quick' → Planner → Technical → Risk → Report (skips news/sentiment)

    Returns the complete agent state including run_id and timestamp for history.
    """
    try:
        from sentinel_graph import run_sentinel_pipeline
        result = await asyncio.to_thread(run_sentinel_pipeline, symbol, mode)
        return {
            "symbol": symbol,
            "run_id": result.get("run_id", ""),
            "timestamp": result.get("timestamp", ""),
            "mode": mode,
            "agents_run": result.get("agents_run", []),
            "news": result.get("news"),
            "sentiment": result.get("sentiment"),
            "technical": result.get("technical"),
            "risk": result.get("risk"),
            "report": result.get("report"),
            "errors": result.get("errors", []),
            "agent_graph": "planner → news → sentiment → technical → risk → report"
        }
    except Exception as e:
        print(f"[Pipeline] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    question: str
    symbol: Optional[str] = None

def _fetch_chat_sync(question: str, symbol: Optional[str]) -> dict:
    """AI Chat Agent: Answer a financial question using Gemini."""
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        import json

        llm = _get_gemini_llm()
        if not llm:
            return {"answer": "AI service is currently unavailable. Please check your Gemini API key."}

        context = ""
        if symbol:
            context = f"\nThe user is currently viewing the stock: {symbol}. Prioritise information relevant to this stock when answering."

        system_prompt = f"""You are Sentinel, an expert AI financial assistant for Indian and global stock markets.
You provide clear, concise, and factual financial insights. You never give guaranteed predictions.
Always phrase uncertain things as possibilities (e.g., 'may', 'could', 'based on current data').{context}
Keep your answers concise (2-4 sentences max unless a list is clearly better)."""

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=question)
        ])
        return {"answer": response.content.strip()}
    except Exception as e:
        print(f"[Chat] Gemini error: {e}")
        return {"answer": "I encountered an error processing your question. Please try again."}

@app.post("/api/agent/chat")
async def chat_with_sentinel(req: ChatRequest):
    """AI Chat endpoint — powered by Gemini LLM."""
    return await asyncio.to_thread(_fetch_chat_sync, req.question, req.symbol)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


