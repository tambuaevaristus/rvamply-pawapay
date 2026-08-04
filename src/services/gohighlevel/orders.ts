import { getInstallation } from '@/lib/db'
import { refreshAccessToken } from '@/lib/ghl'
import type { GhlOrder, GhlOrderResponse } from '@/lib/ghl-types'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'ghl-orders-service',
    step,
    ...data,
  }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'ghl-orders-service',
    level: 'error',
    step,
    ...data,
  }))
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderFetchError {
  error: string
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NETWORK' | 'UNKNOWN'
  details?: string
}

export interface OrderFetchResult {
  success: boolean
  order?: GhlOrder
  error?: OrderFetchError
}

// ─── HTTP Client ──────────────────────────────────────────────────────────────

async function ghlFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GHL_API_BASE}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  })

  return response
}

// ─── Token Management ─────────────────────────────────────────────────────────

async function getValidToken(locationId: string): Promise<string | null> {
  const installation = getInstallation(locationId)

  if (!installation) {
    logError('no_installation', { locationId })
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = installation.tokenExpiresAt &&
    installation.tokenExpiresAt < Date.now() + 5 * 60 * 1000

  if (!isExpired) {
    return installation.accessToken
  }

  // Token expired, try to refresh
  if (!installation.refreshToken) {
    logError('no_refresh_token', { locationId })
    return null
  }

  try {
    log('refreshing_token', { locationId })
    const tokenData = await refreshAccessToken(installation.refreshToken)

    // Update installation with new token
    const { upsertInstallation } = await import('@/lib/db')
    upsertInstallation({
      ...installation,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in
        ? Date.now() + tokenData.expires_in * 1000
        : null,
    })

    log('token_refreshed', { locationId })
    return tokenData.access_token
  } catch (error) {
    logError('token_refresh_failed', {
      locationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

// ─── Order Fetching ───────────────────────────────────────────────────────────

export async function getOrderById(
  orderId: string,
  locationId: string
): Promise<OrderFetchResult> {
  const start = Date.now()

  log('fetch_order_start', { orderId, locationId })

  // Validate inputs
  if (!orderId || !locationId) {
    logError('invalid_params', { orderId, locationId })
    return {
      success: false,
      error: {
        error: 'Order ID and Location ID are required',
        code: 'UNKNOWN',
      },
    }
  }

  // Get valid access token
  const accessToken = await getValidToken(locationId)
  if (!accessToken) {
    logError('no_access_token', { orderId, locationId })
    return {
      success: false,
      error: {
        error: 'Unable to authenticate with GoHighLevel',
        code: 'UNAUTHORIZED',
        details: 'No valid access token available for this location',
      },
    }
  }

  // Fetch order from GHL API
  try {
    log('api_request', {
      orderId,
      locationId,
      endpoint: `/payments/orders/${orderId}`,
    })

    const response = await ghlFetch(
      `/payments/orders/${orderId}`,
      accessToken
    )

    const duration = Date.now() - start
    const responseBody = await response.text()

    log('api_response', {
      orderId,
      locationId,
      status: response.status,
      duration_ms: duration,
      bodyLength: responseBody.length,
    })

    if (!response.ok) {
      let errorMessage = `GHL API error (HTTP ${response.status})`
      let errorCode: OrderFetchError['code'] = 'UNKNOWN'

      switch (response.status) {
        case 404:
          errorMessage = `Order not found: ${orderId}`
          errorCode = 'NOT_FOUND'
          break
        case 401:
          errorMessage = 'Authentication failed with GoHighLevel'
          errorCode = 'UNAUTHORIZED'
          break
        case 403:
          errorMessage = 'Insufficient permissions to access this order'
          errorCode = 'FORBIDDEN'
          break
      }

      logError('api_error', {
        orderId,
        locationId,
        status: response.status,
        error: errorMessage,
        responsePreview: responseBody.slice(0, 500),
      })

      return {
        success: false,
        error: {
          error: errorMessage,
          code: errorCode,
          details: responseBody.slice(0, 500),
        },
      }
    }

    // Parse response
    let orderData: GhlOrderResponse
    try {
      orderData = JSON.parse(responseBody)
    } catch (parseError) {
      logError('parse_error', {
        orderId,
        locationId,
        error: parseError instanceof Error ? parseError.message : 'Parse failed',
        bodyPreview: responseBody.slice(0, 500),
      })

      return {
        success: false,
        error: {
          error: 'Failed to parse GoHighLevel response',
          code: 'UNKNOWN',
          details: responseBody.slice(0, 500),
        },
      }
    }

    const order = orderData.order || orderData as unknown as GhlOrder

    log('fetch_order_success', {
      orderId,
      locationId,
      orderStatus: order.status,
      orderAmount: order.amount,
      currency: order.currency,
      itemCount: order.items?.length || 0,
      duration_ms: duration,
    })

    return {
      success: true,
      order,
    }
  } catch (error) {
    const duration = Date.now() - start

    logError('fetch_order_error', {
      orderId,
      locationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: duration,
    })

    return {
      success: false,
      error: {
        error: 'Failed to fetch order from GoHighLevel',
        code: error instanceof Error && error.name === 'TypeError'
          ? 'NETWORK'
          : 'UNKNOWN',
        details: error instanceof Error ? error.message : undefined,
      },
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calculateOrderSummary(order: GhlOrder) {
  const subtotal = order.subtotal || order.amount || 0
  const discount = order.discount || 0
  const taxTotal = order.items?.reduce((sum, item) => {
    const itemTax = item.taxes?.reduce((t, tax) => t + tax.amount, 0) || 0
    return sum + itemTax
  }, 0) || 0
  const shipping = order.processingCharges?.reduce((sum, charge) => sum + charge.amount, 0) || 0
  const total = order.amount || subtotal - discount + taxTotal + shipping

  return {
    subtotal,
    discount,
    tax: taxTotal,
    shipping,
    total,
    currency: order.currency,
  }
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount / 100) // GHL amounts are in cents
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
