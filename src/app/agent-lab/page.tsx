"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Play, Zap, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SiteWrapper } from "@/components/site-wrapper"
import { StockProvider } from "@/context/stock-context"
import {
  AgentPipelineVisualizer,
  AgentNode,
  AgentStatus,
} from "@/components/agent-pipeline-visualizer"
import { AgentHistoryPanel } from "@/components/agent-history-panel"
import { AgentNews } from "@/components/agent-news"
import { AgentSentiment } from "@/components/agent-sentiment"
import { AgentTechnical } from "@/components/agent-technical"
import { AgentRisk } from "@/components/agent-risk"
import { SentinelReport } from "@/components/sentinel-report"
import {
  getSentinelPipeline,
  savePipelineRun,
  getPipelineHistory,
  PipelineData,
  PipelineRunRecord,
} from "@/lib/api"

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------

const AGENT_SEQUENCE = ["planner", "news", "sentiment", "technical", "risk", "report"] as const

const INITIAL_AGENTS: AgentNode[] = [
  { id: "planner", label: "Planner", description: "Orchestrates pipeline", status: "idle" },
  { id: "news", label: "News", description: "Fetch & summarise", status: "idle" },
  { id: "sentiment", label: "Sentiment", description: "Classify sentiment", status: "idle" },
  { id: "technical", label: "Technical", description: "RSI, MACD, trend", status: "idle" },
  { id: "risk", label: "Risk", description: "Volatility & risk", status: "idle" },
  { id: "report", label: "Report", description: "Final synthesis", status: "idle" },
]

const QUICK_SKIP = new Set(["news", "sentiment"])

