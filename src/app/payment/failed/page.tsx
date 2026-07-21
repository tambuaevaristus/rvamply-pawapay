'use client'

import { Suspense } from 'react'
import PaymentStatus from '@/components/PaymentStatus'

function FailedContent() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
      <div className="w-full max-w-lg text-center">
        <PaymentStatus status="failed" reference="N/A" />
        <a
          href="/payment"
          className="inline-block mt-6 py-3 px-8 bg-purple-700 hover:bg-purple-800 text-white font-medium rounded-lg transition-colors"
        >
          Try Again
        </a>
      </div>
    </main>
  )
}

export default function FailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <FailedContent />
    </Suspense>
  )
}
