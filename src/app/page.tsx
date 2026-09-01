import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-700 rounded-2xl mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-purple-900 mb-2">
            mountainHub
          </h1>
          <p className="text-2xl text-red-600 font-semibold mb-4">
            .africa
          </p>
          <p className="text-lg text-purple-700/70 mb-8 max-w-md mx-auto">
            Mobile money payment processing across Africa. Powered by PawaPay.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
            <div className="text-3xl font-bold text-purple-700 mb-1">18</div>
            <div className="text-sm text-purple-500">African Countries</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
            <div className="text-3xl font-bold text-purple-700 mb-1">40+</div>
            <div className="text-sm text-purple-500">Mobile Money Providers</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100">
            <div className="text-3xl font-bold text-red-600 mb-1">PawaPay</div>
            <div className="text-sm text-purple-500">Sandbox Ready</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/payment"
            className="inline-flex items-center justify-center px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-200"
          >
            Make a Payment
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 bg-white hover:bg-purple-50 text-purple-700 font-semibold rounded-lg border border-purple-200 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="text-sm text-purple-400">
            <p className="font-semibold text-purple-700">M-Pesa</p>
            <p>Kenya, DRC, Lesotho</p>
          </div>
          <div className="text-sm text-purple-400">
            <p className="font-semibold text-purple-700">Orange Money</p>
            <p>Senegal, Ivory Coast, DRC</p>
          </div>
          <div className="text-sm text-purple-400">
            <p className="font-semibold text-purple-700">MTN MoMo</p>
            <p>Ghana, Uganda, Rwanda, Zambia</p>
          </div>
          <div className="text-sm text-purple-400">
            <p className="font-semibold text-purple-700">Airtel Money</p>
            <p>Zambia, Malawi, Tanzania, DRC</p>
          </div>
        </div>
      </div>
    </main>
  )
}
