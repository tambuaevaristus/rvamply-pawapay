'use client'

import { useCallback, useEffect, useState } from 'react'
import PaymentForm from '@/components/PaymentForm'
import PaymentStatus from '@/components/PaymentStatus'
import { getMomoInstruction, getPaymentLifecycleStatus } from '@/lib/payment-status'

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

const PAYMENT_TIMEOUT_MS = 60_000

export default function GhlPaymentPage() {
  const [context, setContext] = useState<GhlPaymentContext | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [paymentState, setPaymentState] = useState<'pending' | 'success' | 'failed' | null>(null)
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
      setPaymentState('success')
      notify({ type: 'custom_element_success_response', chargeId: result.depositId })
      return
    }

    if (mappedStatus === 'failed') {
      setPaymentState('failed')
      const message = result.failureReason || `Payment status: ${result.status}`
      setError(message)
      notify({ type: 'custom_element_error_response', error: { description: message } })
      return
    }

    setPaymentState('pending')
  }

  const handleError = (message: string) => {
    setError(message)
    notify({ type: 'custom_element_error_response', error: { description: message } })
  }

  const handleClose = () => notify({ type: 'custom_element_close_response' })

  useEffect(() => {
    if (!chargeId || paymentState !== 'pending') return

    const startedAt = Date.now()
    let cancelled = false
    let pollTimer: number | undefined
    const timeoutTimer = window.setTimeout(() => {
      if (cancelled) return
      setPaymentState('failed')
      setError('Payment was not confirmed within 1 minute.')
      notify({ type: 'custom_element_error_response', error: { description: 'Payment was not confirmed within 1 minute.' } })
    }, PAYMENT_TIMEOUT_MS)

    const poll = async () => {
      if (cancelled) return

      try {
        const response = await fetch(`/api/pawapay/verify-payment?depositId=${encodeURIComponent(chargeId)}`, { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Unable to check payment status')
        }

        const resolvedStatus = data?.data?.status ?? data?.status ?? data?.data?.data?.status
        const lifecycleStatus = getPaymentLifecycleStatus(resolvedStatus)

        if (lifecycleStatus === 'success') {
          if (cancelled) return
          setPaymentState('success')
          notify({ type: 'custom_element_success_response', chargeId })
          return
        }

        if (lifecycleStatus === 'failed') {
          if (cancelled) return
          setPaymentState('failed')
          const message = data?.data?.failureReason?.failureMessage || 'Payment failed or was cancelled.'
          setError(message)
          notify({ type: 'custom_element_error_response', error: { description: message } })
          return
        }
      } catch (error) {
        console.warn('Payment status poll failed:', error)
      }

      if (Date.now() - startedAt >= PAYMENT_TIMEOUT_MS) {
        if (cancelled) return
        setPaymentState('failed')
        setError('Payment was not confirmed within 1 minute.')
        notify({ type: 'custom_element_error_response', error: { description: 'Payment was not confirmed within 1 minute.' } })
        return
      }

      pollTimer = window.setTimeout(poll, 3000)
    }

    pollTimer = window.setTimeout(poll, 2000)

    return () => {
      cancelled = true
      if (pollTimer) window.clearTimeout(pollTimer)
      window.clearTimeout(timeoutTimer)
    }
  }, [chargeId, paymentState])

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
    const instruction = paymentState === 'pending'
      ? getMomoInstruction(context?.currency?.toUpperCase().includes('XAF') ? 'MTN_MOMO_CMR' : undefined) || 'Please complete the payment approval on your phone.'
      : undefined

    return (
      <div className="payment-shell">
        <div className="payment-container">
          <PaymentStatus
            status={paymentState === 'success' ? 'success' : paymentState === 'failed' ? 'failed' : 'pending'}
            reference={chargeId}
            amount={context?.amount}
            currency={context?.currency}
            instruction={instruction}
          />
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
