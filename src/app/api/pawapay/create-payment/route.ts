import { NextRequest, NextResponse } from 'next/server'
import { initiateDeposit } from '@/lib/pawapay'
import { PawapayProvider } from '@/lib/types'
import { upsertTransaction } from '@/lib/db'
import { PaymentValidationError, validateCreatePaymentBody } from '@/lib/validation'

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'create_payment',
    step,
    ...data,
  }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'create_payment',
    level: 'error',
    step,
    ...data,
  }))
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object' },
        { status: 400 }
      )
    }

    const validated = validateCreatePaymentBody(body as Record<string, unknown>)
    const { amount, currency, provider, phoneNumber, clientReferenceId, metadata } = validated

    const depositId = generateUUID()

    log('deposit_initiate', {
      depositId,
      amount,
      currency,
      provider,
      phoneNumber: phoneNumber.slice(0, -4) + '****', // Mask phone
      clientReferenceId,
    })

    const result = await initiateDeposit({
      depositId,
      amount: String(amount),
      currency,
      payer: {
        type: 'MMO',
        accountDetails: {
          provider: provider as PawapayProvider,
          phoneNumber,
        },
      },
      clientReferenceId,
      customerMessage: 'Payment via rvamply',
      metadata: metadata ? Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value === 'string')) as Record<string, string> : undefined,
    })

    log('deposit_result', {
      depositId,
      status: result.status,
      failureReason: result.failureReason,
      duration_ms: Date.now() - start,
    })

    const now = new Date().toISOString()

    upsertTransaction({
      id: depositId,
      depositId,
      locationId: metadata?.ghlLocationId && typeof metadata.ghlLocationId === 'string' ? metadata.ghlLocationId : '',
      ghlTransactionId: metadata?.ghlTransactionId && typeof metadata.ghlTransactionId === 'string' ? metadata.ghlTransactionId : null,
      contactId: metadata?.ghlContactId && typeof metadata.ghlContactId === 'string' ? metadata.ghlContactId : null,
      opportunityId: null,
      amount: String(amount),
      currency,
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
    if (error instanceof PaymentValidationError) {
      logError('validation_error', { error: error.message, duration_ms: Date.now() - start })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const message =
      error instanceof Error ? error.message : 'Deposit initiation failed'
    logError('deposit_error', { error: message, duration_ms: Date.now() - start })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
