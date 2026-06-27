"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquareQuote } from "lucide-react"
import type { SentimentData } from "@/lib/api"
import { motion } from "framer-motion"

interface AgentSentimentProps {
  data: SentimentData | null
  isLoading: boolean
}

export function AgentSentiment({ data, isLoading }: AgentSentimentProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-purple-500" />
            Sentiment Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div className="h-2 bg-muted rounded w-full"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
            <div className="h-4 bg-muted rounded w-8"></div>
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
      transition={{ duration: 0.5, delay: 0.1 }}
      className="h-full"
    >
      <Card className="h-full border-purple-500/20 shadow-md hover:shadow-purple-500/10 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareQuote className="h-5 w-5 text-purple-500" />
              Sentiment Agent
            </CardTitle>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20">
              Active
            </Badge>
          </div>
          <CardDescription>NLP analysis of recent headlines & articles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="w-full h-4 bg-secondary rounded-full overflow-hidden flex">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${data.positive}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-green-500" 
              title={`Positive: ${data.positive}%`}
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${data.neutral}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-gray-400" 
              title={`Neutral: ${data.neutral}%`}
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${data.negative}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              className="h-full bg-red-500" 
              title={`Negative: ${data.negative}%`}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="flex flex-col items-center p-2 rounded bg-green-500/10 border border-green-500/20">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Positive</span>
              <span className="font-bold text-green-500 text-lg">{data.positive}%</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded bg-gray-500/10 border border-gray-500/20">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Neutral</span>
              <span className="font-bold text-gray-500 text-lg">{data.neutral}%</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded bg-red-500/10 border border-red-500/20">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Negative</span>
              <span className="font-bold text-red-500 text-lg">{data.negative}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
