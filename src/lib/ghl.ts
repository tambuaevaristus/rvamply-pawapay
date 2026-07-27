import {
  GhlTokenResponse,
  GhlCustomProviderConfig,
  GhlProviderConnectConfig,
} from './ghl-types'

function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  return 'http://localhost:3000'
}

export function buildProviderConfig(locationId: string) {
  const baseUrl = getAppBaseUrl()
  return {
    name: 'mountainHub PawaPay',
    description: 'Mobile money payments across Africa via PawaPay',
    imageUrl: `${baseUrl}/globe.svg`,
    locationId,
    queryUrl: `${baseUrl}/api/pawa/payments/query`,
    paymentsUrl: `${baseUrl}/payment/ghl`,
    webhookUrl: `${baseUrl}/api/pawa/webhook`,
  } satisfies GhlCustomProviderConfig
}

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_OAUTH_TOKEN_URL = `${GHL_API_BASE}/oauth/token`

function getGhlConfig() {
  const clientId = process.env.GHL_CLIENT_ID?.trim()
  const clientSecret = process.env.GHL_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET must be configured in your hosting environment')
  }

  return { clientId, clientSecret }
}

export function getGhlRedirectUri(): string {
  const explicit = process.env.GHL_REDIRECT_URI
  if (explicit) return explicit.replace(/\/+$/, '')
  return `${getAppBaseUrl()}/api/pawa/oauth/callback`
}

export async function exchangeCodeForToken(code: string): Promise<GhlTokenResponse> {
  const { clientId, clientSecret } = getGhlConfig()

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getGhlRedirectUri(),
  })

  const response = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    const redirectUri = getGhlRedirectUri()
    throw new Error(`GHL OAuth token exchange failed: ${error}. Verify that GHL_CLIENT_ID, GHL_CLIENT_SECRET, and GHL_REDIRECT_URI are correct. Expected redirect URI: ${redirectUri}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<GhlTokenResponse> {
  const { clientId, clientSecret } = getGhlConfig()

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: getGhlRedirectUri(),
  })

  const response = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GHL token refresh failed: ${error}`)
  }

  return response.json()
}

async function ghlFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GHL_API_BASE}${path}`

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  })
}

export async function getLocation(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(`/v3/locations/${locationId}`, accessToken)

  if (!response.ok) {
    throw new Error(`Failed to fetch location: ${await response.text()}`)
  }

  return response.json()
}

function normalizeLocationsPayload(payload: unknown): Array<{ id: string; name: string; [key: string]: unknown }> {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: String(item.id ?? item.locationId ?? item.location_id ?? ''),
        name: String(item.name ?? item.locationName ?? item.location_name ?? item.id ?? ''),
        ...item,
      }))
      .filter((item) => Boolean(item.id))
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const nested = [record.locations, record.data, record.items, record.result].find((value): value is unknown[] => Array.isArray(value))
    if (nested) {
      return normalizeLocationsPayload(nested)
    }
  }

  return []
}

export async function listCompanyLocations(
  companyId: string,
  accessToken: string
): Promise<{ locations: Array<{ id: string; name: string; [key: string]: unknown }> }> {
  const response = await ghlFetch(`/v3/locations/search?companyId=${companyId}`, accessToken)

  if (!response.ok) {
    const body = await response.text()
    if (!body.trim()) {
      return { locations: [] }
    }
    throw new Error(`Failed to list locations: ${body}`)
  }

  const body = await response.text()
  if (!body.trim()) {
    return { locations: [] }
  }

  try {
    return { locations: normalizeLocationsPayload(JSON.parse(body)) }
  } catch {
    throw new Error(`Failed to parse locations response: ${body}`)
  }
}

export async function createContact(
  data: { firstName?: string; lastName?: string; email?: string; phone?: string; locationId: string },
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/contacts/', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to create contact: ${await response.text()}`)
  }

  return response.json()
}

export async function getContact(
  contactId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(`/v3/contacts/${contactId}`, accessToken)

  if (!response.ok) {
    throw new Error(`Failed to fetch contact: ${await response.text()}`)
  }

  return response.json()
}

export async function createOpportunity(
  data: {
    contactId: string
    locationId: string
    name: string
    monetaryValue?: number
    pipelineId?: string
    pipelineStageId?: string
    status?: string
  },
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/opportunities/', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Failed to create opportunity: ${await response.text()}`)
  }

  return response.json()
}

export async function updateOpportunityStage(
  opportunityId: string,
  pipelineStageId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(`/v3/opportunities/${opportunityId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify({ pipelineStageId }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update opportunity: ${await response.text()}`)
  }

  return response.json()
}

export async function createPaymentIntegration(
  config: GhlCustomProviderConfig,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/payments/custom-provider/provider', accessToken, {
    method: 'POST',
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[GHL] Create integration failed:', text)
    return { error: text }
  }

  return response.json()
}

export async function connectProviderConfig(
  locationId: string,
  config: GhlProviderConnectConfig,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/payments/custom-provider/connect', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      testMode: config,
      liveMode: null,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to connect provider config: ${await response.text()}`)
  }

  return response.json()
}

export async function disconnectProviderConfig(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/payments/custom-provider/disconnect', accessToken, {
    method: 'POST',
    body: JSON.stringify({ locationId }),
  })

  if (!response.ok) {
    throw new Error(`Failed to disconnect provider config: ${await response.text()}`)
  }

  return response.json()
}
