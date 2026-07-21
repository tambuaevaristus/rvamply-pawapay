import { NextRequest, NextResponse } from 'next/server'
import { checkDepositStatus } from '@/lib/pawapay'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const depositId = searchParams.get('depositId')

    if (!depositId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: depositId' },
        { status: 400 }
      )
    }

    const result = await checkDepositStatus(depositId)

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Deposit status check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
