"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { NewsAgentData } from "@/lib/api"
import { motion } from "framer-motion"

interface AgentNewsProps {
  data: NewsAgentData | null
  isLoading: boolean
}

export function AgentNews({ data, isLoading }: AgentNewsProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-blue-500" />
            News Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="h-full border-blue-500/20 shadow-md hover:shadow-blue-500/10 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Newspaper className="h-5 w-5 text-blue-500" />
              News Agent
            </CardTitle>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
              Active
            </Badge>
          </div>
          <CardDescription>Latest financial news and events summarization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-md border text-sm leading-relaxed">
            {'“'}{data.summary}{'”'}
          </div>
          <div className="flex gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Importance</p>
              <Badge variant={data.importance === "High" ? "destructive" : data.importance === "Medium" ? "default" : "secondary"}>
                {data.importance}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Market Impact</p>
              <div className="flex items-center gap-1 font-medium text-sm">
                {data.marketImpact === "Positive" && <TrendingUp className="h-4 w-4 text-green-500" />}
                {data.marketImpact === "Negative" && <TrendingDown className="h-4 w-4 text-red-500" />}
                {data.marketImpact === "Neutral" && <Minus className="h-4 w-4 text-gray-500" />}
                <span className={
                  data.marketImpact === "Positive" ? "text-green-500" :
                  data.marketImpact === "Negative" ? "text-red-500" :
                  "text-gray-500"
                }>
                  {data.marketImpact}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
