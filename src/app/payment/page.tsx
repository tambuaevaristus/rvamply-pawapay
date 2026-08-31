'use client'

import { useEffect, useState } from 'react'
import PaymentForm from '@/components/PaymentForm'
import PaymentStatus from '@/components/PaymentStatus'
import { getMomoInstruction, getPaymentLifecycleStatus } from '@/lib/payment-status'

interface PaymentResult {
  status: 'pending' | 'success' | 'failed'
  reference: string
  amount?: number
  currency?: string
  provider?: string
}

const PAYMENT_TIMEOUT_MS = 60_000

export default function PaymentPage() {
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  useEffect(() => {
    if (!paymentResult || paymentResult.status !== 'pending' || !paymentResult.reference) {
      return
    }

    const startedAt = Date.now()
    let cancelled = false
    let pollTimer: number | undefined
    const timeoutTimer = window.setTimeout(() => {
      if (!cancelled) {
        setPaymentResult((current) => current ? { ...current, status: 'failed' } : current)
      }
    }, PAYMENT_TIMEOUT_MS)

    const markFinalState = (nextState: 'success' | 'failed') => {
      if (!cancelled) {
        setPaymentResult((current) => current ? { ...current, status: nextState } : current)
      }
    }

    const poll = async () => {
      if (cancelled) {
        return
      }

      if (Date.now() - startedAt >= PAYMENT_TIMEOUT_MS) {
        markFinalState('failed')
        return
      }

      try {
        const response = await fetch(
          `/api/pawapay/verify-payment?depositId=${encodeURIComponent(paymentResult.reference)}`,
          { cache: 'no-store' }
        )
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Unable to check payment status')
        }

        const lifecycleStatus = getPaymentLifecycleStatus(
          data?.status || data?.data?.status || data?.data?.data?.status
        )

        if (lifecycleStatus === 'success') {
          markFinalState('success')
          return
        }

        if (lifecycleStatus === 'failed') {
          markFinalState('failed')
          return
        }
      } catch (error) {
        console.warn('Payment poll failed:', error)
      }

      if (Date.now() - startedAt >= PAYMENT_TIMEOUT_MS) {
        markFinalState('failed')
        return
      }

      pollTimer = window.setTimeout(poll, 3000)
    }

    pollTimer = window.setTimeout(poll, 2000)

    return () => {
      cancelled = true
      if (pollTimer) window.clearTimeout(pollTimer)
      if (timeoutTimer) window.clearTimeout(timeoutTimer)
    }
  }, [paymentResult?.reference, paymentResult?.status])

  const handleSuccess = (result: { depositId: string; status: string; provider?: string; amount?: number; currency?: string }) => {
    const mappedStatus = getPaymentLifecycleStatus(result.status)

    setPaymentResult({
      status: mappedStatus,
      reference: result.depositId,
      amount: result.amount,
      currency: result.currency,
      provider: result.provider,
    })
  }

  const handleError = (error: string) => {
    setPaymentResult({
      status: 'failed',
      reference: 'N/A',
    })
    console.error('Payment error:', error)
  }

  const handleReset = () => {
    setPaymentResult(null)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-900">mountainHub.africa</h1>
          <p className="text-purple-500 mt-2">
            African Mobile Money Payments
          </p>
        </div>

        {paymentResult ? (
          <div className="space-y-6">
            <PaymentStatus
              status={paymentResult.status}
              reference={paymentResult.reference}
              amount={paymentResult.amount}
              currency={paymentResult.currency}
              instruction={paymentResult.status === 'pending' ? getMomoInstruction(paymentResult.provider) || 'Please complete the payment approval on your phone.' : undefined}
            />
            <button
              onClick={handleReset}
              className="w-full py-3 px-6 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium rounded-lg transition-colors"
            >
              New Payment
            </button>
          </div>
        ) : (
          <PaymentForm onSuccess={handleSuccess} onError={handleError} />
        )}
      </div>
    </main>
  )
}
