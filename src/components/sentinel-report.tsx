"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BrainCircuit, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import type { ReportData } from "@/lib/api"
import { motion } from "framer-motion"

interface SentinelReportProps {
  symbol: string
  data: ReportData | null
  isLoading: boolean
}

export function SentinelReport({ symbol, data, isLoading }: SentinelReportProps) {
  if (isLoading) {
    return (
      <Card className="w-full mt-6 bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
            Generating Sentinel Report...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-20 bg-muted rounded w-full"></div>
          <div className="h-32 bg-muted rounded w-full"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null;

  const outlookColors = {
    "Bullish": "text-green-500 border-green-500/30 bg-green-500/10",
    "Moderately Bullish": "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    "Neutral": "text-gray-500 border-gray-500/30 bg-gray-500/10",
    "Moderately Bearish": "text-orange-500 border-orange-500/30 bg-orange-500/10",
    "Bearish": "text-red-500 border-red-500/30 bg-red-500/10",
  }

  const badgeColor = outlookColors[data.outlook as keyof typeof outlookColors] || "text-primary border-primary/30 bg-primary/10"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="w-full mt-8"
    >
      <Card className="w-full border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -z-10" />
        <CardHeader className="border-b bg-card/50 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BrainCircuit className="h-7 w-7 text-primary" />
                Sentinel Final Report
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Synthesized analysis for {symbol}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Outlook</span>
              <div className={`px-4 py-1.5 rounded-full border font-bold text-lg ${badgeColor}`}>
                {data.outlook}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Key Drivers
                </h4>
                <ul className="space-y-2">
                  {data.reasons.map((reason, idx) => (
                    <motion.li 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + (idx * 0.1) }}
                      className="text-sm bg-accent/30 p-2.5 rounded border-l-2 border-green-500"
                    >
                      {reason}
                    </motion.li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Identified Risks
                </h4>
                <ul className="space-y-2">
                  {data.risks.map((risk, idx) => (
                    <motion.li 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + (idx * 0.1) }}
                      className="text-sm bg-accent/30 p-2.5 rounded border-l-2 border-orange-500"
                    >
                      {risk}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Recommendation
                </h4>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm leading-relaxed">
                  {data.recommendation}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">AI Consensus Confidence</span>
                  <span className="text-lg font-bold">{data.confidence}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.confidence}%` }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="h-full bg-primary" 
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Note: This report is generated by Sentinel AI Agents and does not constitute guaranteed financial predictions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
