import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { Pen, Linkedin, RefreshCw, Search, Youtube } from 'lucide-react'

interface DashboardProps {
  onNavigate: (tool: string) => void
}

const tools = [
  { id: 'writer', icon: Pen, label: 'AI Writer', desc: 'Turn key points into blog posts, articles, emails & more', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { id: 'linkedin', icon: Linkedin, label: 'LinkedIn Post', desc: 'Transform rough notes into professional LinkedIn posts', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  { id: 'rewrite', icon: RefreshCw, label: 'Rewrite', desc: 'Improve, shorten, or transform existing content', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { id: 'seo', icon: Search, label: 'SEO Writer', desc: 'Get SEO titles, meta descriptions & keyword suggestions', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', desc: 'Generate titles, scripts, descriptions & tags', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
]

export function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          ✨ ContentCraft AI
        </h1>
        <p className="text-muted-foreground text-lg">
          Turn your ideas into ready-to-use content.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
              'border-border/50 hover:border-border'
            )}
            onClick={() => onNavigate(tool.id)}
          >
            <CardContent className="p-6">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', tool.bg)}>
                <tool.icon className={cn('h-6 w-6', tool.color)} />
              </div>
              <h3 className="font-semibold text-lg mb-1">{tool.label}</h3>
              <p className="text-sm text-muted-foreground">{tool.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
