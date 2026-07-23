import { NextRequest, NextResponse } from 'next/server'
import { getTransaction, getTransactionByGhlId } from '@/lib/db'
import { checkDepositStatus } from '@/lib/pawapay'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, transactionId, chargeId } = body

    console.log(`[GHL Query] type=${type} transactionId=${transactionId} chargeId=${chargeId}`)

    if (type === 'verify') {
      const tx = transactionId
        ? getTransactionByGhlId(transactionId)
        : chargeId
          ? getTransaction(chargeId)
          : null

      if (!tx) {
        if (chargeId) {
          try {
            const status = await checkDepositStatus(chargeId)
            if (status.status === 'FOUND' && status.data) {
              const s = status.data.status
              if (s === 'COMPLETED') {
                return NextResponse.json({ success: true })
              } else if (s === 'FAILED') {
                return NextResponse.json({ failed: true })
              } else {
                return NextResponse.json({ success: false })
              }
            }
          } catch {
          }
        }
        return NextResponse.json({ success: false, failed: true })
      }

      if (tx.status === 'COMPLETED') {
        return NextResponse.json({ success: true })
      } else if (tx.status === 'FAILED') {
        return NextResponse.json({ failed: true })
      } else {
        return NextResponse.json({ success: false })
      }
    }

    if (type === 'refund') {
      return NextResponse.json({ failed: true, message: 'Refunds not supported for mobile money payments' })
    }

    if (type === 'list_payment_methods') {
      return NextResponse.json([])
    }

    if (type === 'charge_payment') {
      return NextResponse.json({ failed: true, message: 'Direct charging not supported. Use paymentsUrl for mobile money payments.' })
    }

    return NextResponse.json({ success: false, failed: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query processing failed'
    console.error('[GHL Query] Error:', message)
    return NextResponse.json({ success: false, failed: true })
  }
}
