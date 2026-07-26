import { NextRequest, NextResponse } from 'next/server'
import { getInstallation } from '@/lib/db'
import { createPaymentIntegration, buildProviderConfig } from '@/lib/ghl'

export async function POST(request: NextRequest) {
  try {
    const { locationId } = await request.json()

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const installation = getInstallation(locationId)
    if (!installation) {
      return NextResponse.json({ error: 'No installation found for this location' }, { status: 404 })
    }

    const config = buildProviderConfig(locationId)

    const result = await createPaymentIntegration(config, installation.accessToken)

    console.log(`[GHL] Payment integration configured for ${locationId}:`, JSON.stringify(result))

    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Config failed'
    console.error('[GHL] Connect config error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
