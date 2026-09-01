'use client'

import { useMemo, useState } from 'react'
import { getAllInstallations, getAllTransactions } from '@/lib/db'

interface LocationSummary {
  locationId: string
  totalTransactions: number
  totalAmount: number
  statusCounts: Record<string, number>
}

interface TransactionViewModel {
  id: string
  depositId: string
  locationId: string
  amount: number
  currency: string
  status: string
  provider: string
  phoneNumber: string
  createdAt: string
  clientReferenceId: string | null
  metadata: Record<string, string>
}

function normalizeLocationLabel(locationId: string): string {
  return locationId.slice(0, 8) + '…'
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function DashboardPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const locations = useMemo(() => {
    const installations = getAllInstallations()
    const transactions = getAllTransactions()

    const grouped = new Map<string, LocationSummary>()

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

    return Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [])

  const selectedLocation = selectedLocationId
    ? locations.find(location => location.locationId === selectedLocationId) || null
    : null

  const transactionsForLocation = useMemo(() => {
    if (!selectedLocationId) return []

    return getAllTransactions()
      .filter(tx => tx.locationId === selectedLocationId)
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
  }, [selectedLocationId])

  const grandTotal = locations.reduce((sum, location) => sum + location.totalAmount, 0)

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-purple-500">Overview</p>
            <h1 className="text-3xl font-bold text-slate-900">Location dashboard</h1>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Balance</p>
            <p className="text-2xl font-bold text-emerald-900">{formatMoney(grandTotal, 'USD')}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Locations</h2>
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  {locations.length}
                </span>
              </div>

              <div className="space-y-3">
                {locations.length === 0 ? (
                  <p className="text-sm text-slate-500">No locations or transactions available yet.</p>
                ) : (
                  locations.map(location => (
                    <button
                      key={location.locationId}
                      type="button"
                      onClick={() => setSelectedLocationId(location.locationId)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedLocationId === location.locationId
                          ? 'border-purple-500 bg-purple-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-purple-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{normalizeLocationLabel(location.locationId)}</p>
                          <p className="text-xs text-slate-500">{location.totalTransactions} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{formatMoney(location.totalAmount, 'USD')}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedLocation ? (
              <>
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-purple-500">Location</p>
                    <h2 className="text-2xl font-bold text-slate-900">{normalizeLocationLabel(selectedLocation.locationId)}</h2>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-4 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total</p>
                    <p className="text-xl font-bold text-slate-900">{formatMoney(selectedLocation.totalAmount, 'USD')}</p>
                  </div>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  {Object.entries(selectedLocation.statusCounts).map(([status, count]) => (
                    <div key={status} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{status}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="px-3 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Items</th>
                        <th className="px-3 py-3 font-medium">Qty</th>
                        <th className="px-3 py-3 font-medium">Price</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                        <th className="px-3 py-3 font-medium">Provider</th>
                        <th className="px-3 py-3 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsForLocation.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No transactions for this location yet.</td>
                        </tr>
                      ) : (
                        transactionsForLocation.map(tx => {
                          const items = Array.isArray(tx.metadata?.items)
                            ? (tx.metadata.items as Array<Record<string, unknown>>)
                            : []
                          const itemCount = items.length || 1
                          const totalItems = items.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item?.quantity || 0), 0) || 1
                          const unitPrice = tx.amount / Math.max(totalItems, 1)

                          return (
                            <tr key={tx.id} className="border-b border-slate-200 last:border-b-0">
                              <td className="px-3 py-3 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                              <td className="px-3 py-3">
                                {items.length > 0 ? items.map((item: Record<string, unknown>, idx: number) => (
                                  <div key={`${tx.id}-${idx}`} className="text-slate-700">
                                    {String(item?.name || 'Item')}
                                  </div>
                                )) : <span className="text-slate-500">-</span>}
                              </td>
                              <td className="px-3 py-3">
                                {items.length > 0 ? items.map((item: Record<string, unknown>, idx: number) => (
                                  <div key={`${tx.id}-qty-${idx}`} className="text-slate-700">
                                    {Number(item?.quantity || 0)}
                                  </div>
                                )) : <span className="text-slate-500">{1}</span>}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {items.length > 0 ? items.map((item: Record<string, unknown>, idx: number) => (
                                  <div key={`${tx.id}-price-${idx}`} className="text-slate-700">
                                    {formatMoney(Number(item?.price || item?.unitPrice || 0), tx.currency)}
                                  </div>
                                )) : formatMoney(unitPrice, tx.currency)}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                  tx.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="px-3 py-3">{tx.provider}</td>
                              <td className="px-3 py-3 font-mono text-xs">{tx.clientReferenceId || tx.depositId}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-slate-500">
                Select a location to view transactions.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
