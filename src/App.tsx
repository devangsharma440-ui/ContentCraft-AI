import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Dashboard } from '@/components/Dashboard'
import { ContentWriter } from '@/components/ContentWriter'
import { LinkedInGenerator } from '@/components/LinkedInGenerator'
import { RewriteTool } from '@/components/RewriteTool'
import { SEOTool } from '@/components/SEOTool'
import { YouTubeTool } from '@/components/YouTubeTool'
import { History, type HistoryItem } from '@/components/History'
import { Settings } from '@/components/Settings'
import { cn } from '@/lib/cn'
import {
  Pen, Linkedin, RefreshCw, Search, Youtube,
  History as HistoryIcon, Moon, Sun, Menu, LayoutDashboard, SettingsIcon
} from 'lucide-react'

type View = 'dashboard' | 'writer' | 'linkedin' | 'rewrite' | 'seo' | 'youtube' | 'history' | 'settings'

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
  const [view, setView] = useState<View>('dashboard')
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contentcraft-dark')
      if (saved !== null) return saved === 'true'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('contentcraft-dark', String(dark))
  }, [dark])

  const saveToHistory = useCallback((item: { title: string; content: string; type: string }) => {
    const historyItem: HistoryItem = {
      id: crypto.randomUUID(),
      title: item.title,
      content: item.content,
      type: item.type,
      date: new Date().toISOString(),
    }
    const existing = JSON.parse(localStorage.getItem('contentcraft-history') || '[]')
    existing.unshift(historyItem)
    localStorage.setItem('contentcraft-history', JSON.stringify(existing))
  }, [])

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard onNavigate={(id) => setView(id as View)} />
      case 'writer': return <ContentWriter onSave={saveToHistory} />
      case 'linkedin': return <LinkedInGenerator onSave={saveToHistory} />
      case 'rewrite': return <RewriteTool onSave={saveToHistory} />
      case 'seo': return <SEOTool onSave={saveToHistory} />
      case 'youtube': return <YouTubeTool onSave={saveToHistory} />
      case 'history': return <History />
      case 'settings': return <Settings />
      default: return <Dashboard onNavigate={(id) => setView(id as View)} />
    }
  }

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
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setDark(!dark)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  )
}
