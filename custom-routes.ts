import { Hono, type Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

const app = new Hono()

// ── In-memory Session-isolated Store (Server-side only) ──
// Each user/browser session gets an isolated in-memory record.
// Keys are never sent to the client, never logged, and never persisted to disk.

interface UserSession {
  userApiKey: string | null
  cachedWorkingModel: string | null
  cachedModelKey: string | null
  lastActive: number
}

const SESSION_COOKIE_NAME = 'cc_session_id'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const sessionStore = new Map<string, UserSession>()

// Prune expired sessions periodically
function cleanupSessions() {
  const now = Date.now()
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessionStore.delete(id)
    }
  }
}

function getOrCreateSessionId(c: Context): string {
  let sessionId = getCookie(c, SESSION_COOKIE_NAME) || c.req.header('x-session-id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    setCookie(c, SESSION_COOKIE_NAME, sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }
  return sessionId
}

function getSession(c: Context): UserSession {
  cleanupSessions()
  const sessionId = getOrCreateSessionId(c)
  let session = sessionStore.get(sessionId)
  if (!session) {
    session = {
      userApiKey: null,
      cachedWorkingModel: null,
      cachedModelKey: null,
      lastActive: Date.now(),
    }
    sessionStore.set(sessionId, session)
  } else {
    session.lastActive = Date.now()
  }
  return session
}

function getActiveKey(c: Context): string | null {
  const session = getSession(c)
  return session.userApiKey || process.env.GEMINI_API_KEY || null
}

// ── Gemini Helper & Model Discovery ──────────────────────────────────────────

type DemoType = 'generate' | 'linkedin' | 'rewrite' | 'seo' | 'youtube'

// Priority-ordered list of current stable text-capable models.
// Only active, text-capable production models. No image-only, audio, or video models.
const MODEL_CANDIDATES = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
]

// Server-level working model cache for the shared environment key (free users)
let envModelCache: { model: string; key: string } | null = null

// ── Future Business Architecture Hook (Free vs Pro Plans) ──
// Ready for: User Account -> Plan (Free/Pro) -> Usage Limit -> Gemini Request -> Usage Tracking
export interface RequestUsageContext {
  plan: 'free' | 'pro'
  keySource: 'environment' | 'user' | 'none'
  canProceed: boolean
  limitMessage?: string
}

export function evaluateUsageContext(c: Context): RequestUsageContext {
  const session = getSession(c)
  const hasUserKey = !!session.userApiKey
  const hasEnvKey = !!process.env.GEMINI_API_KEY

  // In the future, verify user session token, lookup plan in DB, check usage count
  return {
    plan: 'free',
    keySource: hasUserKey ? 'user' : hasEnvKey ? 'environment' : 'none',
    canProceed: true,
  }
}

interface GeminiError {
  status: number
  geminiError: string
  model: string
}

function classifyGeminiError(status: number, geminiError: string): string {
  if (status === 401 || status === 403) {
    return 'API key is invalid or does not have permission to use Gemini.'
  }
  if (status === 404) {
    return 'Gemini model is unavailable for this API key.'
  }
  if (status === 429) {
    return 'Gemini quota/rate limit reached. Please try again later.'
  }
  if (status >= 500) {
    return 'Gemini service is temporarily unavailable.'
  }
  if (status === 400) {
    return 'Invalid request to Gemini API.'
  }
  return `Gemini connection failed (HTTP ${status}).`
}

