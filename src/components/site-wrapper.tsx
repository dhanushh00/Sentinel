"use client"

import { ReactNode } from "react"
import { Navbar } from "@/components/navbar"
import { WatchlistSidebar } from "@/components/watchlist-sidebar"
import { StockSearch } from "@/components/stock-search"

interface SiteWrapperProps {
  children: ReactNode
}

export function SiteWrapper({ children }: SiteWrapperProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Left Sidebar (Zerodha Kite style) */}
        <aside className="w-80 border-r bg-card flex-col hidden md:flex h-full shadow-sm z-10">
          <div className="p-3 border-b bg-muted/10">
            <StockSearch />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <WatchlistSidebar />
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/5 relative">
          <div className="container py-6 md:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}