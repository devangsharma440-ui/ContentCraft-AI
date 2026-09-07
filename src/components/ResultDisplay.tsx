import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Download, Printer, Check, Save } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ResultDisplayProps {
  content: string
  title?: string
  demo?: boolean
  onSave?: () => void
}

export function ResultDisplay({ content, title, demo, onSave }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false)

  if (!content) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'content'}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<html><head><title>${title || 'Content'}</title><style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;white-space:pre-wrap;}</style></head><body>${content.replace(/\n/g, '<br>')}</body></html>`)
      w.document.close()
      w.print()
    }
  }

  return (
    <Card className="mt-4 border-emerald-200 dark:border-emerald-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {title && <span className="font-semibold text-sm">{title}</span>}
            {demo && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                Demo Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onSave && (
              <Button variant="ghost" size="sm" onClick={onSave} className="h-8 px-2">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 px-2">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 px-2">
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-[500px]">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-mono bg-muted/30 rounded-md p-4">
            {content}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