// Simulated per-agent latencies (ms) for the animation timeline
const AGENT_DELAY: Record<string, number> = {
  planner: 600,
  news: 8000,
  sentiment: 7000,
  technical: 4000,
  risk: 3500,
  report: 5000,
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function AgentLabContent() {
  const [symbol, setSymbol] = useState("")
  const [mode, setMode] = useState<"full" | "quick">("full")
  const [isRunning, setIsRunning] = useState(false)
  const [agents, setAgents] = useState<AgentNode[]>(INITIAL_AGENTS)
  const [result, setResult] = useState<PipelineData | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [history, setHistory] = useState<PipelineRunRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(getPipelineHistory())
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines])

  const addLog = (msg: string) =>
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const setAgentStatus = (id: string, status: AgentStatus) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    )
  }

  const runPipeline = async () => {
    const sym = symbol.trim().toUpperCase()
    if (!sym) return

    setIsRunning(true)
    setError(null)
    setResult(null)
    setSelectedRunId(null)
    setLogLines([])
    setAgents(INITIAL_AGENTS.map((a) => ({ ...a, status: "idle" })))

    addLog(`Starting ${mode} pipeline for ${sym}…`)

    // ---- Animate the planner node immediately ----
    setAgentStatus("planner", "running")
    addLog("Planner agent: analysing request and routing agents…")

    // Start the real API call (runs all agents on server)
    const pipelinePromise = getSentinelPipeline(sym, mode)

    // ---- Animate remaining agent nodes sequentially ----
    let accDelay = AGENT_DELAY["planner"]
    for (const agentId of AGENT_SEQUENCE.slice(1)) {
      const isSkipped = mode === "quick" && QUICK_SKIP.has(agentId)
      await new Promise((r) => setTimeout(r, accDelay))
      if (isSkipped) {
        setAgentStatus(agentId, "skipped")
        addLog(`${capitalize(agentId)} agent: skipped (quick mode)`)
      } else {
        setAgentStatus("planner", "done")
        setAgentStatus(agentId, "running")
        addLog(`${capitalize(agentId)} agent: running…`)
      }
      accDelay = isSkipped ? 300 : AGENT_DELAY[agentId] ?? 4000
    }

    // ---- Await real result ----
    try {
      const data = await pipelinePromise

      // Mark all non-skipped as done (or error if in errors list)
      const errorAgents = new Set(
        (data.errors ?? [])
          .map((e: string) => e.match(/\[(\w+)Agent\]/)?.[1]?.toLowerCase())
          .filter(Boolean)
      )

      setAgents((prev) =>
        prev.map((a) => {
          if (a.status === "skipped") return a
          return { ...a, status: errorAgents.has(a.id) ? "error" : "done" }
        })
      )

      data.errors?.forEach((e: string) => addLog(`⚠ ${e}`))
      addLog(`Pipeline complete — run_id: ${data.run_id}`)

      setResult(data)
      setSelectedRunId(data.run_id)

      // Save to localStorage history
      const record: PipelineRunRecord = {
        run_id: data.run_id,
        symbol: sym,
        timestamp: data.timestamp,
        mode: data.mode,
        outlook: data.report?.outlook ?? "Neutral",
        confidence: data.report?.confidence ?? 60,
        agents_run: data.agents_run,
        errors: data.errors,
        data,
      }
      savePipelineRun(record)
      setHistory(getPipelineHistory())
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed"
      setError(msg)
      addLog(`✖ Error: ${msg}`)
      setAgents((prev) =>
        prev.map((a) =>
          a.status === "running" ? { ...a, status: "error" } : a
        )
      )
    } finally {
      setIsRunning(false)
    }
  }

  const restoreRun = (run: PipelineRunRecord) => {
    setResult(run.data)
    setSelectedRunId(run.run_id)
    setAgents(
      INITIAL_AGENTS.map((a) => ({
        ...a,
        status: run.agents_run.includes(a.id)
          ? "done"
          : run.data.mode === "quick" && QUICK_SKIP.has(a.id)
          ? "skipped"
          : a.id === "planner"
          ? "done"
          : "idle",
      }))
    )
    setLogLines([`[restored] Run ${run.run_id} for ${run.symbol} from ${new Date(run.timestamp).toLocaleString()}`])
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agent Lab</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              LangGraph
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
            Run the full Sentinel multi-agent pipeline. Watch each AI agent pass state through the
            LangGraph workflow in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Planner → News → Sentiment → Technical → Risk → Report</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left col: Controls + Visualizer + Log ---- */}
        <div className="lg:col-span-2 space-y-5">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="border rounded-xl p-4 space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter symbol — e.g. TCS.NS, RELIANCE.NS"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isRunning && runPipeline()}
                className="flex-1"
                disabled={isRunning}
              />
              <div className="flex gap-2 shrink-0">
                <Tabs
                  value={mode}
                  onValueChange={(v) => setMode(v as "full" | "quick")}
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="full" className="text-xs px-3" disabled={isRunning}>
                      Full
                    </TabsTrigger>
                    <TabsTrigger value="quick" className="text-xs px-3" disabled={isRunning}>
                      Quick
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={runPipeline}
                        disabled={isRunning || !symbol.trim()}
                        className="gap-2"
                      >
                        {isRunning ? (
                          <>
                            <Zap className="w-4 h-4 animate-pulse" />
                            Running…
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Run
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        <b>Full</b>: all 5 agents (slow, thorough)
                        <br />
                        <b>Quick</b>: technical + report only (faster)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Mode description */}
            <p className="text-xs text-muted-foreground">
              {mode === "full"
                ? "Full mode: Planner → News → Sentiment → Technical → Risk → Report (all 5 agents)"
                : "Quick mode: Planner → Technical → Risk → Report (skips news & sentiment for speed)"}
            </p>
          </motion.div>

          {/* Pipeline Visualizer */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border rounded-xl p-4"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Agent Graph
            </p>
            <AgentPipelineVisualizer agents={agents} isRunning={isRunning} />
          </motion.div>

          {/* Agent Log */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="border rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Agent Log
              </p>
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setLogLines([])}
              >
                Clear
              </button>
            </div>
            <div
              ref={logRef}
              className="font-mono text-[11px] leading-relaxed p-4 h-28 overflow-y-auto bg-muted/10 text-muted-foreground"
            >
              {logLines.length === 0 ? (
                <span className="opacity-40">Waiting for pipeline run…</span>
              ) : (
                logLines.map((line, i) => (
                  <div key={i} className={line.includes("✖") ? "text-red-500" : line.includes("⚠") ? "text-yellow-500" : ""}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 rounded-xl p-3 text-sm text-red-500"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Pipeline error</p>
                  <p className="text-xs opacity-80 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                key={result.run_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Run meta banner */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span>
                    Run <span className="font-mono text-foreground">{result.run_id}</span> ·{" "}
                    {result.symbol} ·{" "}
                    {new Date(result.timestamp).toLocaleString()} ·{" "}
                    Agents: {result.agents_run.join(", ")}
                  </span>
                </div>

                {/* Agent output cards */}
                {(result.news || result.sentiment) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.news && <AgentNews data={result.news} isLoading={false} />}
                    {result.sentiment && <AgentSentiment data={result.sentiment} isLoading={false} />}
                  </div>
                )}
                {(result.technical || result.risk) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.technical && <AgentTechnical data={result.technical} isLoading={false} />}
                    {result.risk && <AgentRisk data={result.risk} isLoading={false} />}
                  </div>
                )}
                {result.report && (
                  <SentinelReport symbol={result.symbol} data={result.report} isLoading={false} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---- Right col: History ---- */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18 }}
          className="space-y-4"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Memory — Past Runs
            </p>
            <AgentHistoryPanel
              history={history}
              selectedRunId={selectedRunId}
              onSelectRun={(run) => {
                restoreRun(run)
              }}
              onClear={() => setHistory([])}
            />
          </div>

          {/* Graph info box */}
          <div className="border rounded-xl p-4 space-y-3 bg-muted/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              About This Pipeline
            </p>
            {[
              { label: "Framework", value: "LangGraph (StateGraph)" },
              { label: "State", value: "AgentState TypedDict" },
              { label: "Agents", value: "5 + Planner" },
              { label: "LLM", value: "Gemini 1.5 Flash" },
              { label: "Memory", value: "localStorage (10 runs)" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground/80">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AgentLabPage() {
  return (
    <StockProvider>
      <SiteWrapper>
        <AgentLabContent />
      </SiteWrapper>
    </StockProvider>
  )
}
