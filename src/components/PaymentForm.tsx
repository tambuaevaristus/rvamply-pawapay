'use client'

import { useState } from 'react'
import { PawapayProvider } from '@/lib/types'

interface CountryConfig {
  label: string
  alpha3: string
  currency: string
  dialCode: string
  providers: { value: PawapayProvider; label: string }[]
}

const COUNTRIES: Record<string, CountryConfig> = {
  KE: {
    label: 'Kenya',
    alpha3: 'KEN',
    currency: 'KES',
    dialCode: '254',
    providers: [{ value: 'MPESA_KEN', label: 'M-Pesa' }],
  },
  TZ: {
    label: 'Tanzania',
    alpha3: 'TZA',
    currency: 'TZS',
    dialCode: '255',
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
    dialCode: '233',
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
    dialCode: '221',
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
    dialCode: '225',
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
    dialCode: '256',
    providers: [
      { value: 'MTN_MOMO_UGA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_OAPI_UGA', label: 'Airtel Money' },
    ],
  },
  RW: {
    label: 'Rwanda',
    alpha3: 'RWA',
    currency: 'RWF',
    dialCode: '250',
    providers: [
      { value: 'MTN_MOMO_RWA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_RWA', label: 'Airtel Money' },
    ],
  },
  ZM: {
    label: 'Zambia',
    alpha3: 'ZMB',
    currency: 'ZMW',
    dialCode: '260',
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
    dialCode: '237',
    providers: [
      { value: 'MTN_MOMO_CMR', label: 'MTN Mobile Money' },
      { value: 'ORANGE_CMR', label: 'Orange Money' },
    ],
  },
  ML: {
    label: 'Mali',
    alpha3: 'MLI',
    currency: 'XOF',
    dialCode: '223',
    providers: [
      { value: 'MTN_MOMO_CIV', label: 'MTN Mobile Money' },
      { value: 'ORANGE_CIV', label: 'Orange Money' },
    ],
  },
  MW: {
    label: 'Malawi',
    alpha3: 'MWI',
    currency: 'MWK',
    dialCode: '265',
    providers: [
      { value: 'AIRTEL_MWI', label: 'Airtel Money' },
      { value: 'TNM_MWI', label: 'TNM Mpamba' },
    ],
  },
  NG: {
    label: 'Nigeria',
    alpha3: 'NGA',
    currency: 'NGN',
    dialCode: '234',
    providers: [
      { value: 'MTN_MOMO_NGA', label: 'MTN Mobile Money' },
      { value: 'AIRTEL_NGA', label: 'Airtel Money' },
    ],
  },
  CD: {
    label: 'DRC',
    alpha3: 'COD',
    currency: 'CDF',
    dialCode: '243',
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
    dialCode: '229',
    providers: [
      { value: 'MTN_MOMO_BEN', label: 'MTN Mobile Money' },
      { value: 'MOOV_BEN', label: 'Moov' },
    ],
  },
  ET: {
    label: 'Ethiopia',
    alpha3: 'ETH',
    currency: 'ETB',
    dialCode: '251',
    providers: [{ value: 'MPESA_ETH', label: 'M-Pesa' }],
  },
  LS: {
    label: 'Lesotho',
    alpha3: 'LSO',
    currency: 'LSL',
    dialCode: '266',
    providers: [{ value: 'MPESA_LSO', label: 'M-Pesa' }],
  },
  MZ: {
    label: 'Mozambique',
    alpha3: 'MOZ',
    currency: 'MZN',
    dialCode: '258',
    providers: [
      { value: 'VODACOM_MOZ', label: 'Vodacom M-Pesa' },
      { value: 'MOVITEL_MOZ', label: 'Movitel' },
    ],
  },
  SL: {
    label: 'Sierra Leone',
    alpha3: 'SLE',
    currency: 'SLE',
    dialCode: '232',
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
  const [countryCode, setCountryCode] = useState('CM')
  const [provider, setProvider] = useState<PawapayProvider | ''>('')
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const digits = ghlContext?.contact?.contact?.replace(/\D/g, '') || ''
    return digits.startsWith(COUNTRIES.CM.dialCode) ? digits.slice(COUNTRIES.CM.dialCode.length) : digits
  })
  const [amount, setAmount] = useState(ghlContext?.amount ? String(ghlContext.amount) : '')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const country = countryCode ? COUNTRIES[countryCode] : null
  const currency = country?.currency || ghlContext?.currency || 'USD'
  const amountIsAutomatic = Boolean(ghlContext?.amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        amount,
        currency,
        provider,
        phoneNumber: country ? `${country.dialCode}${phoneNumber}` : phoneNumber,
        clientReferenceId: ghlContext?.transactionId
          ? `ghl-${ghlContext.transactionId}`
          : `rvpay-${Date.now()}`,
        metadata: {
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
      <form onSubmit={handleSubmit} className="payment-card">
        <div className="payment-amount-row">
          <div>
            <span className="payment-label">Payment amount</span>
            <strong>{amount || '0'} {currency}</strong>
          </div>
          {!amountIsAutomatic && <span className="payment-edit">Edit</span>}
        </div>
        {!amountIsAutomatic && (
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            required
            aria-label={`Payment amount in ${currency}`}
            className="payment-input payment-amount-input"
          />
        )}

        <div className="payment-field">
          <label className="payment-label" htmlFor="country">Country</label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => {
                const newCode = e.target.value
                setCountryCode(newCode)
                setProvider('')
                if (newCode && COUNTRIES[newCode]) {
                  const digits = phoneNumber.replace(/\D/g, '')
                  const dialCode = COUNTRIES[newCode].dialCode
                  const previousDialCode = country?.dialCode
                  const stripped = previousDialCode && digits.startsWith(previousDialCode)
                    ? digits.slice(previousDialCode.length)
                    : digits.startsWith(dialCode)
                      ? digits.slice(dialCode.length)
                      : digits
                  setPhoneNumber(stripped)
                }
              }}
              required
              className="payment-input payment-select"
            >
              <option value="">Select your country</option>
              {Object.entries(COUNTRIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.label}
                </option>
              ))}
            </select>
        </div>

        {country && (
          <div className="payment-field">
            <span className="payment-label">Select payment method</span>
            <div className="provider-grid">
              {country.providers.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`provider-option ${provider === item.value ? 'provider-option-selected' : ''}`}
                  onClick={() => setProvider(item.value)}
                  aria-pressed={provider === item.value}
                >
                  <span className={`provider-logo provider-${item.value.split('_')[0].toLowerCase()}`}>
                    {item.label.split(' ')[0]}
                  </span>
                  <span>{item.label.replace(' Mobile Money', '')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="payment-field">
          <label className="payment-label" htmlFor="phone">Mobile money number</label>
          <div className="phone-input-wrap">
            {country && <span className="dial-code">+{country.dialCode}</span>}
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setPhoneNumber(country && digits.startsWith(country.dialCode)
                  ? digits.slice(country.dialCode.length)
                  : digits)
              }}
              placeholder={country ? `${country.dialCode} 6XX XXX XXX` : 'Select country first'}
              required
              className="payment-input phone-input"
            />
          </div>
        </div>

        {error && (
          <div className="payment-error">
            <p>{error}</p>
          </div>
        )}

        <label className="terms-row">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
          <span>I agree to RvPay&apos;s <a href="#terms">Terms &amp; conditions</a></span>
        </label>

        <button
          type="submit"
          disabled={loading || !country || !provider || !agreed}
          className="payment-submit"
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
            `Pay ${amount || '0'}${currency}`
          )}
        </button>
      </form>
    </div>
  )
}
