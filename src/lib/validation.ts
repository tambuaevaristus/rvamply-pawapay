export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentValidationError'
  }
}

function isValidCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value)
}

export function normalizeAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Number(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      throw new PaymentValidationError('Amount is required')
    }

    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new PaymentValidationError('Amount must be a positive number')
    }

    return parsed
  }

  throw new PaymentValidationError('Amount must be a positive number')
}

export function normalizeCurrency(value: unknown): string {
  if (typeof value !== 'string') {
    throw new PaymentValidationError('Currency is required')
  }

  const normalized = value.trim().toUpperCase()
  if (!isValidCurrencyCode(normalized)) {
    throw new PaymentValidationError('Currency must be a valid 3-letter ISO code')
  }

  return normalized
}

export function normalizePhoneNumber(value: unknown): string {
  if (typeof value !== 'string') {
    throw new PaymentValidationError('Phone number is required')
  }

  const cleaned = value.trim().replace(/[^+\d]/g, '')
  if (!cleaned || cleaned.length < 8) {
    throw new PaymentValidationError('Phone number must contain at least 8 digits')
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export function validateCreatePaymentBody(body: Record<string, unknown>): {
  amount: number
  currency: string
  provider: string
  phoneNumber: string
  clientReferenceId?: string
  metadata?: Record<string, unknown>
} {
  if (!body || typeof body !== 'object') {
    throw new PaymentValidationError('Request body must be an object')
  }

  const amount = normalizeAmount(body.amount)
  const currency = normalizeCurrency(body.currency)
  const provider = typeof body.provider === 'string' && body.provider.trim() ? body.provider.trim() : ''
  const phoneNumber = normalizePhoneNumber(body.phoneNumber)

  if (!provider) {
    throw new PaymentValidationError('Provider is required')
  }

  const clientReferenceId = typeof body.clientReferenceId === 'string' && body.clientReferenceId.trim()
    ? body.clientReferenceId.trim()
    : undefined

  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? (body.metadata as Record<string, unknown>)
    : undefined

  return { amount, currency, provider, phoneNumber, clientReferenceId, metadata }
}
