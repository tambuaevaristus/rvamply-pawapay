import { NextRequest, NextResponse } from 'next/server'
import { initiateDeposit } from '@/lib/pawapay'
import { PawapayProvider } from '@/lib/types'
import { upsertTransaction } from '@/lib/db'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { amount, currency, provider, phoneNumber, clientReferenceId, metadata } = body

    if (!amount || !currency || !provider || !phoneNumber) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: amount, currency, provider, phoneNumber',
        },
        { status: 400 }
      )
    }

    const depositId = generateUUID()

    const result = await initiateDeposit({
      depositId,
      amount: String(amount),
      currency: currency.toUpperCase(),
      payer: {
        type: 'MMO',
        accountDetails: {
          provider: provider as PawapayProvider,
          phoneNumber,
        },
      },
      clientReferenceId: clientReferenceId || undefined,
      customerMessage: 'Payment via rvamply',
      metadata: metadata || undefined,
    })

    const now = new Date().toISOString()

    upsertTransaction({
      id: depositId,
      depositId,
      locationId: metadata?.ghlLocationId || '',
      ghlTransactionId: metadata?.ghlTransactionId || null,
      contactId: metadata?.ghlContactId || null,
      opportunityId: null,
      amount: String(amount),
      currency: currency.toUpperCase(),
      provider,
      phoneNumber,
      status: result.status,
      clientReferenceId: clientReferenceId || null,
      metadata: JSON.stringify(metadata || {}),
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json(result, { status: result.status === 'ACCEPTED' ? 201 : 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Deposit initiation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
