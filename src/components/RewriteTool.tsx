import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResultDisplay } from './ResultDisplay'
import { apiFetch, type UsageState } from '@/lib/api'
import { RefreshCw, Loader2, Zap, AlertCircle } from 'lucide-react'

const actions = [
  { id: 'improve', label: '✨ Improve', color: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'professional', label: '👔 Professional', color: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/30 dark:hover:bg-slate-950/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' },
  { id: 'simple', label: '📖 Simple', color: 'bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  { id: 'shorter', label: '✂️ Shorter', color: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'longer', label: '📝 Longer', color: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'grammar', label: '✓ Grammar Fix', color: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'paraphrase', label: '🔄 Paraphrase', color: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
  { id: 'engaging', label: '🔥 More Engaging', color: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
]

interface RewriteToolProps {
  onSave: (item: { title: string; content: string; type: string }) => void
  usage?: UsageState | null
  onUsageUpdate?: (newUsage: Partial<UsageState>) => void
  onUpgradeClick?: () => void
}

export function RewriteTool({ onSave, usage, onUsageUpdate, onUpgradeClick }: RewriteToolProps) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastAction, setLastAction] = useState('')
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false)
  const savedIdRef = useRef('')

  useEffect(() => {
    if (result && result.content !== savedIdRef.current) {
      savedIdRef.current = result.content
      onSave({ title: `Rewrite (${lastAction}): ${content.slice(0, 50)}`, content: result.content, type: 'Rewrite' })
    }
  }, [result])

  const handleRewrite = async (action: string) => {
    if (!content.trim()) {
      setError('Please paste content to rewrite.')
      return
    }
    setError('')
    setIsQuotaExhausted(false)
    setLoading(true)
    setLastAction(action)
    try {
      const res = await apiFetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'MONTHLY_LIMIT_REACHED' || res.status === 429) {
          setIsQuotaExhausted(true)
          if (data.used !== undefined && data.limit !== undefined) {
            onUsageUpdate?.({ used: data.used, limit: data.limit, remaining: data.remaining })
          }
          throw new Error(data.message || "You've reached your monthly AI generation limit.")
        }
        throw new Error(data.error || 'Failed to rewrite content')
      }
      setResult(data)
      if (data.usage) {
        onUsageUpdate?.(data.usage)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isPro = usage?.plan === 'pro'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <RefreshCw className="h-6 w-6 text-violet-500" /> Rewrite Tool
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="rewrite-content">Paste Your Content *</Label>
            <Textarea
              id="rewrite-content"
              placeholder="Paste the content you want to rewrite..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[150px]"
            />
          </div>

          {error && (
            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              isQuotaExhausted
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            }`}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                {isQuotaExhausted && onUpgradeClick && (
                  <Button
                    size="sm"
                    className="mt-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs text-xs h-7"
                    onClick={onUpgradeClick}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1 fill-white" /> Upgrade to Pro (300 generations)
                  </Button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>{isPro ? '⚡ Priority AI processing...' : 'Rewriting your content...'}</span>
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {actions.map((a) => (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                className={a.color + ' border font-medium'}
                onClick={() => handleRewrite(a.id)}
                disabled={loading}
              >
                {loading && lastAction === a.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {result && (
        <ResultDisplay
          content={result.content}
          title={`Rewritten (${lastAction})`}
          demo={result.demo}
          onSave={() => onSave({ title: `Rewrite (${lastAction}): ${content.slice(0, 50)}`, content: result.content, type: 'Rewrite' })}
        />
      )}
    </div>
  )
}
