import {
  InitiateDepositRequest,
  InitiateDepositResponse,
  CheckDepositResponse,
  DepositCallbackPayload,
  PawapayEnvironment,
} from './types'

const BASE_URLS: Record<PawapayEnvironment, string> = {
  sandbox: 'https://api.sandbox.pawapay.io',
  production: 'https://api.pawapay.io',
}

function getConfig() {
  const environment = (process.env.PAWAPAY_ENVIRONMENT || 'sandbox') as PawapayEnvironment
  const apiToken = process.env.PAWAPAY_API_KEY

  if (!apiToken) {
    throw new Error('Pawapay API token not configured (PAWAPAY_API_KEY)')
  }

  return {
    baseUrl: BASE_URLS[environment],
    apiToken,
    environment,
  }
}

function getHeaders(): Record<string, string> {
  const config = getConfig()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiToken}`,
  }
}

export async function initiateDeposit(
  request: InitiateDepositRequest
): Promise<InitiateDepositResponse> {
  const config = getConfig()

  const body: Record<string, unknown> = {
    depositId: request.depositId,
    amount: request.amount,
    currency: request.currency,
    payer: request.payer,
  }

  if (request.clientReferenceId) {
    body.clientReferenceId = request.clientReferenceId
  }

  if (request.customerMessage) {
    body.customerMessage = request.customerMessage
  }

  if (request.metadata) {
    body.metadata = Object.entries(request.metadata).map(
      ([key, value]) => ({ [key]: value })
    )
  }

  const response = await fetch(
    `${config.baseUrl}/v2/deposits`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ errorMessage: response.statusText }))
    throw new Error(
      `Pawapay deposit failed: ${JSON.stringify(error)}`
    )
  }

  return response.json()
}

export async function checkDepositStatus(
  depositId: string
): Promise<CheckDepositResponse> {
  const config = getConfig()

  const response = await fetch(
    `${config.baseUrl}/v2/deposits/${depositId}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ errorMessage: response.statusText }))
    throw new Error(
      `Pawapay status check failed: ${JSON.stringify(error)}`
    )
  }

  return response.json()
}

// Callback verification uses RFC-9421 HTTP Message Signatures (public-key crypto).
// To verify, fetch PawaPay's public key from GET /v2/public-keys and validate
// the Signature header against the signature base.
// For sandbox testing, leave signed callbacks disabled in the dashboard
// (callbacks will arrive without Signature headers).
export function parseCallbackPayload(body: unknown): DepositCallbackPayload {
  return body as DepositCallbackPayload
}
