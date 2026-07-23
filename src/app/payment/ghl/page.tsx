'use client'

import { useEffect, useState, useCallback } from 'react'
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
}

export default function GhlPaymentPage() {
  const [context, setContext] = useState<GhlPaymentContext | null>(null)
  const [ready, setReady] = useState(false)
  const [chargeId, setChargeId] = useState<string | null>(null)

  const dispatchReady = useCallback(() => {
    window.parent.postMessage(
      { type: 'custom_provider_ready', loaded: true, addCardOnFileSupported: false },
      '*'
    )
    setReady(true)
  }, [])

  useEffect(() => {
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
    dispatchReady()

    return () => window.removeEventListener('message', handleMessage)
  }, [dispatchReady])

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

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    )
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
              <div className="mb-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                {context.amount > 0 && (
                  <p className="font-semibold">
                    Amount: {context.currency} {context.amount.toFixed(2)}
                  </p>
                )}
                {context.contact?.name && <p>Payer: {context.contact.name}</p>}
                {context.orderId && <p>Order: {context.orderId}</p>}
              </div>
            )}
            <PaymentForm
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
