'use client'

import { useCallback, useEffect, useState } from 'react'
import PaymentForm from '@/components/PaymentForm'
import { getPaymentLifecycleStatus } from '@/lib/payment-status'

interface GhlPaymentContext {
  publishableKey: string
  amount: number
  currency: string
  contact?: {
    id: string
    contact?: string
  }
  orderId?: string
  transactionId?: string
  locationId: string
}

export default function GhlPaymentPage() {
  const [context, setContext] = useState<GhlPaymentContext | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMessage = useCallback((event: MessageEvent) => {
    let data = event.data

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        return
      }
    }

    if (!data || typeof data !== 'object' || !data.type) return

    if (data.type === 'payment_initiate_props' || data.type === 'setup_initiate_props') {
      setContext({
        publishableKey: data.publishableKey || '',
        amount: data.type === 'setup_initiate_props' ? 0 : data.amount || 0,
        currency: data.currency || 'USD',
        contact: data.contact,
        orderId: data.orderId,
        transactionId: data.transactionId,
        locationId: data.locationId || '',
      })
      setError(null)
    }
  }, [])

  useEffect(() => {
    let retryCount = 0
    const interval = setInterval(() => {
      if (retryCount >= 30) {
        clearInterval(interval)
        return
      }

      window.parent.postMessage(JSON.stringify({
        type: 'custom_provider_ready',
        loaded: true,
        addCardOnFileSupported: false,
      }), '*')
      retryCount++
    }, 500)

    const timeout = setTimeout(() => {
      setContext((current) => {
        if (!current) setError('Unable to load payment details. Please try again.')
        return current
      })
    }, 10000)

    window.addEventListener('message', handleMessage)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  const notify = (message: Record<string, unknown>) => {
    window.parent.postMessage(JSON.stringify(message), '*')
  }

  const handleSuccess = (result: { depositId: string; status: string; failureReason?: string }) => {
    setChargeId(result.depositId)
    const mappedStatus = getPaymentLifecycleStatus(result.status)

    if (mappedStatus === 'success') {
      notify({ type: 'custom_element_success_response', chargeId: result.depositId })
    } else if (mappedStatus === 'failed') {
      const message = result.failureReason || `Payment status: ${result.status}`
      setError(message)
      notify({ type: 'custom_element_error_response', error: { description: message } })
    }
  }

  const handleError = (message: string) => {
    setError(message)
    notify({ type: 'custom_element_error_response', error: { description: message } })
  }

  const handleClose = () => notify({ type: 'custom_element_close_response' })

  if (!context && !error) {
    return <div className="payment-shell"><p className="payment-title">Loading payment details...</p></div>
  }

  if (error && !context) {
    return (
      <div className="payment-shell">
        <div className="payment-container">
          <h1 className="payment-title">Payment unavailable</h1>
          <div className="payment-card">
            <p className="payment-error">{error}</p>
            <button type="button" className="payment-submit" onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (chargeId) {
    return (
      <div className="payment-shell">
        <div className="payment-container">
          <h1 className="payment-title">Payment initiated</h1>
          <div className="payment-card">
            <p>Check your phone to approve the payment.</p>
            <p>Reference: {chargeId}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="payment-shell">
      <div className="payment-container">
        <h1 className="payment-title">Make payment</h1>
        <PaymentForm
          key={`${context?.amount}-${context?.currency}`}
          onSuccess={handleSuccess}
          onError={handleError}
          ghlContext={context || undefined}
        />
        {error && <p className="payment-error">{error}</p>}
      </div>
    </main>
  )
}
