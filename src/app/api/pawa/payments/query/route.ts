import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, getTransactionByGhlId } from '@/lib/db'
import { checkDepositStatus } from '@/lib/pawapay'
import type { GhlPaymentQueryRequest } from '@/lib/ghl-types'

export async function POST(request: NextRequest) {
  try {
    const body: GhlPaymentQueryRequest = await request.json()
    const { type, transactionId, chargeId } = body

    switch (type) {
      case 'verify':
        return await handleVerify(transactionId, chargeId)

      case 'refund':
        return NextResponse.json({
          failed: true,
          message: 'Refunds are not supported for mobile money payments. Please process refunds directly via the PawaPay dashboard.',
        })

      case 'list_payment_methods':
        return handleListPaymentMethods()

      case 'charge_payment':
        return NextResponse.json({
          failed: true,
          message: 'Direct charging is not supported for mobile money payments. Use the paymentsUrl checkout flow instead.',
        })

      default:
        return NextResponse.json({ failed: true, message: `Unknown query type: ${type}` })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query processing failed'
    console.error(`[query] error: ${message}`)
    return NextResponse.json({ success: false, failed: true, message }, { status: 500 })
  }
}

async function handleVerify(transactionId?: string, chargeId?: string) {
  const tx = transactionId
    ? getTransactionByGhlId(transactionId)
    : chargeId
      ? getTransaction(chargeId)
      : null

  if (tx) {
    const amount = parseFloat(tx.amount)

    if (tx.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        chargeId: tx.depositId,
        chargeSnapshot: {
          id: tx.depositId,
          status: 'COMPLETED',
          amount,
          chargeId: tx.depositId,
          chargedAt: new Date(tx.updatedAt).getTime(),
        },
      })
    }

    if (tx.status === 'FAILED') {
      return NextResponse.json({
        failed: true,
        chargeId: tx.depositId,
        message: 'Payment failed',
      })
    }

    return NextResponse.json({
      success: false,
      chargeId: tx.depositId,
      message: `Payment status: ${tx.status}`,
    })
  }

  if (chargeId) {
    try {
      const depositResponse = await checkDepositStatus(chargeId)
      if (depositResponse.status === 'FOUND' && depositResponse.data) {
        const s = depositResponse.data.status
        const amount = parseFloat(depositResponse.data.amount)

        if (s === 'COMPLETED') {
          return NextResponse.json({
            success: true,
            chargeId: depositResponse.data.depositId,
            chargeSnapshot: {
              id: depositResponse.data.depositId,
              status: 'COMPLETED',
              amount,
              chargeId: depositResponse.data.depositId,
              chargedAt: new Date(depositResponse.data.created).getTime(),
            },
          })
        }

        if (s === 'FAILED') {
          return NextResponse.json({
            failed: true,
            chargeId: depositResponse.data.depositId,
            message: depositResponse.data.failureReason?.failureMessage || 'Payment failed',
          })
        }

        return NextResponse.json({
          success: false,
          chargeId: depositResponse.data.depositId,
          message: `Payment status: ${s}`,
        })
      }
    } catch {
      console.warn(`[query] pawapay check failed for chargeId=${chargeId}`)
    }
  }

  return NextResponse.json({ success: false, failed: true, message: 'Transaction not found' })
}

function handleListPaymentMethods() {
  return NextResponse.json([])
}
