import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResultDisplay } from './ResultDisplay'
import { apiFetch, type UsageState } from '@/lib/api'
import { Search, Loader2, Zap, AlertCircle } from 'lucide-react'

interface SEOToolProps {
  onSave: (item: { title: string; content: string; type: string }) => void
  usage?: UsageState | null
  onUsageUpdate?: (newUsage: Partial<UsageState>) => void
  onUpgradeClick?: () => void
}

export function SEOTool({ onSave, usage, onUsageUpdate, onUpgradeClick }: SEOToolProps) {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false)
  const savedIdRef = useRef('')

  useEffect(() => {
    if (result && result.content !== savedIdRef.current) {
      savedIdRef.current = result.content
      onSave({ title: `SEO: ${topic.slice(0, 50)}`, content: result.content, type: 'SEO' })
    }
  }, [result])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic or content for SEO analysis.')
      return
    }
    setError('')
    setIsQuotaExhausted(false)
    setLoading(true)
    try {
      const res = await apiFetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
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
        throw new Error(data.error || 'Failed to generate SEO content')
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
  const loadingLabel = isPro ? '⚡ Priority AI processing...' : 'Analyzing & Generating SEO Content...'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Search className="h-6 w-6 text-emerald-500" /> SEO Writer
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="seo-topic">Topic / Content *</Label>
            <Textarea
              id="seo-topic"
              placeholder="Enter your topic, article, or website content for SEO analysis..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 min-h-[120px]"
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

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isPro ? (
              <Zap className="h-4 w-4 mr-2 fill-amber-400 text-amber-400" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {loading ? loadingLabel : 'Generate SEO Content'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <ResultDisplay
          content={result.content}
          title="SEO Analysis"
          demo={result.demo}
          onSave={() => onSave({ title: `SEO: ${topic.slice(0, 50)}`, content: result.content, type: 'SEO' })}
        />
      )}
    </div>
  )
}