async function callGeminiWithModel(model: string, apiKey: string, prompt: string, attempt = 1): Promise<{ text: string }> {
  let res: Response
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    )
  } catch (networkErr: any) {
    if (attempt <= 2) {
      await new Promise((r) => setTimeout(r, 500))
      return callGeminiWithModel(model, apiKey, prompt, attempt + 1)
    }
    const err: any = new Error('Network error. Could not reach Gemini API.')
    err.status = 0
    err.geminiError = networkErr?.message || 'Network unreachable'
    err.model = model
    throw err
  }

  if (!res.ok) {
    const status = res.status

    // If 5xx transient error and first attempt, retry once
    if (status >= 500 && attempt <= 2) {
      await new Promise((r) => setTimeout(r, 500 * attempt))
      return callGeminiWithModel(model, apiKey, prompt, attempt + 1)
    }

    let geminiError = ''

    try {
      const responseText = await res.text()
      if (responseText.trim()) {
        try {
          const errBody = JSON.parse(responseText)
          geminiError = errBody?.error?.message || JSON.stringify(errBody)
        } catch {
          geminiError = responseText
        }
      }
    } catch {
      geminiError = 'Could not read error body'
    }

    const err: any = new Error(classifyGeminiError(status, geminiError))
    err.status = status
    err.geminiError = geminiError
    err.model = model
    throw err
  }

  const responseText = await res.text()

  if (!responseText.trim()) {
    const err: any = new Error('Gemini returned an empty response.')
    err.status = res.status
    err.geminiError = 'Empty response body'
    err.model = model
    throw err
  }

  let data: any

  try {
    data = JSON.parse(responseText)
  } catch {
    const err: any = new Error('Gemini returned an invalid response.')
    err.status = res.status
    err.geminiError = responseText
    err.model = model
    throw err
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    const err: any = new Error('Gemini returned an empty response.')
    err.status = 200
    err.geminiError = JSON.stringify(data)
    err.model = model
    throw err
  }

  return { text }
}

// Probe a single model with a minimal request (5 tokens max).
// Returns the HTTP status code (200 = works, 403 = auth error, 404 = model not found, etc.)
async function probeModel(model: string, apiKey: string): Promise<number> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    )
    return res.status
  } catch {
    return 0
  }
}

// Discover the first working model for the given API key.
// Returns { model, error? }
// Bounded fallback behavior:
// - Probes cached model first (if not excluded)
// - Stops immediately on 401/403 (Auth Error)
// - Cascades on 404 (Model Not Found) or 429 (Model Rate Limit exceeded on that specific model)
// - Maximum one attempt per candidate in MODEL_CANDIDATES
async function discoverWorkingModel(
  apiKey: string,
  session?: UserSession,
  excludedModels: Set<string> = new Set<string>()
): Promise<{ model: string | null; error?: string }> {
  const isEnvKey = apiKey === process.env.GEMINI_API_KEY;

  // Track if we had a cached model that was invalidated
  let cacheInvalidated = false;

  // 1. Check cached model first if not excluded
  const cachedModel = session?.cachedWorkingModel && session.cachedModelKey === apiKey
    ? session.cachedWorkingModel
    : isEnvKey && envModelCache?.key === apiKey
      ? envModelCache.model
      : null;

  if (cachedModel && !excludedModels.has(cachedModel)) {
    const status = await probeModel(cachedModel, apiKey);
    if (status === 200) return { model: cachedModel };

    // Invalidate cache and mark as invalidated
    excludedModels.add(cachedModel);
    if (session) {
      session.cachedWorkingModel = null;
      session.cachedModelKey = null;
    }
    if (isEnvKey) {
      envModelCache = null;
    }
    cacheInvalidated = true;
  }

  let encounteredRateLimit = false;

  // 2. Scan candidate list with bounded single-pass
  for (const model of MODEL_CANDIDATES) {
    if (excludedModels.has(model)) continue;

    const status = await probeModel(model, apiKey);
    excludedModels.add(model);

    if (status === 200) {
      // Success: cache working model only if we didn't just invalidate a prior cache
      if (!cacheInvalidated) {
        if (session) {
          session.cachedWorkingModel = model;
          session.cachedModelKey = apiKey;
        }
        if (isEnvKey) {
          envModelCache = { model, key: apiKey };
        }
      }
      return { model };
    }

    // 401 / 403: Auth / Permission error. Stop immediately.
    if (status === 401 || status === 403) {
      return { model: null, error: 'API key is invalid or does not have permission to use Gemini.' };
    }

    // 429: Rate limit hit on this specific model.
    if (status === 429) {
      encounteredRateLimit = true;
      continue;
    }

    // Other errors: continue
  }

  if (encounteredRateLimit) {
    return { model: null, error: 'Gemini quota/rate limit reached. Please try again later.' };
  }

  return { model: null, error: 'No compatible Gemini text model is available for this API key.' };
}

