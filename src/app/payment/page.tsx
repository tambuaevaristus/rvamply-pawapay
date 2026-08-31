'use client'

import { useState } from 'react'
import PaymentForm from '@/components/PaymentForm'
import PaymentStatus from '@/components/PaymentStatus'
import { getPaymentLifecycleStatus } from '@/lib/payment-status'

export default function PaymentPage() {
  const [paymentResult, setPaymentResult] = useState<{
    status: 'pending' | 'success' | 'failed'
    reference: string
    amount?: number
    currency?: string
  } | null>(null)

  const handleSuccess = (result: { depositId: string; status: string }) => {
    const mappedStatus = getPaymentLifecycleStatus(result.status)

    setPaymentResult({
      status: mappedStatus,
      reference: result.depositId,
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
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
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
