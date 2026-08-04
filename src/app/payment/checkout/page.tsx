'use client'

import { useEffect, useState } from 'react'
import PaymentForm from '@/components/PaymentForm'

interface GhlPaymentContext {
  publishableKey: string
  amount: number
  currency: string
  contact?: {
    id: string
    name?: string
    email?: string
    contact?: string
  }
  orderId?: string
  transactionId?: string
  locationId: string
  productDetails?: {
    productId?: string
    priceId?: string
  }
}

export default function GhlPaymentPage() {
  const [context, setContext] = useState<GhlPaymentContext | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(true)

  useEffect(() => {
    window.parent.postMessage(
      { type: 'custom_provider_ready', loaded: true, addCardOnFileSupported: false },
      '*'
    )

    function handleMessage(event: MessageEvent) {
      const data = event.data
      if (!data || !data.type) return

      console.log('[GHL Payment] Received message:', data.type, data)

      if (data.type === 'payment_initiate_props') {
        setContext({
          publishableKey: data.publishableKey || '',
          amount: data.amount || 0,
          currency: data.currency || 'USD',
          contact: data.contact,
          orderId: data.orderId,
          transactionId: data.transactionId,
          locationId: data.locationId || '',
          productDetails: data.productDetails,
        })
      }

      if (data.type === 'setup_initiate_props') {
        setContext({
          publishableKey: data.publishableKey || '',
          amount: 0,
          currency: data.currency || 'USD',
          contact: data.contact,
          locationId: data.locationId || '',
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handlePaymentSuccess = async (result: { depositId: string; status: string }) => {
    setChargeId(result.depositId)

    if (result.status === 'ACCEPTED' || result.status === 'COMPLETED') {
      window.parent.postMessage(
        {
          type: 'custom_element_success_response',
          chargeId: result.depositId,
        },
        '*'
      )
    } else {
      window.parent.postMessage(
        {
          type: 'custom_element_error_response',
          error: { description: 'Payment was not accepted by the provider.' },
        },
        '*'
      )
    }
  }

  const handlePaymentError = (error: string) => {
    window.parent.postMessage(
      {
        type: 'custom_element_error_response',
        error: { description: error },
      },
      '*'
    )
  }

  const handleClose = () => {
    window.parent.postMessage({ type: 'custom_element_close_response' }, '*')
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto p-4">
        {chargeId ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-purple-900 mb-2">Payment Initiated</h2>
            <p className="text-purple-500 mb-4">Reference: {chargeId}</p>
            <p className="text-sm text-purple-400">Check your phone to complete the payment.</p>
          </div>
        ) : (
          <>
            {context && (
              <div className="mb-4 border border-purple-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSummaryOpen(!summaryOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {context.amount > 0 && (
                      <span className="text-lg font-bold text-purple-900">
                        {context.currency} {context.amount.toFixed(2)}
                      </span>
                    )}
                    {context.contact?.name && (
                      <span className="text-sm text-purple-600">
                        {context.contact.name}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-purple-500 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {summaryOpen && (
                  <div className="px-4 py-3 bg-white border-t border-purple-100">
                    <dl className="space-y-2 text-sm">
                      {context.amount > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Amount</dt>
                          <dd className="font-semibold text-purple-900">
                            {context.currency} {context.amount.toFixed(2)}
                          </dd>
                        </div>
                      )}
                      {context.contact?.name && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Payer</dt>
                          <dd className="text-purple-900">{context.contact.name}</dd>
                        </div>
                      )}
                      {context.contact?.email && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Email</dt>
                          <dd className="text-purple-900">{context.contact.email}</dd>
                        </div>
                      )}
                      {context.orderId && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Order ID</dt>
                          <dd className="font-mono text-xs text-purple-900">{context.orderId}</dd>
                        </div>
                      )}
                      {context.productDetails?.productId && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Product ID</dt>
                          <dd className="font-mono text-xs text-purple-900">{context.productDetails.productId}</dd>
                        </div>
                      )}
                      {context.productDetails?.priceId && (
                        <div className="flex justify-between">
                          <dt className="text-purple-500">Price ID</dt>
                          <dd className="font-mono text-xs text-purple-900">{context.productDetails.priceId}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            )}
            <PaymentForm
              key={context?.amount || 'initial'}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              ghlContext={context || undefined}
            />
            <button
              onClick={handleClose}
              className="w-full mt-3 py-2 text-sm text-purple-500 hover:text-purple-700 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
