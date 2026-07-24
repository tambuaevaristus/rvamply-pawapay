import Link from 'next/link'

const steps = [
  {
    number: '01',
    title: 'Choose a Country & Provider',
    description:
      'Select from 18 African countries and 40+ mobile money providers including M-Pesa, Orange Money, MTN MoMo, and Airtel Money.',
  },
  {
    number: '02',
    title: 'Enter Payment Details',
    description:
      'Provide the customer\'s phone number and payment amount. Our sandbox environment lets you test without real transactions.',
  },
  {
    number: '03',
    title: 'Process the Payment',
    description:
      'Submit the payment and track the status in real time. PawaPay handles the connection to the mobile money provider.',
  },
  {
    number: '04',
    title: 'Verify & Confirm',
    description:
      'Use our verification endpoint to confirm payment status. Webhook callbacks notify your system when payments complete.',
  },
]

export default function GetStarted() {
  return (
    <main className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-purple-50 to-white">
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-purple-900 mb-4">
            Get Started
          </h1>
          <p className="text-lg text-purple-700/70 max-w-lg mx-auto">
            Start accepting mobile money payments across Africa in minutes.
            No complex integrations required.
          </p>
        </div>

        <div className="space-y-6 mb-12">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-xl p-6 shadow-sm border border-purple-100 flex items-start gap-5"
            >
              <span className="text-3xl font-bold text-purple-300 leading-none mt-1 shrink-0">
                {step.number}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-purple-900 mb-1">
                  {step.title}
                </h2>
                <p className="text-purple-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-purple-700 rounded-xl p-8 text-center shadow-lg shadow-purple-200">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to try it?
          </h2>
          <p className="text-purple-200 mb-6 max-w-md mx-auto">
            Make a test payment in our sandbox environment. No real money involved.
          </p>
          <Link
            href="/payment"
            className="inline-flex items-center justify-center px-8 py-3 bg-white hover:bg-purple-50 text-purple-700 font-semibold rounded-lg transition-colors"
          >
            Make a Payment
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="text-center mt-8 mb-8">
          <Link href="/" className="text-purple-600 hover:text-purple-800 underline underline-offset-2">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}