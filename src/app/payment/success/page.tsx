'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PaymentStatus from '@/components/PaymentStatus'

function SuccessContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || 'N/A'
  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency')

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
      <div className="w-full max-w-lg text-center">
        <PaymentStatus
          status="success"
          reference={reference}
          amount={amount ? parseFloat(amount) : undefined}
          currency={currency || undefined}
        />
        <a
          href="/payment"
          className="inline-block mt-6 py-3 px-8 bg-purple-700 hover:bg-purple-800 text-white font-medium rounded-lg transition-colors"
        >
          Make Another Payment
        </a>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
