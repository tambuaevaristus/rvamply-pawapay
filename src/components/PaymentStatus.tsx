interface PaymentStatusProps {
  status: 'success' | 'failed' | 'pending'
  reference: string
  amount?: number
  currency?: string
  instruction?: string
}

export default function PaymentStatus({ status, reference, amount, currency, instruction }: PaymentStatusProps) {
  const statusConfig = {
    success: {
      icon: (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 ring-8 ring-purple-50">
          <svg className="h-10 w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      title: 'Payment Successful',
      subtitle: 'Your payment has been confirmed and processed successfully.',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-white',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900',
    },
    failed: {
      icon: (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50">
          <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      title: 'Payment Failed',
      subtitle: 'This payment could not be completed. Please try again or contact support.',
      bgColor: 'bg-gradient-to-br from-red-50 to-white',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
    },
    pending: {
      icon: (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 ring-8 ring-purple-50">
          <svg className="h-10 w-10 animate-spin text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      title: 'Waiting for confirmation',
      subtitle: 'Your payment has been initiated. Please complete the approval on your phone.',
      bgColor: 'bg-gradient-to-br from-purple-50 to-white',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-900',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`w-full max-w-lg mx-auto ${config.bgColor} border ${config.borderColor} rounded-2xl p-6 shadow-lg shadow-purple-100/60 text-center`}>
      <div className="flex justify-center mb-5">{config.icon}</div>
      <h2 className={`text-2xl font-bold ${config.textColor} mb-2`}>{config.title}</h2>
      <p className="text-sm text-purple-600 mb-5">{config.subtitle}</p>

      {status === 'pending' && instruction && (
        <div className="mb-5 rounded-xl border border-dashed border-purple-200 bg-white/80 p-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 mb-1">Action</p>
          <p className="text-sm text-purple-700">{instruction}</p>
        </div>
      )}

      {amount && currency && (
        <div className="mb-5 rounded-xl border border-purple-100 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-400">Amount</p>
          <p className="text-3xl font-bold text-purple-900 mt-2">
            {currency} {amount.toFixed(2)}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border border-purple-100">
        <p className="text-[10px] uppercase tracking-[0.2em] text-purple-400">Reference</p>
        <p className="mt-2 text-sm font-mono font-medium text-purple-900 break-all">{reference}</p>
      </div>
    </div>
  )
}
