import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResultDisplay } from './ResultDisplay'
import { RefreshCw, Loader2 } from 'lucide-react'

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

export function RewriteTool({ onSave }: { onSave: (item: { title: string; content: string; type: string }) => void }) {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastAction, setLastAction] = useState('')
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
    setLoading(true)
    setLastAction(action)
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rewrite content')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

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

          {error && <p className="text-sm text-destructive">{error}</p>}

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
