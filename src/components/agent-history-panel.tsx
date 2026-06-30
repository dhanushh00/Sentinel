"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ChevronRight, Trash2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PipelineRunRecord, clearPipelineHistory } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AgentHistoryPanelProps {
  history: PipelineRunRecord[]
  selectedRunId: string | null
  onSelectRun: (run: PipelineRunRecord) => void
  onClear: () => void
}

const outlookColor: Record<string, string> = {
  Bullish: "bg-green-500/15 text-green-500 border-green-500/30",
  "Moderately Bullish": "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Neutral: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  "Moderately Bearish": "bg-orange-500/15 text-orange-500 border-orange-500/30",
  Bearish: "bg-red-500/15 text-red-500 border-red-500/30",
}

function formatRelative(isoStr: string): string {
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
  } catch {
    return ""
  }
}

export function AgentHistoryPanel({
  history,
  selectedRunId,
  onSelectRun,
  onClear,
}: AgentHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (history.length === 0) {
    return (
      <div className="border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center min-h-[120px]">
        <History className="w-6 h-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No runs yet.</p>
        <p className="text-xs text-muted-foreground/60">Run the pipeline above to start building history.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Run History</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {history.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              clearPipelineHistory()
              onClear()
            }}
            title="Clear history"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {/* Run list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="history-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {history.map((run, idx) => (
                <motion.button
                  key={run.run_id}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors",
                    selectedRunId === run.run_id && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onClick={() => onSelectRun(run)}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {run.symbol.replace(/\.(NS|BO)$/i, "")}
                        <span className="text-muted-foreground font-normal text-[10px] ml-1">
                          {run.symbol.match(/\.(NS|BO)$/i)?.[0]}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1.5",
                            outlookColor[run.outlook] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {run.outlook}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{run.confidence}%</span>
                        {run.mode === "quick" && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 opacity-60">
                            quick
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatRelative(run.timestamp)}
                    </div>
                  </div>
                  {run.errors.length > 0 && (
                    <p className="text-[10px] text-red-500/80 mt-1">
                      {run.errors.length} agent error{run.errors.length > 1 ? "s" : ""}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
