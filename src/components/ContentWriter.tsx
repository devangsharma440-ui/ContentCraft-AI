import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResultDisplay } from './ResultDisplay'
import { Pen, Loader2 } from 'lucide-react'

const contentTypes = ['Blog Post', 'Article', 'Email', 'Website Copy', 'Product Description', 'Ad Copy', 'Social Media Post', 'YouTube Script']
const tones = ['Professional', 'Casual', 'Friendly', 'Formal', 'Humorous', 'Persuasive', 'Inspirational']
const languages = ['English', 'Hindi', 'Hinglish', 'Gujarati', 'Spanish', 'French', 'German']
const lengths = ['Short', 'Medium', 'Long']
const audiences = ['General', 'Students', 'Professionals', 'Entrepreneurs', 'Marketers', 'Tech Enthusiasts', 'Kids']

export function ContentWriter({ onSave }: { onSave: (item: { title: string; content: string; type: string }) => void }) {
  const [keyPoints, setKeyPoints] = useState('')
  const [contentType, setContentType] = useState('Blog Post')
  const [tone, setTone] = useState('Professional')
  const [language, setLanguage] = useState('English')
  const [length, setLength] = useState('Medium')
  const [audience, setAudience] = useState('General')
  const [result, setResult] = useState<{ content: string; demo: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const savedIdRef = useRef('')

  useEffect(() => {
    if (result && result.content !== savedIdRef.current) {
      savedIdRef.current = result.content
      onSave({ title: `${contentType}: ${keyPoints.slice(0, 50)}`, content: result.content, type: 'AI Writer' })
    }
  }, [result])

  const handleGenerate = async () => {
    if (!keyPoints.trim()) {
      setError('Please enter your key points or topic.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyPoints, contentType, tone, language, length, targetAudience: audience }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate content')
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
        <Pen className="h-6 w-6 text-blue-500" /> AI Content Writer
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label htmlFor="keypoints">Key Points / Topic *</Label>
            <Textarea
              id="keypoints"
              placeholder="Enter your key points, topic, or rough ideas here...&#10;&#10;e.g., remote work benefits, productivity tips, team collaboration"
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              className="mt-1 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {contentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
            <div>
              <Label>Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lengths.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pen className="h-4 w-4 mr-2" />}
            {loading ? 'Generating...' : 'Generate Content'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <ResultDisplay
          content={result.content}
          title="Generated Content"
          demo={result.demo}
          onSave={() => onSave({ title: `${contentType}: ${keyPoints.slice(0, 50)}`, content: result.content, type: 'AI Writer' })}
        />
      )}
    </div>
  )
}
