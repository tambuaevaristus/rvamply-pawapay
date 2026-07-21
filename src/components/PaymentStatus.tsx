interface PaymentStatusProps {
  status: 'success' | 'failed' | 'pending'
  reference: string
  amount?: number
  currency?: string
}

export default function PaymentStatus({ status, reference, amount, currency }: PaymentStatusProps) {
  const statusConfig = {
    success: {
      icon: (
        <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Payment Successful',
      subtitle: 'Your payment has been processed successfully.',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    failed: {
      icon: (
        <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Payment Failed',
      subtitle: 'We could not process your payment. Please try again.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    pending: {
      icon: (
        <svg className="w-16 h-16 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Payment Pending',
      subtitle: 'Waiting for payment confirmation. Check your phone.',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`w-full max-w-md mx-auto ${config.bgColor} border ${config.borderColor} rounded-xl p-8 text-center`}>
      <div className="flex justify-center mb-4">{config.icon}</div>
      <h2 className="text-2xl font-bold text-purple-900 mb-2">{config.title}</h2>
      <p className="text-purple-500 mb-4">{config.subtitle}</p>

      {amount && currency && (
        <p className="text-3xl font-bold text-purple-900 mb-4">
          {currency} {amount.toFixed(2)}
        </p>
      )}

      <div className="bg-white rounded-lg p-3 inline-block border border-purple-100">
        <p className="text-xs text-purple-400">Reference</p>
        <p className="text-sm font-mono font-medium text-purple-900">{reference}</p>
      </div>
    </div>
  )
}
