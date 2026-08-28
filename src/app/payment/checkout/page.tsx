'use client'

import { useEffect, useState, useCallback } from 'react'
import PaymentForm from '@/components/PaymentForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GhlProductDetail {
  _id?: string
  name: string
  qty: number
  productId: string
  priceId: string
  isTaxesEnabled?: boolean
  taxes?: Array<{
    rate: number
    name: string
  }>
  prices?: Array<{
    _id?: string
    name?: string
    type?: string
    currency?: string
    amount: number
    compareAtPrice?: number
  }>
}

interface GhlPaymentContact {
  id: string
  name?: string
  email?: string
  contact?: string
  shippingAddress?: {
    city?: string
    country?: string
    line1?: string
    zipCode?: string
    state?: string
  }
}

interface GhlPaymentContext {
  publishableKey: string
  amount: number
  currency: string
  mode?: string
  contact?: GhlPaymentContact
  orderId?: string
  transactionId?: string
  subscriptionId?: string
  locationId: string
  invoiceId?: string
  language?: string
  productDetails?: GhlProductDetail[]
}

interface OrderSummary {
  subtotal: number
  tax: number
  discount: number
  shipping: number
  total: number
  currency: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  // GHL amounts are in cents, convert to decimal
  const decimalAmount = amount / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(decimalAmount)
}

