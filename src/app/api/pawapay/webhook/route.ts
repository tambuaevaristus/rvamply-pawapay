import { NextRequest, NextResponse } from 'next/server'
import { parseCallbackPayload } from '@/lib/pawapay'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const callback = parseCallbackPayload(JSON.parse(payload))

    console.log(
      `[Pawapay] Deposit ${callback.depositId}: ${callback.status}`
    )

    return NextResponse.json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Callback processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