// Classify the error for user-facing messages based on HTTP status.
function classifyError(status: number): string {
  if (status === 401 || status === 403 || status === 400) return 'AUTH_ERROR'
  if (status === 429) return 'RATE_LIMIT'
  if (status >= 500) return 'SERVICE_ERROR'
  return 'UNKNOWN_ERROR'
}

async function callGemini(
  c: Context,
  prompt: string,
  demoType: DemoType,
  userInput: string
): Promise<{ text: string; demo: boolean }> {
  const session = getSession(c)
  const apiKey = getActiveKey(c)
  if (!apiKey) {
    return { text: generateDemoContent(demoType, userInput), demo: true }
  }

  const isEnvKey = apiKey === process.env.GEMINI_API_KEY
  const attemptedModels = new Set<string>()
  let lastErrorType: string | null = null; let rateLimitEncountered = false

  // Bounded attempt loop: at most MODEL_CANDIDATES.length attempts across candidates
  while (attemptedModels.size < MODEL_CANDIDATES.length) {
    const discovery = await discoverWorkingModel(apiKey, session, attemptedModels)
    if (!discovery.model) {
      if (discovery.error?.includes('invalid') || discovery.error?.includes('permission')) {
        const err: any = new Error('AUTH_ERROR')
        err.status = 403
        throw err
      }
      if (discovery.error?.includes('rate limit') || discovery.error?.includes('quota')) {
        const err: any = new Error('RATE_LIMIT')
        err.status = 429
        throw err
      }
      if (discovery.error?.includes('Network')) {
        const err: any = new Error('NETWORK_ERROR')
        err.status = 0
        throw err
      }
      const err: any = new Error('NO_MODEL')
      err.status = 404
      throw err
    }

    const currentModel = discovery.model
    attemptedModels.add(currentModel)

    try {
      const response = await callGeminiWithModel(currentModel, apiKey, prompt)
      return { text: response.text, demo: false }
    } catch (e: any) {
      const status = e?.status || 0
      const errType = classifyError(status)

      // Auth error: abort immediately, do not rotate
      if (errType === 'AUTH_ERROR') {
        const authErr: any = new Error('AUTH_ERROR')
        authErr.status = 401
        throw authErr
      }

      // Invalidate cache for the failing model
      if (session) {
        session.cachedWorkingModel = null
        session.cachedModelKey = null
      }
      if (isEnvKey) {
        envModelCache = null
      }

      lastErrorType = errType

      // 404, 429, 5xx, network error: continue to next candidate in bounded loop
      if (status === 429) {
        rateLimitEncountered = true;
      }
      if (status === 404 || status === 429 || status >= 500 || status === 0) {
        continue;
      }

      throw e
    }
  }

  // All candidates exhausted
  if (rateLimitEncountered) {
    const rateErr: any = new Error('RATE_LIMIT')
    rateErr.status = 429
    throw rateErr
  }
  if (lastErrorType === 'SERVICE_ERROR') {
    const svcErr: any = new Error('SERVICE_ERROR')
    svcErr.status = 503
    throw svcErr
  }
  const noModelErr: any = new Error('NO_MODEL')
  noModelErr.status = 404
  throw noModelErr
}

