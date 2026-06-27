"use client"

import { useEffect, useState } from "react"
import { useStocks } from "@/context/stock-context"
import { getStockQuote, StockData } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { usePathname } from "next/navigation"

export function WatchlistSidebar() {
  const { watchlist, removeFromWatchlist } = useStocks()
  const [stocks, setStocks] = useState<StockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const fetchWatchlist = async () => {
      setIsLoading(true)
      const data = await Promise.all(
        watchlist.map(symbol => getStockQuote(symbol))
      )
      setStocks(data.filter(Boolean) as StockData[])
      setIsLoading(false)
    }

    if (watchlist.length > 0) {
      fetchWatchlist()
    } else {
      setStocks([])
      setIsLoading(false)
    }
  }, [watchlist])

  if (isLoading) {
    return (
      <div className="space-y-2 p-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-muted rounded-md" />
        ))}
      </div>
    )
  }

  if (watchlist.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground mt-10">
        Your watchlist is empty. Search for a stock to add it.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <AnimatePresence>
        {stocks.map((stock) => {
          const isPositive = stock.change >= 0
          const isActive = pathname === `/stocks/${stock.symbol}`
          
          return (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={`group flex items-center justify-between p-3 border-b text-sm transition-colors hover:bg-accent cursor-pointer ${isActive ? 'bg-accent border-l-2 border-l-primary' : ''}`}
            >
              <Link href={`/stocks/${stock.symbol}`} className="flex-1">
                <div className="font-semibold">{stock.symbol.replace('.NS', '')}</div>
              </Link>
              <div className="flex flex-col items-end">
                <div className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {stock.price.toFixed(2)}
                </div>
                <div className={`text-[10px] flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(stock.changePercent).toFixed(2)}%
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFromWatchlist(stock.symbol)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
