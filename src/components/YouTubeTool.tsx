import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ResultDisplay } from './ResultDisplay'
import { Youtube, Loader2 } from 'lucide-react'

const audiences = ['General', 'Beginners', 'Intermediate', 'Advanced', 'Students', 'Professionals', 'Kids']
const videoLengths = ['5 minutes', '10 minutes', '15 minutes', '20 minutes', '30 minutes', '60 minutes']

export function YouTubeTool({ onSave }: { onSave: (item: { title: string; content: string; type: string }) => void }) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('General')
  const [videoLength, setVideoLength] = useState('10 minutes')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const savedIdRef = useRef('')

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
    setLoading(true)
    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, videoLength }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate YouTube content')
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
        <Youtube className="h-6 w-6 text-red-500" /> YouTube Content
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="yt-topic">Video Topic *</Label>
            <Input
              id="yt-topic"
              placeholder="e.g., How to start a YouTube channel in 2026"
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Youtube className="h-4 w-4 mr-2" />}
            {loading ? 'Generating...' : 'Generate YouTube Content'}
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