// â”€â”€ Demo Mode Content Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateDemoContent(type: DemoType, userInput: string): string {
  const topic = userInput.trim()

  switch (type) {
    case 'linkedin': {
      const lines = topic.split('\n').filter((l) => l.trim())
      const points = lines.map((l) => `â€¢ ${l.trim()}`).join('\n')
      return `I recently went through an experience that changed my perspective.

${points}

Here's what I learned from it:

Every step forward â€” no matter how small â€” is worth celebrating. The journey isn't always smooth, but the growth that comes from showing up every day is something no one can take away from you.

I'm grateful for the people who supported me along the way, and I'm excited for what's next.

What's one moment that shaped your professional journey? I'd love to hear your story in the comments.

#ProfessionalGrowth #CareerJourney #LessonsLearned #Networking #PersonalDevelopment`
    }

    case 'seo': {
      const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
      const words = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      const focusKeyword = words.slice(0, 3).join(' ') || topic.toLowerCase()
      const related = words.slice(0, 5).length > 1 ? words.slice(0, 5).join(', ') : 'content strategy, digital marketing, best practices'

      return `SEO Title:
${topic} | Complete Guide & Tips [2026]

Meta Description:
Discover everything you need to know about ${topic}. Expert tips, actionable strategies, and proven methods to boost your results. Read now!

Focus Keyword:
${focusKeyword}

Related Keywords:
${related}

H1:
${topic} â€” Everything You Need to Know in 2026

H2 Suggestions:
1. Why ${topic} Matters More Than Ever
2. Top Strategies for ${topic} Success
3. Common Mistakes to Avoid
4. Step-by-Step Implementation Guide
5. Tools and Resources to Get Started

URL Slug:
/${slug}

FAQ:
Q: What is the most important aspect of ${topic}?
A: The most important aspect is consistency and focusing on proven strategies that align with your specific goals and audience.

Q: How long does it take to see results from ${topic}?
A: Most people see meaningful results within 2-3 months of consistent effort, though this varies based on competition and execution.

Q: What are the best tools for ${topic}?
A: Start with free tools like Google Analytics and Google Search Console, then consider premium options as your needs grow.

Q: Is ${topic} still relevant in 2026?
A: Absolutely. ${topic} continues to evolve and remains one of the most effective strategies for long-term growth.

Estimated SEO Score: 74/100`
    }

    case 'youtube': {
      const topicWords = topic.split(/\s+/).slice(0, 5).join(' ');
      const currentYear = new Date().getFullYear();
      // Guidelines: Avoid outdated or static year references. Use the actual current year when needed. Do not invent time-sensitive claims.
      return `Guidelines: Avoid outdated year references; use the current year (${currentYear}) when a year is needed.

5 Title Ideas:
1. ${topic} — The Complete Beginner's Guide
2. How to Master ${topic} in ${currentYear} (Step by Step)
3. I Tried ${topic} for 30 Days — Here's What Happened
4. ${topic}: Everything You NEED to Know Before You Start
5. The ${topic} Blueprint That Actually Works

Hook (First 15 Seconds):
"If you've been trying to figure out ${topic} and nothing seems to work — you're in the right place. In this video, I'm going to break down exactly what you need to do, step by step, so you can start seeing real results."

Script:

[INTRO — 0:00]
Hey everyone, welcome back to the channel! If you're new here, we break down complex topics into simple, actionable steps. Today we're diving deep into ${topicWords}.

[SECTION 1 — THE PROBLEM — 1:00]
Here's the thing most people get wrong about ${topic}: they overcomplicate it. They try to do everything at once and end up overwhelmed. Sound familiar?

[SECTION 2 — THE FRAMEWORK — 3:00]
Let me share a simple framework that changed everything for me. It has three parts:

Step 1: Start with the basics — understand the fundamentals before trying advanced techniques.
Step 2: Take consistent action — small daily steps beat occasional bursts of effort.
Step 3: Measure and adjust — track what works and double down on it.

[SECTION 3 — PRACTICAL TIPS — 7:00]
Now let me give you some practical tips you can implement today:

Tip 1: Focus on one thing at a time. Don't try to master everything at once.
Tip 2: Set realistic goals. Progress is progress, no matter how small.
Tip 3: Learn from others who've been where you are.

[SUMMARY — 12:00]
To recap: start with the fundamentals, take consistent daily action, measure your results, and keep improving.

[CTA — 13:00]
If this was helpful, smash that like button and subscribe — it really helps the channel. Drop a comment below telling me which tip you're going to try first. I read every single comment.

Video Description:
In this video, I break down ${topic} into simple, actionable steps. Whether you're a complete beginner or looking to level up, this guide covers everything you need to know.

⏰ Timestamps:
0:00 — Introduction
1:00 — The Problem
3:00 — The Framework
7:00 — Practical Tips
12:00 — Summary
13:00 — Final Thoughts

#${topicWords.replace(/\s+/g, '')} #Tutorial #Guide #Beginner #Tips

Tags:
${topicWords}, ${topicWords} tutorial, ${topicWords} for beginners, how to ${topicWords}, ${topicWords} guide ${currentYear}, ${topicWords} tips, ${topicWords} step by step, learn ${topicWords}, ${topicWords} explained, best ${topicWords} strategies, ${topicWords} 101, ${topicWords} for dummies, ${topicWords} from scratch, ${topicWords} complete guide, ${topicWords} that works`
    }

    case 'rewrite': {
      const trimmed = topic.trim()
      const sentences = trimmed
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .filter((s) => s.trim())

      const improved = sentences.map((s) => {
        let t = s.trim()
        t = t.replace(/\bvery good\b/gi, 'excellent')
        t = t.replace(/\btalked about\b/gi, 'discussed')
        t = t.replace(/\bmany things\b/gi, 'several key topics')
        t = t.replace(/\bwere important for\b/gi, 'were critical to')
        t = t.replace(/\bagreed that we should do it\b/gi, 'aligned on the path forward')
        t = t.replace(/\bwas very good\b/gi, 'was highly productive')
        t = t.replace(/\bthings\b/gi, 'topics')
        t = t.replace(/\bgood\b/gi, 'productive')
        t = t.replace(/\bbad\b/gi, 'suboptimal')
        t = t.replace(/\bnice\b/gi, 'impressive')
        t = t.replace(/\bgot\b/gi, 'received')
        t = t.replace(/\bwent\b/gi, 'progressed')
        t = t.replace(/\bstuff\b/gi, 'details')
        t = t.replace(/\ba lot of\b/gi, 'numerous')
        t = t.replace(/\bjust\b/gi, '')
        if (t && !/[.!?]$/.test(t)) t += '.'
        return t
      })

      return improved.join(' ').replace(/\s+/g, ' ').trim()
    }

    case 'generate':
    default: {
      const contentType = 'article'
      return `# ${topic.charAt(0).toUpperCase() + topic.slice(1)}

## Introduction

${topic} has become an increasingly important subject in today's rapidly evolving landscape. Whether you're a seasoned professional or just getting started, understanding the nuances of ${topic} can make a significant difference in achieving your goals.

In this ${contentType}, we'll explore the key aspects, practical strategies, and actionable insights that will help you navigate this space with confidence.

## Why ${topic} Matters

The significance of ${topic} cannot be overstated. Here are the key reasons it deserves your attention:

1. **Relevance** â€” ${topic} is at the forefront of current trends and will continue to shape the landscape for years to come.
2. **Impact** â€” Understanding and applying the principles of ${topic} can lead to measurable improvements in your results.
3. **Opportunity** â€” Those who master ${topic} early gain a significant competitive advantage.

## Key Principles

### Start With a Clear Strategy
Before diving into the tactical aspects, take time to define what success looks like for you. A clear strategy provides the foundation for everything that follows.

### Focus on Consistent Execution
The difference between those who succeed and those who don't often comes down to consistency. Small, daily actions compound into remarkable results over time.

### Measure and Adapt
Track your progress, learn from your data, and be willing to adjust your approach. The best strategies evolve based on real-world feedback.

## Practical Tips

- **Set specific, measurable goals** â€” Vague intentions lead to vague results. Be precise about what you want to achieve.
- **Build systems, not just goals** â€” Goals define the destination; systems get you there. Focus on repeatable processes.
- **Learn from others** â€” Study what works for people who've achieved what you're aiming for. Model their approaches and adapt them to your situation.
- **Stay patient** â€” Meaningful results take time. Trust the process and keep showing up.

## Conclusion

${topic} offers tremendous potential for those willing to put in the work. By understanding the fundamentals, developing a clear strategy, and executing consistently, you'll be well on your way to achieving your goals.

The key is to start now. Don't wait for perfect conditions â€” they'll never come. Take the first step today, and adjust as you go.

*What's your experience with ${topic}? Share your thoughts in the comments below.*`
    }
  }
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function safeCallGemini(
  c: Context,
  prompt: string,
  demoType: DemoType,
  userInput: string
): Promise<{ content: string; demo: boolean; error?: string; status?: number; workingModel?: string }> {
  const session = getSession(c)
  try {
    const result = await callGemini(c, prompt, demoType, userInput)
    return { content: result.text, demo: result.demo, workingModel: session.cachedWorkingModel || undefined }
  } catch (e: any) {
    if (e?.message === 'AUTH_ERROR') {
      return {
        content: '',
        demo: false,
        status: 401,
        error: 'API key is invalid or does not have permission to use Gemini.',
      }
    }
    if (e?.message === 'RATE_LIMIT') {
      return {
        content: '',
        demo: false,
        status: 429,
        error: 'Gemini quota/rate limit reached. Please try again later.',
      }
    }
    if (e?.message === 'SERVICE_ERROR') {
      return {
        content: '',
        demo: false,
        status: 503,
        error: 'Gemini service is temporarily unavailable.',
      }
    }
    if (e?.message === 'NO_MODEL') {
      return {
        content: '',
        demo: false,
        status: 404,
        error: 'No Gemini text model is available for this API key.',
      }
    }
    return { content: generateDemoContent(demoType, userInput), demo: true }
  }
}

