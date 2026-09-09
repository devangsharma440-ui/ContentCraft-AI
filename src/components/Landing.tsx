import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/cn'
import { Pen, Linkedin, RefreshCw, Search, Youtube } from 'lucide-react'

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32 text-center container mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI‑powered content creation, all in one place.
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Generate blogs, LinkedIn posts, SEO snippets, YouTube scripts and more — instantly.
        </p>
        <Button size="lg" onClick={onStart}>
          Start Creating Free
        </Button>
      </section>

      <Separator className="my-8" />

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-none">
          <CardHeader>
            <CardTitle>Fast & Accurate</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Leverage Gemini models to produce high‑quality content in seconds.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-none">
          <CardHeader>
            <CardTitle>All‑in‑One Toolkit</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Content Writer, LinkedIn Generator, Rewrite, SEO Writer, YouTube Generator – all ready to use.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-none">
          <CardHeader>
            <CardTitle>Secure & Private</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              No data is stored on our servers; everything runs locally in your browser.
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* Features / Tools Overview */}
      <section className="bg-muted py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">Tools & Features</h2>
        <div className="container mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3 px-4">
          <Card className="flex flex-col h-full bg-card/70">
            <CardHeader className="flex items-center gap-2">
              <Pen className="h-5 w-5" />
              <CardTitle>AI Content Writer</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Write articles, blog posts, and marketing copy instantly.</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex flex-col h-full bg-card/70">
            <CardHeader className="flex items-center gap-2">
              <Linkedin className="h-5 w-5" />
              <CardTitle>LinkedIn Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Create professional LinkedIn posts and summaries.</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex flex-col h-full bg-card/70">
            <CardHeader className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              <CardTitle>Rewrite Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Revise and improve existing text with AI suggestions.</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex flex-col h-full bg-card/70">
            <CardHeader className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <CardTitle>SEO Writer</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Generate SEO‑optimized meta titles, descriptions, and keywords.</CardDescription>
            </CardContent>
          </Card>
          <Card className="flex flex-col h-full bg-card/70">
            <CardHeader className="flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              <CardTitle>YouTube Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Script video outlines, titles and descriptions for YouTube.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground mb-4">
              1
            </div>
            <h3 className="font-medium mb-2">Choose a Tool</h3>
            <p className="text-sm text-muted-foreground">Select the AI content tool you need.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground mb-4">
              2
            </div>
            <h3 className="font-medium mb-2">Enter Prompt</h3>
            <p className="text-sm text-muted-foreground">Provide a brief description or keywords.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground mb-4">
              3
            </div>
            <h3 className="font-medium mb-2">Generate & Refine</h3>
            <p className="text-sm text-muted-foreground">AI produces content instantly; edit as you wish.</p>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Bottom CTA */}
      <section className="py-12 text-center">
        <Button size="lg" onClick={onStart}>
          Start Creating Free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-sm text-muted-foreground">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4">
          <span>© {new Date().getFullYear()} ContentCraft AI</span>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
