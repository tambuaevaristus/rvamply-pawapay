import { NextRequest, NextResponse } from 'next/server'
import { removeInstallation } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('[GHL Webhook] Received:', JSON.stringify(payload))

    const { type, locationId, companyId } = payload

    if (type === 'AppUninstall' || type === 'app.uninstall') {
      if (locationId) {
        removeInstallation(locationId)
        console.log(`[GHL] Removed installation for location ${locationId}`)
      }

      return NextResponse.json({ received: true, action: 'uninstalled' })
    }

    if (type === 'AppInstall' || type === 'app.install') {
      console.log(`[GHL] App installed event for location ${locationId}`)
      return NextResponse.json({ received: true, action: 'installed' })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    console.error('[GHL Webhook] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
