import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResultDisplay } from './ResultDisplay'
import { apiFetch, type UsageState } from '@/lib/api'
import { Linkedin, Loader2, Zap, AlertCircle } from 'lucide-react'

const styles = ['Professional', 'Storytelling', 'Short & Engaging']
const languages = ['English', 'Hindi', 'Hinglish']

interface LinkedInGeneratorProps {
  onSave: (item: { title: string; content: string; type: string }) => void
  usage?: UsageState | null
  onUsageUpdate?: (newUsage: Partial<UsageState>) => void
  onUpgradeClick?: () => void
}

export function LinkedInGenerator({ onSave, usage, onUsageUpdate, onUpgradeClick }: LinkedInGeneratorProps) {
  const [points, setPoints] = useState('')
  const [style, setStyle] = useState('Professional')
  const [language, setLanguage] = useState('English')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false)
  const savedIdRef = useRef('')

  useEffect(() => {
    if (result && result.content !== savedIdRef.current) {
      savedIdRef.current = result.content
      onSave({ title: `LinkedIn: ${points.slice(0, 50)}`, content: result.content, type: 'LinkedIn' })
    }
  }, [result])

  const executeCall = async () => {
    const res = await apiFetch('/api/linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, style, language }),
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
      throw new Error(data.error || 'Failed to generate LinkedIn post')
    }
    setResult(data)
    if (data.usage) {
      onUsageUpdate?.(data.usage)
    }
  }

  const handleGenerate = async () => {
    if (!points.trim()) {
      setError('Please enter your rough points or ideas.')
      return
    }
    setError('')
    setIsQuotaExhausted(false)
    setLoading(true)
    try {
      await executeCall()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    setLoading(true)
    setError('')
    setIsQuotaExhausted(false)
    try {
      await executeCall()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const isPro = usage?.plan === 'pro'
  const loadingLabel = isPro ? '⚡ Priority AI processing...' : 'Generating your post...'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Linkedin className="h-6 w-6 text-sky-600" /> LinkedIn Post Generator
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="points">Your Key Points *</Label>
            <Textarea
              id="points"
              placeholder={"Enter rough notes like:\n\ngot first job\ninterview difficult\nparents happy\nthank mentor\nexcited for new journey"}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="mt-1 min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Just write your key points — AI will turn them into a professional post.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {styles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              <Linkedin className="h-4 w-4 mr-2" />
            )}
            {loading ? loadingLabel : 'Generate LinkedIn Post'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <ResultDisplay
            content={result.content}
            title="LinkedIn Post"
            demo={result.demo}
            onSave={() => onSave({ title: `LinkedIn: ${points.slice(0, 50)}`, content: result.content, type: 'LinkedIn' })}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
              🔄 Regenerate
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
