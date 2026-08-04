import { NextRequest, NextResponse } from 'next/server'
import { getOrderById } from '@/services/gohighlevel/orders'

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'api_orders',
    step,
    ...data,
  }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'api_orders',
    level: 'error',
    step,
    ...data,
  }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const start = Date.now()

  try {
    const { orderId } = await params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    log('request_received', { orderId, locationId })

    // Validate parameters
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required (query parameter)' },
        { status: 400 }
      )
    }

    // Fetch order from GHL
    const result = await getOrderById(orderId, locationId)

    if (!result.success) {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404
        : result.error?.code === 'UNAUTHORIZED' ? 401
        : result.error?.code === 'FORBIDDEN' ? 403
        : 500

      logError('order_fetch_failed', {
        orderId,
        locationId,
        error: result.error?.error,
        code: result.error?.code,
        statusCode,
        duration_ms: Date.now() - start,
      })

      return NextResponse.json(
        { error: result.error?.error, code: result.error?.code },
        { status: statusCode }
      )
    }

    log('order_fetch_success', {
      orderId,
      locationId,
      orderStatus: result.order?.status,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({
      success: true,
      order: result.order,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    logError('unhandled_error', {
      error: message,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
