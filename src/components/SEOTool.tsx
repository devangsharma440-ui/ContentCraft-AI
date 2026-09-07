import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResultDisplay } from './ResultDisplay'
import { Search, Loader2 } from 'lucide-react'

export function SEOTool({ onSave }: { onSave: (item: { title: string; content: string; type: string }) => void }) {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    setLoading(true)
    try {
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate SEO content')
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? 'Analyzing...' : 'Generate SEO Content'}
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
