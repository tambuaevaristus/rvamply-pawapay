export function getPaymentLifecycleStatus(status: string | undefined): 'pending' | 'success' | 'failed' {
  const normalized = String(status || '').trim()

  if (['ACCEPTED', 'PROCESSING', 'IN_RECONCILIATION'].includes(normalized)) {
    return 'pending'
  }

  if (normalized === 'COMPLETED') {
    return 'success'
  }

  if (['FAILED', 'REJECTED', 'DUPLICATE_IGNORED'].includes(normalized)) {
    return 'failed'
  }

  return 'pending'
}