export { discoverWorkingModel, callGemini, safeCallGemini };

app.get('/health', (c) => c.json({ status: 'ok', hasApiKey: !!getActiveKey(c) }))

app.post('/generate', async (c) => {
  const body = await c.req.json()
  const { keyPoints, contentType, tone, language, length, targetAudience } = body

  if (!keyPoints?.trim()) {
    return c.json({ error: 'Please provide key points or a topic.' }, 400)
  }

  const prompt = `You are a professional content writer. Create a ${contentType || 'blog post'} based on these key points:

"${keyPoints}"

Requirements:
- Tone: ${tone || 'Professional'}
- Language: ${language || 'English'}
- Length: ${length || 'Medium'} (Short=200 words, Medium=500 words, Long=1000 words)
- Target Audience: ${targetAudience || 'General audience'}

Write the complete content now. Do not include any meta-commentary, just the content itself.`

  const result = await safeCallGemini(c, prompt, 'generate', keyPoints)
  if (result.error) return c.json({ error: result.error }, (result.status || 400) as any)
  return c.json({ content: result.content, demo: result.demo })
})

app.post('/linkedin', async (c) => {
  const body = await c.req.json()
  const { points, style, language } = body

  if (!points?.trim()) {
    return c.json({ error: 'Please provide your key points.' }, 400)
  }

  const prompt = `Transform these rough notes into a complete, professional LinkedIn post:

Notes: "${points}"

Style: ${style || 'Professional'}
Language: ${language || 'English'}

Rules:
- Start with a strong, attention-grabbing hook (first line)
- Write short paragraphs (1-3 sentences each)
- Use natural, human tone — professional but not robotic
- Do NOT invent facts, achievements, or statistics the user did not provide
- Do NOT add fake experiences or statistics
- End with a clear call-to-action (question, invitation to share, etc.)
- Add 3-8 relevant hashtags at the end
- Avoid excessive emojis
- Avoid generic AI-sounding language like "In today's fast-paced world..."
- Keep the post between 150-300 words

Write the LinkedIn post now.`

  const result = await safeCallGemini(c, prompt, 'linkedin', points)
  if (result.error) return c.json({ error: result.error }, (result.status || 400) as any)
  return c.json({ content: result.content, demo: result.demo })
})

