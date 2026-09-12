import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ResultDisplay } from './ResultDisplay'
import { apiFetch, type UsageState } from '@/lib/api'
import { Youtube, Loader2, Zap, AlertCircle } from 'lucide-react'

const audiences = ['General', 'Beginners', 'Intermediate', 'Advanced', 'Students', 'Professionals', 'Kids']
const videoLengths = ['5 minutes', '10 minutes', '15 minutes', '20 minutes', '30 minutes', '60 minutes']

interface YouTubeToolProps {
  onSave: (item: { title: string; content: string; type: string }) => void
  usage?: UsageState | null
  onUsageUpdate?: (newUsage: Partial<UsageState>) => void
  onUpgradeClick?: () => void
}

export function YouTubeTool({ onSave, usage, onUsageUpdate, onUpgradeClick }: YouTubeToolProps) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('General')
  const [videoLength, setVideoLength] = useState('10 minutes')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false)
  const savedIdRef = useRef('')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (result && result.content !== savedIdRef.current) {
      savedIdRef.current = result.content
      onSave({ title: `YouTube: ${topic.slice(0, 50)}`, content: result.content, type: 'YouTube' })
    }
  }, [result])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for your YouTube content.')
      return
    }
    setError('')
    setIsQuotaExhausted(false)
    setLoading(true)
    try {
      const res = await apiFetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, videoLength }),
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
        throw new Error(data.error || 'Failed to generate YouTube content')
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
  const loadingLabel = isPro ? '⚡ Priority AI processing...' : 'Generating YouTube Content...'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Youtube className="h-6 w-6 text-red-500" /> YouTube Content
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="yt-topic">Video Topic *</Label>
            <Input
              id="yt-topic"
              placeholder={`e.g., How to start a YouTube channel in ${currentYear}`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Video Length</Label>
              <Select value={videoLength} onValueChange={setVideoLength}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {videoLengths.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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
              <Youtube className="h-4 w-4 mr-2" />
            )}
            {loading ? loadingLabel : 'Generate YouTube Content'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <ResultDisplay
          content={result.content}
          title="YouTube Content Package"
          demo={result.demo}
          onSave={() => onSave({ title: `YouTube: ${topic.slice(0, 50)}`, content: result.content, type: 'YouTube' })}
        />
      )}
    </div>
  )
}
