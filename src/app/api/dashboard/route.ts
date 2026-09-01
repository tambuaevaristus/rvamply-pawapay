import { NextResponse } from 'next/server'
import { getAllInstallations, getAllTransactions } from '@/lib/db'

export async function GET() {
  const installations = getAllInstallations()
  const transactions = getAllTransactions()

  const grouped = new Map<string, {
    locationId: string
    totalTransactions: number
    totalAmount: number
    statusCounts: Record<string, number>
  }>()

  for (const installation of installations) {
    grouped.set(installation.locationId, {
      locationId: installation.locationId,
      totalTransactions: 0,
      totalAmount: 0,
      statusCounts: {},
    })
  }

  for (const tx of transactions) {
    const locationId = tx.locationId || 'unknown'
    const current = grouped.get(locationId) ?? {
      locationId,
      totalTransactions: 0,
      totalAmount: 0,
      statusCounts: {},
    }

    current.totalTransactions += 1
    current.totalAmount += Number(tx.amount || 0)
    current.statusCounts[tx.status] = (current.statusCounts[tx.status] || 0) + 1
    grouped.set(locationId, current)
  }

  const locations = Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount)

  const normalizedTransactions = transactions
    .map(tx => ({
      id: tx.id,
      depositId: tx.depositId,
      locationId: tx.locationId,
      amount: Number(tx.amount || 0),
      currency: tx.currency,
      status: tx.status,
      provider: tx.provider,
      phoneNumber: tx.phoneNumber,
      createdAt: tx.createdAt,
      clientReferenceId: tx.clientReferenceId,
      metadata: (() => {
        try {
          return tx.metadata ? JSON.parse(tx.metadata) : {}
        } catch {
          return {}
        }
      })(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({
    locations,
    transactions: normalizedTransactions,
  })
}
