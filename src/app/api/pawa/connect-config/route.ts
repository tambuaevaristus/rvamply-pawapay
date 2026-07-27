import { NextRequest, NextResponse } from 'next/server'
import { getInstallation, upsertConfig } from '@/lib/db'
import { registerPaymentProvider } from '@/lib/ghl'
import type { GhlConnectProviderRequest, GhlProviderModeConfig } from '@/lib/ghl-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const locationId = typeof body?.locationId === 'string' ? body.locationId.trim() : ''

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const installation = getInstallation(locationId)
    if (!installation) {
      return NextResponse.json(
        { error: 'No installation found for this location. Please install the app from the Marketplace first.' },
        { status: 404 }
      )
    }

    const testMode: GhlProviderModeConfig | null = body?.test && typeof body.test === 'object'
      ? {
          apiKey: typeof body.test.apiKey === 'string' ? body.test.apiKey : '',
          publishableKey: typeof body.test.publishableKey === 'string' ? body.test.publishableKey : '',
        }
      : body?.testMode && typeof body.testMode === 'object'
        ? {
            apiKey: typeof body.testMode.apiKey === 'string' ? body.testMode.apiKey : '',
            publishableKey: typeof body.testMode.publishableKey === 'string' ? body.testMode.publishableKey : '',
          }
        : null

    const liveMode: GhlProviderModeConfig | null = body?.live && typeof body.live === 'object'
      ? {
          apiKey: typeof body.live.apiKey === 'string' ? body.live.apiKey : '',
          publishableKey: typeof body.live.publishableKey === 'string' ? body.live.publishableKey : '',
        }
      : body?.liveMode && typeof body.liveMode === 'object'
        ? {
            apiKey: typeof body.liveMode.apiKey === 'string' ? body.liveMode.apiKey : '',
            publishableKey: typeof body.liveMode.publishableKey === 'string' ? body.liveMode.publishableKey : '',
          }
        : null

    upsertConfig({
      locationId,
      testModeApiKey: testMode?.apiKey ?? null,
      testModePublishableKey: testMode?.publishableKey ?? null,
      liveModeApiKey: liveMode?.apiKey ?? null,
      liveModePublishableKey: liveMode?.publishableKey ?? null,
      isLive: 0,
    })

    const connectRequest: GhlConnectProviderRequest = { test: testMode, live: liveMode }
    const result = await registerPaymentProvider(locationId, installation.accessToken, connectRequest)

    console.log(`[GHL] Payment integration configured for ${locationId}:`, JSON.stringify(result))

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Config failed'
    console.error('[GHL] Connect config error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
