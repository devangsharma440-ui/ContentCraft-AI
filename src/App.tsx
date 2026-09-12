import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Dashboard } from '@/components/Dashboard'
import { ContentWriter } from '@/components/ContentWriter'
import { LinkedInGenerator } from '@/components/LinkedInGenerator'
import { RewriteTool } from '@/components/RewriteTool'
import { SEOTool } from '@/components/SEOTool'
import { YouTubeTool } from '@/components/YouTubeTool'
import { History, type HistoryItem } from '@/components/History'
import { Settings } from '@/components/Settings'
import { Landing } from '@/components/Landing'
import { UpgradeModal } from '@/components/UpgradeModal'
import { apiFetch, type UsageState } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  Pen, Linkedin, RefreshCw, Search, Youtube,
  History as HistoryIcon, Moon, Sun, Menu, LayoutDashboard, SettingsIcon,
  Zap, Sparkles, Shield
} from 'lucide-react'

type View = 'landing' | 'dashboard' | 'writer' | 'linkedin' | 'rewrite' | 'seo' | 'youtube' | 'history' | 'settings'

const navItems: { id: View; label: string; icon: typeof Pen }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'writer', label: 'AI Writer', icon: Pen },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'rewrite', label: 'Rewrite', icon: RefreshCw },
  { id: 'seo', label: 'SEO Writer', icon: Search },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contentcraft-dark')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [sheetOpen, setSheetOpen] = useState(false)

  const fetchUsage = useCallback(async () => {
    try {
      const res = await apiFetch('/api/plan/usage')
      const data = await res.json()
      if (data.success) {
        setUsage(data)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('contentcraft-dark', String(dark))
  }, [dark])

  const handleUsageUpdate = useCallback((newUsage: Partial<UsageState>) => {
    setUsage((prev) => (prev ? { ...prev, ...newUsage } : (newUsage as UsageState)))
  }, [])

  const saveToHistory = useCallback((item: { title: string; content: string; type: string }) => {
    const historyItem: HistoryItem = {
      id: crypto.randomUUID(),
      title: item.title,
      content: item.content,
      type: item.type,
      date: new Date().toISOString(),
    }
    const maxHistory = usage?.plan === 'pro' ? 1000 : 15
    const existing = JSON.parse(localStorage.getItem('contentcraft-history') || '[]')
    existing.unshift(historyItem)
    localStorage.setItem('contentcraft-history', JSON.stringify(existing.slice(0, maxHistory)))
  }, [usage?.plan])

  const renderView = () => {
    switch (view) {
      case 'landing':
        return <Landing onStart={() => setView('dashboard')} />
      case 'dashboard':
        return <Dashboard onNavigate={(id) => setView(id as View)} />
      case 'writer':
        return <ContentWriter onSave={saveToHistory} usage={usage} onUsageUpdate={handleUsageUpdate} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'linkedin':
        return <LinkedInGenerator onSave={saveToHistory} usage={usage} onUsageUpdate={handleUsageUpdate} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'rewrite':
        return <RewriteTool onSave={saveToHistory} usage={usage} onUsageUpdate={handleUsageUpdate} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'seo':
        return <SEOTool onSave={saveToHistory} usage={usage} onUsageUpdate={handleUsageUpdate} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'youtube':
        return <YouTubeTool onSave={saveToHistory} usage={usage} onUsageUpdate={handleUsageUpdate} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'history':
        return <History isPro={usage?.plan === 'pro'} onUpgradeClick={() => setUpgradeOpen(true)} />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={(id) => setView(id as View)} />
    }
  }

  const isPro = usage?.plan === 'pro'
  const used = usage?.used || 0
  const limit = usage?.limit || 30
  const remaining = Math.max(0, limit - used)
  const usagePercentage = Math.min(100, Math.round((used / limit) * 100))

  const PlanWidget = () => (
    <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isPro ? (
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          ) : (
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-xs text-foreground">
            {isPro ? 'Pro Plan' : 'Free Plan'}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 font-medium ${
            isPro
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isPro ? 'PRO' : 'FREE'}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{used} / {limit} used</span>
          <span className="font-medium text-foreground">{remaining} left</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isPro
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : usagePercentage > 85
                ? 'bg-red-500'
                : 'bg-primary'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        <span>{isPro ? '⚡ Priority AI processing' : 'Standard processing'}</span>
      </div>

      {!isPro ? (
        <Button
          size="sm"
          className="w-full h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-xs"
          onClick={() => setUpgradeOpen(true)}
        >
          <Zap className="h-3 w-3 mr-1 fill-white" /> Upgrade to Pro
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-[11px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          onClick={() => setUpgradeOpen(true)}
        >
          Plan Details
        </Button>
      )}
    </div>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          ✨ ContentCraft
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">AI Content Writer</p>
      </div>
      <Separator className="my-2" />
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={view === item.id ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start gap-2.5 h-9', view === item.id && 'font-semibold')}
              onClick={() => { setView(item.id); setSheetOpen(false) }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <Separator className="my-2" />
      <div className="p-3 space-y-2">
        <PlanWidget />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r">
        <div className="flex grow flex-col overflow-y-auto">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-md hover:bg-accent hover:text-accent-foreground">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <span className="font-bold">✨ ContentCraft</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex items-center gap-1"
            onClick={() => setUpgradeOpen(true)}
          >
            {isPro ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0 border-none">
                ⚡ Pro ({remaining})
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {remaining} left
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Upgrade & Plan Modal */}
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentUsage={usage}
        onPlanChanged={(newUsage) => setUsage(newUsage)}
      />
    </div>
  )
}
