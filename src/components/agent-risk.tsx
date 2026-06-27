"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert } from "lucide-react"
import type { RiskData } from "@/lib/api"
import { motion } from "framer-motion"

interface AgentRiskProps {
  data: RiskData | null
  isLoading: boolean
}

export function AgentRisk({ data, isLoading }: AgentRiskProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Risk Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-full"
    >
      <Card className="h-full border-red-500/20 shadow-md hover:shadow-red-500/10 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Risk Agent
            </CardTitle>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
              Active
            </Badge>
          </div>
          <CardDescription>Volatility and market risk assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-sm font-medium text-muted-foreground">Volatility</span>
              <Badge variant={data.volatility === "High" ? "destructive" : data.volatility === "Moderate" ? "default" : "secondary"}>
                {data.volatility}
              </Badge>
            </div>
            <div className="flex justify-between items-center border-b pb-3">
              <span className="text-sm font-medium text-muted-foreground">Market Risk</span>
              <span className="font-semibold">{data.marketRisk}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${data.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{data.confidence}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
