// Centralized API client helper for ContentCraft AI
// Ensures persistent client device identification across sessions and cookie resets.

export function getClientId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem('contentcraft-client-id')
    if (!id || id.length < 8) {
      id = crypto.randomUUID()
      localStorage.setItem('contentcraft-client-id', id)
    }
    return id
  } catch {
    return ''
  }
}

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const clientId = getClientId()
  const headers = new Headers(init.headers || {})
  if (clientId) {
    headers.set('x-client-id', clientId)
  }
  return fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers,
  })
}

export interface UsageState {
  plan: 'free' | 'pro'
  name: string
  used: number
  limit: number
  remaining: number
  period: string
  priority: 'standard' | 'pro'
  priorityLabel: string
  badge: string
  badgeColor: string
  features: string[]
  allowLongForm?: boolean
  allowAdvancedOptions?: boolean
}