function calculateSummary(context: GhlPaymentContext): OrderSummary {
  const products = context.productDetails || []

  // Calculate subtotal from products (amounts in cents)
  const subtotal = products.reduce((sum, product) => {
    const price = product.prices?.[0]?.amount || 0
    return sum + (price * product.qty)
  }, 0)

  // Calculate tax from products
  const tax = products.reduce((sum, product) => {
    if (!product.isTaxesEnabled || !product.taxes) return sum
    const productSubtotal = (product.prices?.[0]?.amount || 0) * product.qty
    const productTax = product.taxes.reduce((t, taxDef) => {
      return t + (productSubtotal * taxDef.rate)
    }, 0)
    return sum + productTax
  }, 0)

  // Use GHL total amount if available, otherwise calculate
  const total = context.amount > 0 ? context.amount * 100 : subtotal + tax

  return {
    subtotal: subtotal || total,
    tax,
    discount: 0,
    shipping: 0,
    total,
    currency: context.currency,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GhlPaymentPage() {
  const [context, setContext] = useState<GhlPaymentContext | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleMessage = useCallback((event: MessageEvent) => {
    let data = event.data

    // Handle JSON string messages (GHL sometimes sends stringified JSON)
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        // Not JSON, ignore
        return
      }
    }

    if (!data || !data.type) {
      console.log('[GHL Payment] Ignoring message without type:', event.data)
      return
    }

    console.log('[GHL Payment] Received message:', data.type, data)

    if (data.type === 'payment_initiate_props') {
      setContext({
        publishableKey: data.publishableKey || '',
        amount: data.amount || 0,
        currency: data.currency || 'USD',
        mode: data.mode || 'payment',
        contact: data.contact,
        orderId: data.orderId,
        transactionId: data.transactionId,
        subscriptionId: data.subscriptionId,
        locationId: data.locationId || '',
        invoiceId: data.invoiceId,
        language: data.language,
        productDetails: data.productDetails || [],
      })
      setError(null)
    }

    if (data.type === 'setup_initiate_props') {
      setContext({
        publishableKey: data.publishableKey || '',
        amount: 0,
        currency: data.currency || 'USD',
        mode: 'setup',
        contact: data.contact,
        locationId: data.locationId || '',
        productDetails: [],
      })
    }
  }, [])

  useEffect(() => {
    // Send ready event with retries (workaround for GHL timing issues)
    let retryCount = 0
    const maxRetries = 30
    const retryInterval = 500
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const sendReady = () => {
      console.log('[GHL Payment] Sending custom_provider_ready')
      window.parent.postMessage(
        JSON.stringify({
          type: 'custom_provider_ready',
          loaded: true,
          addCardOnFileSupported: false,
        }),
        '*'
      )
      retryCount++
    }

    // Send immediately
    sendReady()

    // Set up retry interval
    const interval = setInterval(() => {
      if (retryCount < maxRetries) {
        sendReady()
      } else {
        clearInterval(interval)
      }
    }, retryInterval)

    // Timeout: show error if no context received after 10 seconds
    timeoutId = setTimeout(() => {
      setContext(prev => {
        if (!prev) {
          setError('Timeout waiting for payment details from GoHighLevel. Please try again.')
        }
        return prev
      })
    }, 10000)

    window.addEventListener('message', handleMessage)

    return () => {
      clearInterval(interval)
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  const handlePaymentSuccess = async (result: { depositId: string; status: string; failureReason?: string }) => {
    setChargeId(result.depositId)

    if (result.status === 'ACCEPTED' || result.status === 'COMPLETED') {
      window.parent.postMessage(
        JSON.stringify({
          type: 'custom_element_success_response',
          chargeId: result.depositId,
        }),
        '*'
      )
    } else {
      const errorMsg = result.failureReason || `Payment status: ${result.status}`
      setError(errorMsg)
      window.parent.postMessage(
        JSON.stringify({
          type: 'custom_element_error_response',
          error: { description: errorMsg },
        }),
        '*'
      )
    }
  }

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg)
    window.parent.postMessage(
      JSON.stringify({
        type: 'custom_element_error_response',
        error: { description: errorMsg },
      }),
      '*'
    )
  }

  const handleClose = () => {
    window.parent.postMessage(
      JSON.stringify({ type: 'custom_element_close_response' }),
      '*'
    )
  }

  // Render loading state
  if (!context && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !context) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Render payment initiated state
  if (chargeId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Initiated</h2>
          <p className="text-gray-600 mb-2">Reference: {chargeId}</p>
          <p className="text-sm text-gray-500">Check your phone to complete the payment.</p>
        </div>
      </div>
    )
  }

  // Render checkout page
  const products = context?.productDetails || []
  const summary = context ? calculateSummary(context) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-purple-900">RvPawaPay Checkout</h1>
          <p className="text-sm text-purple-500 mt-1">Secure Mobile Payment</p>
        </div>

        {/* Customer Information */}
        {context?.contact && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{context.contact.name || 'Customer'}</p>
                  <p className="text-sm text-gray-500">{context.contact.email || ''}</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {summaryOpen && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <dl className="mt-3 space-y-2 text-sm">
                  {context.contact.name && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="text-gray-900">{context.contact.name}</dd>
                    </div>
                  )}
                  {context.contact.email && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900">{context.contact.email}</dd>
                    </div>
                  )}
                  {context.contact.contact && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="text-gray-900">{context.contact.contact}</dd>
                    </div>
                  )}
                  {context.orderId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Order ID</dt>
                      <dd className="font-mono text-xs text-gray-900">{context.orderId}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
        {/* Products */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Products</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {products.map((product, index) => {
                const unitPrice = product.prices?.[0]?.amount || 0
                const totalPrice = unitPrice * product.qty

                return (
                  <div key={product._id || index} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          Qty: {product.qty} × {formatCurrency(unitPrice, context?.currency || 'USD')}
                        </p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(totalPrice, context?.currency || 'USD')}
                      </p>
                    </div>
                    {product.taxes && product.taxes.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Tax: {product.taxes.map(t => `${t.name} (${(t.rate * 100).toFixed(1)}%)`).join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        {summary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Payment Summary</h2>
            </div>
            <div className="px-4 py-3">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd className="text-gray-900">{formatCurrency(summary.subtotal, summary.currency)}</dd>
                </div>
                {summary.tax > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tax</dt>
                    <dd className="text-gray-900">{formatCurrency(summary.tax, summary.currency)}</dd>
                  </div>
                )}
                {summary.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Discount</dt>
                    <dd className="text-green-600">-{formatCurrency(summary.discount, summary.currency)}</dd>
                  </div>
                )}
                {summary.shipping > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Shipping</dt>
                    <dd className="text-gray-900">{formatCurrency(summary.shipping, summary.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <dt className="font-semibold text-gray-900">Grand Total</dt>
                  <dd className="font-bold text-purple-900">
                    {formatCurrency(summary.total, summary.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Payment Method</h2>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Mobile Money</p>
                <p className="text-sm text-gray-500">via PawaPay</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {context && (
          <PaymentForm
            key={context.amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            ghlContext={context}
          />
        )}

        {/* Cancel Button */}
        <button
          onClick={handleClose}
          className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>

        {/* Error Display */}
        {error && context && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
