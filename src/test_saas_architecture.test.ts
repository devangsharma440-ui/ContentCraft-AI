import { test, expect, beforeEach, afterEach } from 'bun:test'
import app, {
  checkQuota,
  getCurrentPeriod,
  ensureActivePeriod,
  getCurrentYearInstruction,
  _resetUsageStoreForTesting,
  type UserSession,
} from '../custom-routes'
import { PLAN_CONFIG, getPlanConfig, getMonthlyLimit } from '../src/lib/plans'

beforeEach(() => {
  _resetUsageStoreForTesting()
})

test('Plan configuration constants', () => {
  expect(getMonthlyLimit('free')).toBe(30)
  expect(getMonthlyLimit('pro')).toBe(300)
  expect(PLAN_CONFIG.free.priority).toBe('standard')
  expect(PLAN_CONFIG.pro.priority).toBe('pro')
  expect(PLAN_CONFIG.free.maxHistory).toBe(15)
  expect(PLAN_CONFIG.pro.maxHistory).toBe(1000)
})

test('Free user with quota remaining starts with 0 used, 30 remaining', () => {
  const session: UserSession = {
    plan: 'free',
    usedCount: 0,
    usagePeriod: getCurrentPeriod(),
    userApiKey: null,
    cachedWorkingModel: null,
    cachedModelKey: null,
    lastActive: Date.now(),
  }
  const quota = checkQuota(session)
  expect(quota.allowed).toBe(true)
  expect(quota.plan).toBe('free')
  expect(quota.used).toBe(0)
  expect(quota.limit).toBe(30)
  expect(quota.remaining).toBe(30)
})

test('Free quota reaching limit is rejected BEFORE Gemini call', () => {
  const session: UserSession = {
    plan: 'free',
    usedCount: 30,
    usagePeriod: getCurrentPeriod(),
    userApiKey: null,
    cachedWorkingModel: null,
    cachedModelKey: null,
    lastActive: Date.now(),
  }
  const quota = checkQuota(session)
  expect(quota.allowed).toBe(false)
  expect(quota.remaining).toBe(0)
  expect(quota.errorResponse?.error).toBe('MONTHLY_LIMIT_REACHED')
  expect(quota.errorResponse?.limit).toBe(30)
  expect(quota.errorResponse?.used).toBe(30)
})

test('Pro user has 300 limit and pro priority', () => {
  const session: UserSession = {
    plan: 'pro',
    usedCount: 35,
    usagePeriod: getCurrentPeriod(),
    userApiKey: null,
    cachedWorkingModel: null,
    cachedModelKey: null,
    lastActive: Date.now(),
  }
  const quota = checkQuota(session)
  expect(quota.allowed).toBe(true)
  expect(quota.limit).toBe(300)
  expect(quota.used).toBe(35)
  expect(quota.remaining).toBe(265)
  expect(quota.priority).toBe('pro')
})

test('Monthly lazy reset resets usedCount to 0 when month changes', () => {
  const session: UserSession = {
    plan: 'free',
    usedCount: 30, // exhausted last month
    usagePeriod: '2025-01', // older period
    userApiKey: null,
    cachedWorkingModel: null,
    cachedModelKey: null,
    lastActive: Date.now(),
  }
  ensureActivePeriod(session)
  expect(session.usedCount).toBe(0)
  expect(session.usagePeriod).toBe(getCurrentPeriod())
  const quota = checkQuota(session)
  expect(quota.allowed).toBe(true)
  expect(quota.remaining).toBe(30)
})

test('Current year instruction dynamically uses calendar year', () => {
  const currentYear = new Date().getFullYear()
  const instruction = getCurrentYearInstruction()
  expect(instruction).toContain(`Current year: ${currentYear}`)
  expect(instruction).toContain('Never use outdated years such as 2024 or 2025')
})

test('API route /generate enforces quota and returns usage', async () => {
  const clientId = 'test-client-gen-' + Math.random()
  const res = await app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ keyPoints: 'Remote work productivity tips' }),
  })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.content).toBeDefined()
  expect(data.usage).toBeDefined()
  expect(data.usage.plan).toBe('free')
  expect(data.usage.used).toBe(1)
  expect(data.usage.limit).toBe(30)
  expect(data.usage.remaining).toBe(29)
})

test('Validation errors do not consume quota', async () => {
  const clientId = 'test-client-val-' + Math.random()
  const res = await app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ keyPoints: '   ' }), // empty keyPoints
  })
  expect(res.status).toBe(400)

  // Verify usage is still 0
  const usageRes = await app.request('/plan/usage', {
    method: 'GET',
    headers: { 'x-client-id': clientId },
  })
  const usageData = await usageRes.json()
  expect(usageData.used).toBe(0)
  expect(usageData.remaining).toBe(30)
})

