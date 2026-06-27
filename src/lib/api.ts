// Stock API interface and fetching functions

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface StockHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// AGENT INTERFACES
// ---------------------------------------------------------------------------

export interface NewsAgentData {
  summary: string;
  importance: "High" | "Medium" | "Low";
  marketImpact: "Positive" | "Negative" | "Neutral";
}

export interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

export interface TechnicalData {
  rsi: number;
  macd: string; // e.g., "Bullish", "Bearish"
  sma: number;
  ema: number;
  trend: "Uptrend" | "Downtrend" | "Sideways";
}

export interface RiskData {
  volatility: "High" | "Moderate" | "Low";
  marketRisk: string;
  confidence: number;
}

export interface ReportData {
  outlook: "Bullish" | "Moderately Bullish" | "Neutral" | "Moderately Bearish" | "Bearish";
  confidence: number;
  reasons: string[];
  risks: string[];
  recommendation: string;
}

const BACKEND_URL = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// EXPORTED FUNCTIONS (Fetching from FastAPI)
// ---------------------------------------------------------------------------

export async function getStockQuote(symbol: string): Promise<StockData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/stock/${symbol}/quote`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching quote:", error);
    return null;
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return [];
  try {
    const res = await fetch(`${BACKEND_URL}/search?q=${query}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
}

export async function getTrendingStocks(): Promise<StockData[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/trending`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching trending stocks:", error);
    return [];
  }
}

export async function getNifty50Stocks(): Promise<StockData[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/nifty50`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching Nifty 50 stocks:", error);
    return [];
  }
}

export async function getHistoricalData(
  symbol: string,
  interval: "daily" | "weekly" | "monthly" = "daily"
): Promise<StockHistoricalData[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/stock/${symbol}/history?interval=${interval}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// AGENT ENDPOINTS (Fetching from FastAPI)
// ---------------------------------------------------------------------------

export async function getNewsAnalysis(symbol: string): Promise<NewsAgentData> {
  const res = await fetch(`${BACKEND_URL}/agent/${symbol}/news`);
  return await res.json();
}

export async function getSentimentAnalysis(symbol: string): Promise<SentimentData> {
  const res = await fetch(`${BACKEND_URL}/agent/${symbol}/sentiment`);
  return await res.json();
}

export async function getTechnicalAnalysis(symbol: string): Promise<TechnicalData> {
  const res = await fetch(`${BACKEND_URL}/agent/${symbol}/technical`);
  return await res.json();
}

export async function getRiskAnalysis(symbol: string): Promise<RiskData> {
  const res = await fetch(`${BACKEND_URL}/agent/${symbol}/risk`);
  return await res.json();
}

export async function getSentinelReport(symbol: string): Promise<ReportData> {
  const res = await fetch(`${BACKEND_URL}/agent/${symbol}/report`);
  return await res.json();
}