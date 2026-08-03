import { NextRequest, NextResponse } from 'next/server'
import { removeInstallation } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { type, locationId } = payload

    if (type === 'AppUninstall' || type === 'app.uninstall') {
      if (locationId) {
        removeInstallation(locationId)
        console.log(`[webhook] uninstalled location=${locationId}`)
      }
      return NextResponse.json({ received: true, action: 'uninstalled' })
    }

    if (type === 'AppInstall' || type === 'app.install') {
      console.log(`[webhook] installed location=${locationId}`)
      return NextResponse.json({ received: true, action: 'installed' })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    console.error(`[webhook] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
