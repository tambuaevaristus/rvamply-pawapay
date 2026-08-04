'use client'

import { useState } from 'react'
import { PawapayProvider } from '@/lib/types'

interface CountryConfig {
  label: string
  alpha3: string
  currency: string
  providers: { value: PawapayProvider; label: string }[]
}

const COUNTRIES: Record<string, CountryConfig> = {
  KE: {
    label: 'Kenya',
    alpha3: 'KEN',
    currency: 'KES',
    providers: [{ value: 'MPESA_KEN', label: 'M-Pesa' }],
  },
  TZ: {
    label: 'Tanzania',
    alpha3: 'TZA',
    currency: 'TZS',
    providers: [
      { value: 'AIRTEL_TZA', label: 'Airtel' },
      { value: 'VODACOM_TZA', label: 'Vodacom M-Pesa' },
      { value: 'TIGO_TZA', label: 'Tigo' },
      { value: 'HALOTEL_TZA', label: 'Halotel' },
    ],
  },
  GH: {
    label: 'Ghana',
    alpha3: 'GHA',
    currency: 'GHS',
    providers: [
      { value: 'MTN_MOMO_GHA', label: 'MTN Mobile Money' },
      { value: 'AIRTELTIGO_GHA', label: 'AT Money' },
      { value: 'VODAFONE_GHA', label: 'Vodafone Cash' },
    ],
  },
  SN: {
    label: 'Senegal',
    alpha3: 'SEN',
    currency: 'XOF',
    providers: [
      { value: 'ORANGE_SEN', label: 'Orange Money' },
      { value: 'FREE_SEN', label: 'Free Money' },
      { value: 'WAVE_SEN', label: 'Wave' },
    ],
  },
  CI: {
    label: "Côte d'Ivoire",
    alpha3: 'CIV',
    currency: 'XOF',
    providers: [
      { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money' },
      { value: 'ORANGE_CIV', label: 'Orange Money' },
      { value: 'WAVE_CIV', label: 'Wave' },
    ],
  },
  UG: {
    label: 'Uganda',
    alpha3: 'UGA',
    currency: 'UGX',
    providers: [
      { value: 'MTN_MOMO_UGA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_OAPI_UGA', label: 'Airtel Money' },
    ],
  },
  RW: {
    label: 'Rwanda',
    alpha3: 'RWA',
    currency: 'RWF',
    providers: [
      { value: 'MTN_MOMO_RWA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_RWA', label: 'Airtel Money' },
    ],
  },
  ZM: {
    label: 'Zambia',
    alpha3: 'ZMB',
    currency: 'ZMW',
    providers: [
      { value: 'MTN_MOMO_ZMB', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_OAPI_ZMB', label: 'Airtel Money' },
      { value: 'ZAMTEL_ZMB', label: 'Zamtel' },
    ],
  },
  CM: {
    label: 'Cameroon',
    alpha3: 'CMR',
    currency: 'XAF',
    providers: [
      { value: 'MTN_MOMO_CMR', label: 'MTN Mobile Money' },
      { value: 'ORANGE_CMR', label: 'Orange Money' },
    ],
  },
  ML: {
    label: 'Mali',
    alpha3: 'MLI',
    currency: 'XOF',
    providers: [
      { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money' },
      { value: 'ORANGE_CIV', label: 'Orange Money' },
    ],
  },
  MW: {
    label: 'Malawi',
    alpha3: 'MWI',
    currency: 'MWK',
    providers: [
      { value: 'AIRTEL_MWI', label: 'Airtel Money' },
      { value: 'TNM_MWI', label: 'TNM Mpamba' },
    ],
  },
  NG: {
    label: 'Nigeria',
    alpha3: 'NGA',
    currency: 'NGN',
    providers: [
      { value: 'MTN_MOMO_NGA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_NGA', label: 'Airtel Money' },
    ],
  },
  CD: {
    label: 'DRC',
    alpha3: 'COD',
    currency: 'CDF',
    providers: [
      { value: 'VODACOM_MPESA_COD', label: 'Vodacom M-Pesa' },
      { value: 'AIRTEL_COD', label: 'Airtel Money' },
      { value: 'ORANGE_COD', label: 'Orange Money' },
    ],
  },
  BJ: {
    label: 'Benin',
    alpha3: 'BEN',
    currency: 'XOF',
    providers: [
      { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money' },
      { value: 'MOOV_BEN', label: 'Moov' },
    ],
  },
  ET: {
    label: 'Ethiopia',
    alpha3: 'ETH',
    currency: 'ETB',
    providers: [{ value: 'MPESA_ETH', label: 'M-Pesa' }],
  },
  LS: {
    label: 'Lesotho',
    alpha3: 'LSO',
    currency: 'LSL',
    providers: [{ value: 'MPESA_LSO', label: 'M-Pesa' }],
  },
  MZ: {
    label: 'Mozambique',
    alpha3: 'MOZ',
    currency: 'MZN',
    providers: [
      { value: 'VODACOM_MOZ', label: 'Vodacom M-Pesa' },
      { value: 'MOVITEL_MOZ', label: 'Movitel' },
    ],
  },
  SL: {
    label: 'Sierra Leone',
    alpha3: 'SLE',
    currency: 'SLE',
    providers: [{ value: 'ORANGE_SLE', label: 'Orange Money' }],
  },
}

interface GhlContext {
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

interface PaymentFormProps {
  onSuccess?: (result: { depositId: string; status: string; failureReason?: string }) => void
  onError?: (error: string) => void
  ghlContext?: GhlContext
}

export default function PaymentForm({ onSuccess, onError, ghlContext }: PaymentFormProps) {
  const initialName = ghlContext?.contact?.name?.split(' ') || []

  const [countryCode, setCountryCode] = useState('')
  const [provider, setProvider] = useState<PawapayProvider | ''>('')
  const [phoneNumber, setPhoneNumber] = useState(ghlContext?.contact?.contact || '')
  const [amount, setAmount] = useState(ghlContext?.amount ? String(ghlContext.amount) : '')
  const [email, setEmail] = useState(ghlContext?.contact?.email || '')
  const [firstName, setFirstName] = useState(initialName[0] || '')
  const [lastName, setLastName] = useState(initialName.slice(1).join(' '))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const country = countryCode ? COUNTRIES[countryCode] : null
  const currency = ghlContext?.currency || country?.currency || 'USD'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        amount,
        currency,
        provider,
        phoneNumber,
        clientReferenceId: ghlContext?.transactionId
          ? `ghl-${ghlContext.transactionId}`
          : `${firstName}-${Date.now()}`,
        metadata: {
          firstName,
          lastName,
          email,
          phone: phoneNumber,
          ...(ghlContext?.locationId ? { ghlLocationId: ghlContext.locationId } : {}),
          ...(ghlContext?.contact?.id ? { ghlContactId: ghlContext.contact.id } : {}),
          ...(ghlContext?.orderId ? { ghlOrderId: ghlContext.orderId } : {}),
          ...(ghlContext?.transactionId ? { ghlTransactionId: ghlContext.transactionId } : {}),
        },
      }

      const response = await fetch('/api/pawapay/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || data.failureReason?.failureMessage || 'Deposit failed'
        )
      }

      if (onSuccess) {
        onSuccess({
          depositId: data.depositId,
          status: data.status,
          failureReason: data.failureReason?.failureMessage,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
      if (onError) onError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-8 space-y-6 border border-purple-100"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-purple-900">
            Mobile Money Payment
          </h2>
          <p className="text-sm text-purple-400 mt-1">
            Pay via mobile money across Africa
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Country
            </label>
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value)
                setProvider('')
              }}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select country</option>
              {Object.entries(COUNTRIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-700 mb-1">
              Mobile Money Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as PawapayProvider)}
              required
              disabled={!country}
              className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Select provider</option>
              {country?.providers.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Mobile Number (with country code, e.g. 260763456789)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="260763456789"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Amount ({currency})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
            step="1"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-purple-200 bg-white text-purple-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>

        <p className="text-xs text-center text-purple-400">
          Secured by <span className="font-semibold text-red-500">PawaPay</span> &bull;
          Mobile Money Powered
        </p>
      </form>
    </div>
  )
}
