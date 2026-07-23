import { NextRequest, NextResponse } from 'next/server'
import { parseCallbackPayload } from '@/lib/pawapay'
import { getTransaction, upsertTransaction, getInstallation } from '@/lib/db'
import {
  createContact as ghlCreateContact,
  createOpportunity as ghlCreateOpportunity,
  updateOpportunityStage as ghlUpdateOpportunityStage,
} from '@/lib/ghl'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const callback = parseCallbackPayload(JSON.parse(payload))

    console.log(
      `[Pawapay] Deposit ${callback.depositId}: ${callback.status}`
    )

    const existing = getTransaction(callback.depositId)

    if (existing) {
      const now = new Date().toISOString()

      upsertTransaction({
        ...existing,
        status: callback.status,
        updatedAt: now,
      })
    }

    if (
      callback.status === 'COMPLETED' &&
      existing?.locationId &&
      existing?.contactId
    ) {
      const installation = getInstallation(existing.locationId)
      if (installation) {
        try {
          const opportunity = await ghlCreateOpportunity(
            {
              contactId: existing.contactId,
              locationId: existing.locationId,
              name: `PawaPay Payment - ${callback.currency} ${callback.amount}`,
              monetaryValue: parseFloat(callback.amount),
              status: 'completed',
            },
            installation.accessToken
          )

          if (existing.id) {
            upsertTransaction({
              ...existing,
              status: callback.status,
              opportunityId: (opportunity as Record<string, unknown>)?.id as string || null,
              updatedAt: new Date().toISOString(),
            })
          }

          console.log(
            `[GHL] Created opportunity for deposit ${callback.depositId}`
          )
        } catch (e) {
          console.error(
            `[GHL] Failed to create opportunity for ${callback.depositId}:`,
            e
          )
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Callback processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
