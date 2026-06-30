"use client"

import { useState } from "react"
import { useStocks } from "@/context/stock-context"
import { StockCard } from "@/components/stock-card"
import { RefreshCw, AlertCircle, Pin, Activity } from "lucide-react"
import { Button, Alert, AlertDescription } from "@/components/ui"
import { motion } from "framer-motion"
import { getNifty50Stocks, getSensexStocks, StockData } from "@/lib/api"
import { PortfolioIntelligence } from "@/components/portfolio-intelligence"

export default function TrendingStocks() {
  const { trendingStocks, watchlistStocks, refreshStocks, isLoading, apiError, resetAndRetryStocks } = useStocks()
  const [nifty50Stocks, setNifty50Stocks] = useState<StockData[]>([])
  const [sensexStocks, setSensexStocks] = useState<StockData[]>([])
  const [isLoadingNifty, setIsLoadingNifty] = useState(false)
  const [isLoadingSensex, setIsLoadingSensex] = useState(false)
  const [showNifty, setShowNifty] = useState(false)
  const [showSensex, setShowSensex] = useState(false)

  const handleToggleNifty = async () => {
    if (showNifty) {
      setShowNifty(false)
      return
    }
    setShowNifty(true)
    if (nifty50Stocks.length === 0) {
      setIsLoadingNifty(true)
      const data = await getNifty50Stocks()
      setNifty50Stocks(data)
      setIsLoadingNifty(false)
    }
  }

  const handleToggleSensex = async () => {
    if (showSensex) {
      setShowSensex(false)
      return
    }
    setShowSensex(true)
    if (sensexStocks.length === 0) {
      setIsLoadingSensex(true)
      const data = await getSensexStocks()
      setSensexStocks(data)
      setIsLoadingSensex(false)
    }
  }
  
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      } 
    }
  }

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  }

  return (
    <div className="space-y-10">
      {/* MARKET INDICES SECTION */}
      <section className="space-y-6 animate-fade-in border-b border-border/40 pb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            variant={showNifty ? "secondary" : "default"} 
            className="flex-1 font-bold text-base py-6 shadow-md transition-all"
            onClick={handleToggleNifty}
          >
            <Activity className="mr-2 h-5 w-5" />
            {showNifty ? "Hide Nifty 50" : "View Nifty 50 Companies"}
          </Button>

          <Button 
            variant={showSensex ? "secondary" : "default"} 
            className="flex-1 font-bold text-base py-6 shadow-md transition-all"
            onClick={handleToggleSensex}
          >
            <Activity className="mr-2 h-5 w-5" />
            {showSensex ? "Hide Sensex 30" : "View Sensex 30 Companies"}
          </Button>
        </div>

        {/* NIFTY 50 CONTENT */}
        {showNifty && (
          <div className="pt-2">
            <h3 className="text-xl font-bold mb-4">Nifty 50 Companies</h3>
            {isLoadingNifty ? (
               <div className="flex justify-center items-center h-40">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground animate-pulse">Fetching live Nifty 50 data...</p>
                </div>
              </div>
            ) : (
              <motion.div
                className="responsive-grid"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {nifty50Stocks.map((stock) => (
                  <motion.div 
                    key={stock.symbol} 
                    variants={item}
                    className="animate-delay-100"
                  >
                    <StockCard stock={stock} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* SENSEX 30 CONTENT */}
        {showSensex && (
          <div className={showNifty ? "pt-8" : "pt-2"}>
            <h3 className="text-xl font-bold mb-4">Sensex 30 Companies</h3>
            {isLoadingSensex ? (
               <div className="flex justify-center items-center h-40">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground animate-pulse">Fetching live Sensex 30 data...</p>
                </div>
              </div>
            ) : (
              <motion.div
                className="responsive-grid"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {sensexStocks.map((stock) => (
                  <motion.div 
                    key={stock.symbol} 
                    variants={item}
                    className="animate-delay-100"
                  >
                    <StockCard stock={stock} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </section>

      {/* PORTFOLIO INTELLIGENCE SECTION */}
      <PortfolioIntelligence symbols={watchlistStocks.map(s => s.symbol)} />

      {/* WATCHLIST SECTION */}
      {watchlistStocks.length > 0 && (
        <section className="space-y-4 md:space-y-6 animate-fade-in">
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative"
            initial="hidden"
            animate="show"
            variants={headerVariants}
          >
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Pin className="h-5 w-5 text-primary" /> Your Pinned Stocks
            </h2>
          </motion.div>

          <motion.div
            className="responsive-grid"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {watchlistStocks.map((stock, index) => (
              <motion.div 
                key={stock.symbol} 
                variants={item}
                className="animate-delay-100"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <StockCard stock={stock} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* TRENDING SECTION */}
      <section className="space-y-4 md:space-y-6 animate-fade-in">
        <motion.div 
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative"
          initial="hidden"
          animate="show"
          variants={headerVariants}
        >
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Trending in India</h2>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => apiError ? resetAndRetryStocks() : refreshStocks()}
              disabled={isLoading && !apiError}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading && !apiError ? "animate-spin" : ""}`} />
              {apiError ? "Retry Connection" : "Refresh"}
            </Button>
          </motion.div>
          
          {isLoading && !apiError && trendingStocks.length > 0 && (
            <span className="absolute right-0 top-full text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <span className="animate-spin h-2 w-2 border-b-2 border-primary rounded-full inline-block" />
              Refreshing...
            </span>
          )}
        </motion.div>

        {apiError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to connect to the stock API. Please check your connection or try again later.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && trendingStocks.length === 0 && !apiError && (
          <div className="flex justify-center items-center h-40">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Loading trending stocks...</p>
            </div>
          </div>
        )}

        {!isLoading && trendingStocks.length === 0 && !apiError ? (
          <motion.div 
            className="flex justify-center items-center h-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No trending stocks available</p>
              <Button onClick={() => refreshStocks()}>Retry Loading Stocks</Button>
            </div>
          </motion.div>
        ) : (
          (trendingStocks.length > 0 || apiError) && (
            <motion.div
              className="responsive-grid"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {trendingStocks.map((stock, index) => (
                <motion.div 
                  key={stock.symbol} 
                  variants={item}
                  className="animate-delay-100"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <StockCard stock={stock} />
                </motion.div>
              ))}
            </motion.div>
          )
        )}
      </section>
    </div>
  )
} 