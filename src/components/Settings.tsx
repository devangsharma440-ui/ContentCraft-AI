import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { Settings as SettingsIcon, Eye, EyeOff, Save, Trash2, Plug, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface KeyStatus {
  hasUserKey: boolean
  hasEnvKey: boolean
  activeSource: 'user' | 'environment' | 'none'
}

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

export function Settings() {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<StatusMessage | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/settings/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleSave = async () => {
    if (!key.trim()) {
      setMsg({ type: 'error', text: 'Please enter an API key.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await apiFetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Failed to save key.' })
      } else {
        setMsg({ type: 'success', text: data.message || 'Key saved successfully.' })
        setKey('')
        setShowKey(false)
        fetchStatus()
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Could not reach server.' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setMsg(null)
    try {
      const res = await apiFetch('/api/settings/key', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: data.message || 'Key removed.' })
        fetchStatus()
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to remove key.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' })
    } finally {
      setRemoving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setMsg(null)
    try {
      const res = await apiFetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.ok) {
        setMsg({ type: 'success', text: data.message || 'Connection successful.' })
      } else {
        setMsg({ type: 'error', text: data.error || 'Test failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Could not reach server.' })
    } finally {
      setTesting(false)
    }
  }

  const sourceLabel = status?.activeSource === 'user' ? 'User Key' : status?.activeSource === 'environment' ? 'Environment' : 'None (Demo Mode)'
  const sourceColor = status?.activeSource === 'user' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : status?.activeSource === 'environment' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-muted-foreground" /> Settings
      </h2>

      <Card className="mb-4">
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium">Active API Source</Label>
            <div className="mt-1.5">
              <Badge variant="secondary" className={sourceColor}>{sourceLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {status?.activeSource === 'none'
                ? 'No API key configured. The app is running in demo mode with template content.'
                : status?.activeSource === 'user'
                  ? 'A user-provided key is active. All tools use real Gemini generation.'
                  : 'An environment key is active. Set a user key below to override it.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="pr-10 font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSave} disabled={saving || !key.trim()} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is stored in server memory only. It is never logged, stored in the browser, or returned in API responses.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plug className="h-4 w-4 mr-1" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={removing || !status?.hasUserKey} className="text-destructive hover:text-destructive">
              {removing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Remove Key
            </Button>
          </div>

          {msg && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>
              {msg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {msg.text}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm mb-2">How API keys work</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Enter your Gemini API key above and click <strong>Save</strong>.</li>
            <li>• The key is stored in <strong>server memory only</strong> — it disappears on server restart.</li>
            <li>• Your key is <strong>never</strong> sent to the browser, stored in cookies/localStorage, or logged.</li>
            <li>• Click <strong>Test Connection</strong> to verify your key works with the Gemini API.</li>
            <li>• Click <strong>Remove Key</strong> to clear the saved key and return to environment/demo mode.</li>
            <li>• Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Google AI Studio</a>.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
