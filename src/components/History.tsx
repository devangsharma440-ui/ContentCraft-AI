import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { History as HistoryIcon, Search, Trash2, Copy, Eye, X, Check, FileText } from 'lucide-react'

export interface HistoryItem {
  id: string
  title: string
  content: string
  type: string
  date: string
}

export function History({ onOpen }: { onOpen?: (item: HistoryItem) => void }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('contentcraft-history')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id)
    setItems(updated)
    localStorage.setItem('contentcraft-history', JSON.stringify(updated))
  }

  const handleClearAll = () => {
    setItems([])
    localStorage.removeItem('contentcraft-history')
  }

  const handleCopy = async (item: HistoryItem) => {
    await navigator.clipboard.writeText(item.content)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const typeColors: Record<string, string> = {
    'AI Writer': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    LinkedIn: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    Rewrite: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    SEO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    YouTube: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-6 w-6 text-amber-500" /> History
        </h2>
        {items.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{items.length === 0 ? 'No history yet. Generate some content to see it here.' : 'No results match your search.'}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className={`text-xs ${typeColors[item.type] || ''}`}>
                          {item.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.content.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewItem(item)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(item)}>
                        {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem?.type && <Badge variant="secondary" className={`${typeColors[viewItem.type] || ''}`}>{viewItem.type}</Badge>}
              {viewItem?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded-md">
              {viewItem?.content}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