app.post('/rewrite', async (c) => {
  const body = await c.req.json()
  const { content, action } = body

  if (!content?.trim()) {
    return c.json({ error: 'Please provide content to rewrite.' }, 400)
  }

  const actionPrompts: Record<string, string> = {
    improve: 'Improve this content for clarity, engagement, and flow while keeping the original meaning.',
    professional: 'Rewrite this in a professional, business-appropriate tone.',
    simple: 'Rewrite this in simple, easy-to-understand language that a 12-year-old could follow.',
    shorter: 'Make this content significantly shorter and more concise while keeping the key message.',
    longer: 'Expand this content with more detail, examples, and supporting points.',
    grammar: 'Fix all grammar, spelling, and punctuation errors in this content.',
    paraphrase: 'Paraphrase this content completely using different words and sentence structures while keeping the same meaning.',
    engaging: 'Rewrite this to be more engaging, interesting, and attention-grabbing.',
  }

  const instruction = actionPrompts[action] || actionPrompts.improve

  const prompt = `${instruction}

Original content:
"${content}"

Write the improved version now. Do not add explanations — just provide the rewritten content.`

  const result = await safeCallGemini(c, prompt, 'rewrite', content)
  if (result.error) return c.json({ error: result.error }, (result.status || 400) as any)
  return c.json({ content: result.content, demo: result.demo })
})

