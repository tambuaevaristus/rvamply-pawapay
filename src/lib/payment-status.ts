export function getPaymentLifecycleStatus(status: string | undefined): 'pending' | 'success' | 'failed' {
  const normalized = String(status || '').trim().toUpperCase()

  if (['ACCEPTED', 'PROCESSING', 'IN_RECONCILIATION', 'PENDING', 'FOUND', 'INITIATED', 'QUEUED'].includes(normalized)) {
    return 'pending'
  }

  if (normalized === 'COMPLETED') {
    return 'success'
  }

  if (['FAILED', 'REJECTED', 'CANCELLED', 'CANCELED', 'TIMEOUT', 'EXPIRED', 'DUPLICATE_IGNORED', 'DECLINED'].includes(normalized)) {
    return 'failed'
  }

  return 'pending'
}

export function getMomoInstruction(provider?: string): string | null {
  if (!provider) {
    return null
  }

  const normalized = provider.toUpperCase()
  if (normalized.includes('MTN')) {
    return 'Dial *126# on your phone to approve the MTN Mobile Money payment.'
  }

  return null
}
