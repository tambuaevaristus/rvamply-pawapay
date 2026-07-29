'use client'

import { useMemo, useState } from 'react'

export default function GhlAdminPage() {
  const locationId = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('locationId') || params.get('location_id')
  }, [])
  const [testApiKey, setTestApiKey] = useState('')
  const [liveApiKey, setLiveApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    if (!locationId) {
      setError('No location ID found. Open this page from your GoHighLevel payment settings.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/pawa/connect-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          test: testApiKey ? { apiKey: testApiKey, publishableKey: testApiKey } : null,
          live: liveApiKey ? { apiKey: liveApiKey, publishableKey: liveApiKey } : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save config')
      }

      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-purple-900">mountainHub PawaPay</h1>
          <p className="text-sm text-purple-500">Payment Provider Configuration</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Test Mode API Key
            </label>
            <input
              type="text"
              value={testApiKey}
              onChange={(e) => setTestApiKey(e.target.value)}
              placeholder="Enter PawaPay sandbox API key"
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-purple-400 mt-1">
              PawaPay sandbox API token for testing payments
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Live Mode API Key
            </label>
            <input
              type="text"
              value={liveApiKey}
              onChange={(e) => setLiveApiKey(e.target.value)}
              placeholder="Enter PawaPay production API key"
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-purple-400 mt-1">
              PawaPay production API token for live payments
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Configuration saved successfully!</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 px-6 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">How to get your API keys</h3>
          <ol className="text-sm text-purple-600 space-y-1 list-decimal list-inside">
            <li>Log in to the PawaPay dashboard</li>
            <li>Go to System Config &gt; API Tokens</li>
            <li>Generate a new API token</li>
            <li>Copy the token and paste it above</li>
            <li>Use sandbox tokens for testing, production tokens for live</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
