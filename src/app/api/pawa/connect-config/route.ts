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

    log('connect_config_received', {
      locationId,
      hasBody: !!body,
      bodyKeys: body ? Object.keys(body) : [],
      testPresent: !!(body?.test || body?.testMode),
      livePresent: !!(body?.live || body?.liveMode),
    })

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

    log('installation_found', {
      locationId,
      hasAccessToken: !!installation.accessToken,
      installedAt: installation.installedAt,
    })

    // Extract test config (supports both 'test' and 'testMode' field names)
    const testMode: GhlProviderModeConfig | null = extractModeConfig(body, 'test', 'testMode')

    // Extract live config (supports both 'live' and 'liveMode' field names)
    const liveMode: GhlProviderModeConfig | null = extractModeConfig(body, 'live', 'liveMode')

    log('config_extracted', {
      locationId,
      hasTest: !!testMode,
      testApiKeyLength: testMode?.apiKey?.length || 0,
      testPublishableKeyLength: testMode?.publishableKey?.length || 0,
      hasLive: !!liveMode,
      liveApiKeyLength: liveMode?.apiKey?.length || 0,
      livePublishableKeyLength: liveMode?.publishableKey?.length || 0,
    })

    // Save to local store
    upsertConfig({
      locationId,
      testModeApiKey: testMode?.apiKey ?? null,
      testModePublishableKey: testMode?.publishableKey ?? null,
      liveModeApiKey: liveMode?.apiKey ?? null,
      liveModePublishableKey: liveMode?.publishableKey ?? null,
      isLive: 0,
    })

    log('config_saved_locally', { locationId })

    // Only connect if there are valid keys
    const hasValidKeys = (testMode?.apiKey || liveMode?.apiKey)
    if (!hasValidKeys) {
      log('connect_skipped_no_keys', { locationId })
      return NextResponse.json({ success: true, message: 'Configuration saved. No API keys to connect.' })
    }

    // Register/connect the provider with GHL
    const connectRequest: GhlConnectProviderRequest = {
      test: testMode?.apiKey ? testMode : null,
      live: liveMode?.apiKey ? liveMode : null,
    }

    log('registering_provider', {
      locationId,
      connectRequest: {
        hasTest: !!connectRequest.test,
        testApiKeyLength: connectRequest.test?.apiKey?.length || 0,
        hasLive: !!connectRequest.live,
        liveApiKeyLength: connectRequest.live?.apiKey?.length || 0,
      },
    })

    const registerStart = Date.now()
    const result = await registerPaymentProvider(locationId, installation.accessToken, connectRequest)
    const registerDuration = Date.now() - registerStart

    log('connect_config_success', {
      locationId,
      providerId: (result.provider as Record<string, unknown>)._id as string || (result.provider as Record<string, unknown>).id as string,
      connectExecuted: !!result.connect,
      duration_ms: Date.now() - start,
      registerDuration_ms: registerDuration,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Config failed'
    logError('connect_config_error', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
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
