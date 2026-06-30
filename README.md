# Sentinel Intelligence Platform

A premium, real-time Indian stock market dashboard powered by **Google Gemini AI**, built with **Next.js**, **FastAPI**, and **LangChain**.

---

## 🚀 Features

### 📊 Dashboard
- Live stock prices for all **Nifty 50** and **Sensex** stocks
- **"View Nifty SENSEX 50 Company"** button to browse all top Indian stocks at once
- **Pinned/Watchlist stocks** displayed prominently on the dashboard
- Auto-refresh with animated loading states

### 🔍 Smart Stock Search
- Instantly search any Indian stock by **company name or ticker symbol**
- Full Nifty 50 local dictionary for fast, reliable autocomplete
- Falls back to Yahoo Finance search for extended coverage (NSE + BSE)
- Clean display — no `.NS` or `.BO` suffixes shown to users

### 📈 Real-Time Stock Data
- 100% accurate live prices via **Yahoo Finance V8 Chart API** (direct HTTP, bypasses rate limits)
- All prices displayed in **₹ (INR)**
- Displays: Price, Change %, Volume, Day High/Low, 52-Week High/Low
- Historical charts with **Daily / Weekly / Monthly** timeframes

### 🌟 Watchlist & Pinning
- Star any stock to pin it to your personal watchlist
- Pinned stocks appear at the top of the dashboard
- Persisted in browser local storage

### 🤖 AI Analysis (Powered by Google Gemini)
Each stock detail page includes a full suite of Gemini-powered AI agents:

| Agent | Description |
|---|---|
| 🗞️ **News Agent** | Scrapes live Google News RSS and asks Gemini to summarise market importance |
| 😊 **Sentiment Agent** | Classifies recent headlines into Positive / Negative / Neutral % |
| 📈 **Technical Agent** | Real **RSI, MACD, SMA20, EMA20** calculated via `pandas-ta` |
| ⚠️ **Risk Agent** | Computes actual price volatility and Gemini classifies market risk |
| 📋 **Sentinel Report** | Full analyst-grade report: outlook, reasons, risks & recommendation |

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (animations)
- **Recharts** (stock charts)

### Backend
- **FastAPI** (Python)
- **LangChain** + **langchain-google-genai**
- **Google Gemini 1.5 Flash** (AI agents)
- **pandas-ta** (technical indicators)
- **BeautifulSoup4** (news scraping)
- **Yahoo Finance V8 API** (live prices)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Clone the repository
```bash
git clone https://github.com/your-username/StockBoard.git
cd StockBoard
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Set up the Python backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Configure your Gemini API Key
Create a file `backend/.env`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```
> Get your free API key at [https://aistudio.google.com](https://aistudio.google.com)

### 5. Start the backend server
```bash
# In the /backend directoryclear

```

### 6. Start the frontend
```bash
# In the root /StockBoard directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
StockBoard/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   └── stocks/[symbol]/      # Stock detail page
│   ├── components/
│   │   ├── trending-stocks.tsx   # Trending + Nifty 50 grid
│   │   ├── stock-card.tsx        # Stock price card
│   │   ├── stock-search.tsx      # Search bar
│   │   └── ui/                   # shadcn UI components
│   ├── context/
│   │   └── stock-context.tsx     # Global watchlist state
│   └── lib/
│       └── api.ts                # API fetching functions
├── backend/
│   ├── main.py                   # FastAPI + Gemini AI agents
│   ├── .env                      # API keys (not committed)
│   └── requirements.txt
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for AI agents | ✅ Yes |

---

## 📝 Notes

- AI analysis (News, Sentiment, Technical, Risk, Report) requires a valid `GEMINI_API_KEY`.
- If the Gemini API is unavailable, all agents fall back gracefully with sensible defaults.
- Stock prices are sourced directly from Yahoo Finance — no third-party subscription needed.
- The app is optimised for **Indian markets (NSE/BSE)**.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.