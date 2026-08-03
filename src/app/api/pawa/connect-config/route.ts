import { NextRequest, NextResponse } from 'next/server'
import { getInstallation, upsertConfig } from '@/lib/db'
import { registerPaymentProvider } from '@/lib/ghl'
import type { GhlConnectProviderRequest, GhlProviderModeConfig } from '@/lib/ghl-types'

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), source: 'connect_config', step, ...data }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), source: 'connect_config', level: 'error', step, ...data }))
}

export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json().catch(() => null)
    const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const installation = getInstallation(locationId)
    if (!installation) {
      logError('no_installation', { locationId })
      return NextResponse.json(
        { error: 'No installation found for this location. Please install the app from the Marketplace first.' },
        { status: 404 }
      )
    }

    const testMode: GhlProviderModeConfig | null = extractModeConfig(body, 'test', 'testMode')
    const liveMode: GhlProviderModeConfig | null = extractModeConfig(body, 'live', 'liveMode')

    upsertConfig({
      locationId,
      testModeApiKey: testMode?.apiKey ?? null,
      testModePublishableKey: testMode?.publishableKey ?? null,
      liveModeApiKey: liveMode?.apiKey ?? null,
      liveModePublishableKey: liveMode?.publishableKey ?? null,
      isLive: 0,
    })

    const hasValidKeys = (testMode?.apiKey || liveMode?.apiKey)
    if (!hasValidKeys) {
      log('connect_saved_no_keys', { locationId })
      return NextResponse.json({ success: true, message: 'Configuration saved. No API keys to connect.' })
    }

    const connectRequest: GhlConnectProviderRequest = {
      test: testMode?.apiKey ? testMode : null,
      live: liveMode?.apiKey ? liveMode : null,
    }

    log('connect_registering', { locationId, hasTest: !!connectRequest.test, hasLive: !!connectRequest.live })

    const result = await registerPaymentProvider(locationId, installation.accessToken, connectRequest)

    log('connect_done', {
      locationId,
      providerId: (result.provider as Record<string, unknown>)._id as string || (result.provider as Record<string, unknown>).id as string,
      connected: !!result.connect,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Config failed'
    logError('connect_error', {
      error: message,
      duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Extracts a GhlProviderModeConfig from the request body, checking both
 * the primary and fallback field names.
 */
function extractModeConfig(
  body: Record<string, unknown> | null,
  primaryField: string,
  fallbackField: string
): GhlProviderModeConfig | null {
  const source = body?.[primaryField] || body?.[fallbackField]
  if (!source || typeof source !== 'object') return null

  const obj = source as Record<string, unknown>
  const apiKey = typeof obj.apiKey === 'string' ? obj.apiKey.trim() : ''
  const publishableKey = typeof obj.publishableKey === 'string' ? obj.publishableKey.trim() : ''

  if (!apiKey && !publishableKey) return null

  return {
    apiKey: apiKey || '',
    publishableKey: publishableKey || apiKey || '',
  }
}