app.post('/seo', async (c) => {
  const body = await c.req.json()
  const { topic } = body

  if (!topic?.trim()) {
    return c.json({ error: 'Please provide a topic or content for SEO analysis.' }, 400)
  }

  const prompt = `Analyze this topic/content for SEO and provide a complete SEO toolkit:

Topic: "${topic}"

Provide ALL of the following:
1. SEO Title (under 60 characters)
2. Meta Description (under 160 characters)
3. Focus Keyword
4. 5 Related/Secondary Keywords
5. H1 Heading
6. 5 H2 Heading Suggestions
7. URL Slug
8. 5 FAQ Questions & Answers
9. SEO Score estimate (0-100, based on keyword optimization potential)

Format the output clearly with labels and line breaks. Be specific and actionable.`

  const result = await safeCallGemini(c, prompt, 'seo', topic)
  if (result.error) return c.json({ error: result.error }, (result.status || 400) as any)
  return c.json({ content: result.content, demo: result.demo })
})

app.post('/youtube', async (c) => {
  const body = await c.req.json()
  const { topic, audience, videoLength } = body

  if (!topic?.trim()) {
    return c.json({ error: 'Please provide a topic for YouTube content.' }, 400)
  }

  const prompt = `Create complete YouTube content package for this video:

Topic: "${topic}"
Target Audience: ${audience || 'General audience'}
Video Length: ${videoLength || '10 minutes'}

Provide ALL of the following:
1. 5 Title Ideas (engaging, clickable, SEO-friendly)
2. Hook (the first 15 seconds — grab attention immediately)
3. Complete Video Script with:
   - Intro (hook + what the video is about)
   - Main content sections with clear transitions
   - Summary/key takeaways
   - CTA (subscribe, like, comment)
4. Video Description (300+ words, with timestamps)
5. Tags (15-20 relevant tags)

Format clearly with section headers. Make the content engaging and optimized for YouTube's algorithm.`

  const result = await safeCallGemini(c, prompt, 'youtube', topic)
  if (result.error) return c.json({ error: result.error }, (result.status || 400) as any)
  return c.json({ content: result.content, demo: result.demo })
})

// ── Settings Routes ───────────────────────────────────────────────────────────

// Status: never returns the actual key, only whether one is set
app.get('/settings/status', (c) => {
  const session = getSession(c)
  const hasUserKey = !!session.userApiKey
  const hasEnvKey = !!process.env.GEMINI_API_KEY
  return c.json({
    hasUserKey,
    hasEnvKey,
    activeSource: hasUserKey ? 'user' : hasEnvKey ? 'environment' : 'none',
  })
})

// Save user API key (received over HTTPS in production, stored in server memory only)
app.post('/settings/key', async (c) => {
  const body = await c.req.json()
  const { key } = body

  if (!key || typeof key !== 'string' || !key.trim()) {
    return c.json({ error: 'Please provide a valid API key.' }, 400)
  }

  const trimmed = key.trim()

  if (trimmed.length < 10) {
    return c.json({ error: 'API key appears too short. Please check your key and try again.' }, 400)
  }

  const session = getSession(c)
  session.userApiKey = trimmed
  session.cachedWorkingModel = null
  session.cachedModelKey = null
  return c.json({ ok: true, message: 'API key saved successfully.' })
})

// Remove user API key
app.delete('/settings/key', (c) => {
  const session = getSession(c)
  session.userApiKey = null
  session.cachedWorkingModel = null
  session.cachedModelKey = null
  return c.json({ ok: true, message: 'API key removed. App will use environment key or demo mode.' })
})

// Test the active key by discovering a working model with a minimal request.
app.post('/settings/test', async (c) => {
  const session = getSession(c)
  const key = getActiveKey(c)
  if (!key) {
    return c.json({ ok: false, error: 'No API key configured.' }, 400)
  }

  try {
    const discovery = await discoverWorkingModel(key, session)
    if (discovery.model) {
      return c.json({
        ok: true,
        message: `Connected successfully — ${discovery.model}`,
      })
    }

    return c.json({
      ok: false,
      error: discovery.error || 'No Gemini text model is available for this API key. The selected models may not be supported by your key or project.',
    })
  } catch {
    return c.json({
      ok: false,
      error: 'Network error. Could not reach Gemini API.',
    })
  }
})

export default app
