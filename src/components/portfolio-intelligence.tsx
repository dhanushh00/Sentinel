"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BrainCircuit, TrendingUp, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPortfolioAnalysis, type PortfolioData } from "@/lib/api"

interface PortfolioIntelligenceProps {
  symbols: string[]
}

const riskColors: Record<string, string> = {
  Low: "text-green-500 bg-green-500/10 border-green-500/30",
  Medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  High: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  "Very High": "text-red-500 bg-red-500/10 border-red-500/30",
  "N/A": "text-muted-foreground bg-muted border-border",
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="rotate-[-90deg]" width="96" height="96">
        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
        <motion.circle
          cx="48" cy="48" r={radius}
          stroke={color} strokeWidth="8" fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <p className="text-xs text-muted-foreground -mt-1">/ 100</p>
      </div>
    </div>
  )
}

export function PortfolioIntelligence({ symbols }: PortfolioIntelligenceProps) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (isExpanded && data) {
      setIsExpanded(false)
      return
    }
    setIsExpanded(true)
    if (data) return // already fetched, just toggle

    if (symbols.length === 0) {
      setError("Add stocks to your watchlist first to analyze your portfolio.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPortfolioAnalysis(symbols)
      setData(result)
    } catch {
      setError("Could not connect to backend. Make sure the server is running.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="space-y-4 animate-fade-in border-b border-border/40 pb-8">
      <Button
        variant={isExpanded ? "secondary" : "default"}
        className="w-full sm:w-auto font-bold text-base py-6 shadow-md transition-all"
        onClick={handleAnalyze}
        disabled={isLoading}
      >
        <BrainCircuit className={`mr-2 h-5 w-5 ${isLoading ? "animate-pulse" : ""}`} />
        {isLoading ? "Analyzing Portfolio..." : isExpanded ? "Hide Portfolio Analysis" : "Analyze My Portfolio (AI)"}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="portfolio-content"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>
            )}

            {isLoading && (
              <Card className="bg-muted/20 animate-pulse">
                <CardContent className="pt-6 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-5 bg-muted rounded w-1/2" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            )}

            {data && !isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Diversification Score */}
                <Card className="bg-muted/20 flex flex-col items-center justify-center p-6 gap-3">
                  <ScoreRing score={data.diversification_score} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Diversification</p>
                    <Badge variant="outline" className={`mt-1 ${riskColors[data.risk_level] || ""}`}>
                      {data.risk_level} Risk
                    </Badge>
                  </div>
                </Card>

                {/* AI Analysis */}
                <Card className="bg-muted/20 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-primary" /> AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.analysis}</p>

                    {/* Sector Breakdown */}
                    {Object.keys(data.sector_breakdown).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector Exposure</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(data.sector_breakdown).map(([sector, pct]) => (
                            <div key={sector} className="text-xs flex justify-between items-center bg-muted/30 rounded-md px-3 py-2">
                              <span className="font-medium truncate">{sector}</span>
                              <Badge variant="outline" className="ml-2 text-xs">{pct}%</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {data.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" /> Suggestions
                        </p>
                        <ul className="space-y-1">
                          {data.suggestions.map((s, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-0.5">→</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
