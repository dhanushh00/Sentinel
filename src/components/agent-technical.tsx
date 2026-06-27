"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import type { TechnicalData } from "@/lib/api"
import { motion } from "framer-motion"

interface AgentTechnicalProps {
  data: TechnicalData | null
  isLoading: boolean
}

export function AgentTechnical({ data, isLoading }: AgentTechnicalProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Technical Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full"
    >
      <Card className="h-full border-orange-500/20 shadow-md hover:shadow-orange-500/10 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-orange-500" />
              Technical Agent
            </CardTitle>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">
              Active
            </Badge>
          </div>
          <CardDescription>Mathematical indicators and pattern recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
              <div className="text-lg font-semibold">{data.rsi.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {data.rsi > 70 ? "Overbought" : data.rsi < 30 ? "Oversold" : "Neutral"}
              </div>
            </div>
            <div className="p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">MACD</div>
              <div className={`text-lg font-semibold ${data.macd === "Bullish" ? "text-green-500" : "text-red-500"}`}>
                {data.macd}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Convergence/Divergence</div>
            </div>
            <div className="p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Moving Averages</div>
              <div className="text-sm font-medium">SMA: {data.sma.toFixed(2)}</div>
              <div className="text-sm font-medium mt-0.5">EMA: {data.ema.toFixed(2)}</div>
            </div>
            <div className="p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
              <div className="text-xs text-muted-foreground mb-1">Overall Trend</div>
              <div className={`text-lg font-semibold ${
                data.trend === "Uptrend" ? "text-green-500" : 
                data.trend === "Downtrend" ? "text-red-500" : "text-yellow-500"
              }`}>
                {data.trend}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