test('All 5 core AI routes work and increment quota', async () => {
  const clientId = 'test-5-tools-' + Math.random()

  // 1. Blog/Generate
  const r1 = await app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ keyPoints: 'AI trends' }),
  })
  expect(r1.status).toBe(200)
  const d1 = await r1.json()
  expect(d1.usage.used).toBe(1)

  // 2. LinkedIn
  const r2 = await app.request('/linkedin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ points: 'Just shipped a major release' }),
  })
  expect(r2.status).toBe(200)
  const d2 = await r2.json()
  expect(d2.usage.used).toBe(2)

  // 3. Rewrite
  const r3 = await app.request('/rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ content: 'This was very good and we discussed many things.', action: 'improve' }),
  })
  expect(r3.status).toBe(200)
  const d3 = await r3.json()
  expect(d3.usage.used).toBe(3)

  // 4. SEO
  const r4 = await app.request('/seo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ topic: 'Content Marketing for SaaS' }),
  })
  expect(r4.status).toBe(200)
  const d4 = await r4.json()
  expect(d4.usage.used).toBe(4)

  // 5. YouTube
  const r5 = await app.request('/youtube', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ topic: 'How to code in TypeScript' }),
  })
  expect(r5.status).toBe(200)
  const d5 = await r5.json()
  expect(d5.usage.used).toBe(5)
})

test('Quota exhaustion stops generation and returns MONTHLY_LIMIT_REACHED', async () => {
  const clientId = 'test-exhaust-' + Math.random()

  // Simulate reaching limit by setting used count
  // First do 1 generation to establish session
  await app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ keyPoints: 'First point' }),
  })

  // Set plan to free and used to 30 directly or via multiple calls
  const sessionRes = await app.request('/plan/usage', {
    headers: { 'x-client-id': clientId },
  })
  const usageInfo = await sessionRes.json()
  expect(usageInfo.used).toBe(1)

  // Upgrade to pro and back to test plan endpoint
  const upRes = await app.request('/plan/set-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ plan: 'pro' }),
  })
  expect(upRes.status).toBe(200)
  const upData = await upRes.json()
  expect(upData.plan).toBe('pro')
  expect(upData.limit).toBe(300)
  expect(upData.priority).toBe('pro')

  // Switch back to free
  await app.request('/plan/set-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ plan: 'free' }),
  })

  // Exhaust quota by directly simulating usedCount = 30
  const session = {
    plan: 'free' as const,
    usedCount: 30,
    usagePeriod: getCurrentPeriod(),
    userApiKey: null,
    cachedWorkingModel: null,
    cachedModelKey: null,
    lastActive: Date.now(),
  }
  const check = checkQuota(session)
  expect(check.allowed).toBe(false)
  expect(check.errorResponse?.error).toBe('MONTHLY_LIMIT_REACHED')
})

test('Anti-bypass: clearing cookies or generating new session from same IP preserves usage', async () => {
  const simulatedIp = '198.51.100.42'

  // Session 1: Client generates content from simulated IP
  const r1 = await app.request('/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session-alpha',
      'x-forwarded-for': simulatedIp,
    },
    body: JSON.stringify({ keyPoints: 'Alpha request' }),
  })
  expect(r1.status).toBe(200)
  const d1 = await r1.json()
  expect(d1.usage.used).toBe(1)

  // Session 2: User clears cookies and creates a new random session ID from the same IP
  const r2 = await app.request('/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': 'session-beta-hacker',
      'x-forwarded-for': simulatedIp,
    },
    body: JSON.stringify({ keyPoints: 'Beta request' }),
  })
  expect(r2.status).toBe(200)
  const d2 = await r2.json()
  // The IP anchor preserves usage and increments to 2!
  expect(d2.usage.used).toBe(2)
})

test('Failed Gemini call does NOT consume quota', async () => {
  const clientId = 'test-fail-quota-' + Math.random()

  // Save an invalid key to trigger auth failure
  await app.request('/settings/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ key: 'AIzaSyInvalidKeyForTesting123' }),
  })

  // Mock global.fetch to return 401
  const origFetch = global.fetch
  // @ts-ignore
  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'API_KEY_INVALID' } }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

  try {
    const res = await app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientId },
      body: JSON.stringify({ keyPoints: 'Testing failed call' }),
    })
    expect(res.status).toBe(401)

    // Check usage is STILL 0
    const usageRes = await app.request('/plan/usage', {
      headers: { 'x-client-id': clientId },
    })
    const usageData = await usageRes.json()
    expect(usageData.used).toBe(0)
    expect(usageData.remaining).toBe(30)
  } finally {
    global.fetch = origFetch
  }
})
