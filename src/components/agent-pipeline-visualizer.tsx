"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Circle, Loader2, XCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type AgentStatus = "idle" | "running" | "done" | "error" | "skipped"

export interface AgentNode {
  id: string
  label: string
  description: string
  status: AgentStatus
}

interface AgentPipelineVisualizerProps {
  agents: AgentNode[]
  isRunning: boolean
}

const statusConfig: Record<AgentStatus, { color: string; ring: string; icon: React.ReactNode }> = {
  idle: {
    color: "bg-muted text-muted-foreground border-muted-foreground/30",
    ring: "",
    icon: <Circle className="w-4 h-4" />,
  },
  running: {
    color: "bg-primary/10 text-primary border-primary",
    ring: "ring-4 ring-primary/20",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  done: {
    color: "bg-green-500/10 text-green-500 border-green-500",
    ring: "",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  error: {
    color: "bg-red-500/10 text-red-500 border-red-500",
    ring: "",
    icon: <XCircle className="w-4 h-4" />,
  },
  skipped: {
    color: "bg-muted/50 text-muted-foreground/50 border-muted-foreground/20",
    ring: "",
    icon: <Circle className="w-4 h-4 opacity-40" />,
  },
}

export function AgentPipelineVisualizer({ agents, isRunning }: AgentPipelineVisualizerProps) {
  return (
    <div className="w-full py-4">
      {/* Desktop: horizontal flow */}
      <div className="hidden sm:flex items-center justify-center gap-0 flex-wrap">
        {agents.map((agent, idx) => {
          const cfg = statusConfig[agent.status]
          return (
            <div key={agent.id} className="flex items-center">
              {/* Agent node */}
              <motion.div
                className={cn(
                  "relative flex flex-col items-center gap-1.5 border rounded-xl px-4 py-3 min-w-[90px] transition-all duration-300",
                  cfg.color,
                  cfg.ring
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                {/* Pulse glow when running */}
                {agent.status === "running" && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                )}
                {/* Done sparkle flash */}
                {agent.status === "done" && (
                  <AnimatePresence>
                    <motion.div
                      key="done-flash"
                      className="absolute inset-0 rounded-xl bg-green-500/20"
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </AnimatePresence>
                )}
                <div className="relative z-10 flex items-center gap-1.5 text-sm font-semibold">
                  {cfg.icon}
                  {agent.label}
                </div>
                <p className="relative z-10 text-[10px] text-center leading-tight opacity-70 max-w-[80px]">
                  {agent.description}
                </p>
              </motion.div>

              {/* Arrow connector (not after last) */}
              {idx < agents.length - 1 && (
                <motion.div
                  className="flex items-center mx-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.08 + 0.2 }}
                >
                  <ArrowRight
                    className={cn(
                      "w-4 h-4 transition-colors duration-300",
                      agents[idx + 1].status !== "idle" ? "text-primary" : "text-muted-foreground/30"
                    )}
                  />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex sm:hidden flex-col items-center gap-2">
        {agents.map((agent, idx) => {
          const cfg = statusConfig[agent.status]
          return (
            <div key={agent.id} className="flex flex-col items-center w-full max-w-xs">
              <motion.div
                className={cn(
                  "w-full flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-all duration-300",
                  cfg.color,
                  cfg.ring
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                {cfg.icon}
                <div>
                  <p className="text-sm font-semibold">{agent.label}</p>
                  <p className="text-[10px] opacity-70">{agent.description}</p>
                </div>
              </motion.div>
              {idx < agents.length - 1 && (
                <div className="h-4 w-px bg-border my-0.5" />
              )}
            </div>
          )
        })}
      </div>

      {/* Running indicator */}
      {isRunning && (
        <motion.p
          className="text-center text-xs text-muted-foreground mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Pipeline running — agents are passing state through the graph…
        </motion.p>
      )}
    </div>
  )
}
