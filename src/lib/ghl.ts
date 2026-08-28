import {
  GhlTokenResponse,
  GhlCreateProviderRequest,
  GhlCreateProviderResponse,
  GhlConnectProviderRequest,
  GhlFetchProviderResponse,
} from './ghl-types'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_OAUTH_TOKEN_URL = `${GHL_API_BASE}/oauth/token`

const PROVIDER_NAME = 'RvPay-v1'
const PROVIDER_DESCRIPTION = 'Mobile money payments across Africa via PawaPay'

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'ghl',
    step,
    ...data,
  }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'ghl',
    level: 'error',
    step,
    ...data,
  }))
}

// ─── Config helpers ───────────────────────────────────────────────────────────

function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  return 'http://localhost:3000'
}

export function buildProviderConfig(): GhlCreateProviderRequest {
  const baseUrl = getAppBaseUrl()
  return {
    name: PROVIDER_NAME,
    description: PROVIDER_DESCRIPTION,
    imageUrl: `${baseUrl}/rvpay-logo.png`,
    paymentsUrl: `${baseUrl}/payment/checkout`,
    queryUrl: `${baseUrl}/api/pawa/payments/query`,
    webhookUrl: `${baseUrl}/api/pawa/webhook`,
    supportsSubscriptionSchedule: false,
  }
}

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

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function ghlFetch(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GHL_API_BASE}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
      Accept: 'application/json',
    },
  })

  const responseBody = await response.text().catch(() => '')

  // Reconstruct response since body was consumed
  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string): Promise<GhlTokenResponse> {
  const { clientId, clientSecret } = getGhlConfig()
  const redirectUri = getGhlRedirectUri()

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const start = Date.now()
  const response = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const duration = Date.now() - start

  if (!response.ok) {
    const error = await response.text()
    logError('oauth_exchange_failed', {
      status: response.status,
      duration_ms: duration,
      error,
      redirectUri,
    })
    throw new Error(
      `GHL OAuth token exchange failed (HTTP ${response.status}): ${error}. Verify that GHL_CLIENT_ID, GHL_CLIENT_SECRET, and GHL_REDIRECT_URI are correct. Expected redirect URI: ${redirectUri}`
    )
  }

  const tokenData: GhlTokenResponse = await response.json()
  log('oauth_exchange_ok', {
    duration_ms: duration,
    locationId: tokenData.locationId || null,
    companyId: tokenData.companyId || null,
  })

  return tokenData
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
    logError('oauth_refresh_failed', { error })
    throw new Error(`GHL token refresh failed: ${error}`)
  }

  return response.json()
}

// ─── Locations ───────────────────────────────────────────────────────────────

export async function getLocation(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(`/v3/locations/${locationId}`, accessToken)
  if (!response.ok) {
    const text = await response.text()
    logError('get_location_failed', { locationId, status: response.status })
    throw new Error(`Failed to fetch location: ${text}`)
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
    const nested = [record.locations, record.data, record.items, record.result].find(
      (value): value is unknown[] => Array.isArray(value)
    )
    if (nested) return normalizeLocationsPayload(nested)
  }
  return []
}

export async function listCompanyLocations(
  companyId: string,
  accessToken: string
): Promise<{ locations: Array<{ id: string; name: string; [key: string]: unknown }> }> {
  // GHL locations endpoint does NOT use /v3/ prefix
  const response = await ghlFetch(`/locations/search?companyId=${companyId}`, accessToken)
  const body = await response.text()

  log('list_company_locations_response', {
    companyId,
    status: response.status,
    bodyLength: body.length,
    bodyPreview: body.slice(0, 500),
  })

  if (!response.ok) {
    if (!body.trim()) return { locations: [] }
    throw new Error(`Failed to list locations (HTTP ${response.status}): ${body}`)
  }

  if (!body.trim()) return { locations: [] }

  try {
    const parsed = JSON.parse(body)
    const locations = normalizeLocationsPayload(parsed)

    log('list_company_locations_parsed', {
      companyId,
      count: locations.length,
      locationIds: locations.map(l => l.id),
    })

    return { locations }
  } catch {
    throw new Error(`Failed to parse locations response: ${body}`)
  }
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createContact(
  data: { firstName?: string; lastName?: string; email?: string; phone?: string; locationId: string },
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch('/v3/contacts/', accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const text = await response.text()
    logError('create_contact_failed', { locationId: data.locationId, status: response.status })
    throw new Error(`Failed to create contact: ${text}`)
  }
  return response.json()
}

export async function getContact(
  contactId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(`/v3/contacts/${contactId}`, accessToken)
  if (!response.ok) {
    const text = await response.text()
    logError('get_contact_failed', { contactId, status: response.status })
    throw new Error(`Failed to fetch contact: ${text}`)
  }
  return response.json()
}

// ─── Opportunities ───────────────────────────────────────────────────────────

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
    const text = await response.text()
    logError('create_opportunity_failed', { locationId: data.locationId, contactId: data.contactId, status: response.status })
    throw new Error(`Failed to create opportunity: ${text}`)
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
    const text = await response.text()
    logError('update_opportunity_stage_failed', { opportunityId, status: response.status })
    throw new Error(`Failed to update opportunity stage: ${text}`)
  }
  return response.json()
}

// ─── Payment Provider Integration ──────────────────────────────────────────

export async function fetchProviderDefinition(
  locationId: string,
  accessToken: string
): Promise<GhlFetchProviderResponse | null> {
  const response = await ghlFetch(
    `/payments/custom-provider/provider?locationId=${encodeURIComponent(locationId)}`,
    accessToken
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    return null
  }

  const data: GhlFetchProviderResponse = await response.json()
  log('provider_found', {
    locationId,
    providerId: data._id || data.id,
    name: data.name,
  })

  return data
}

export async function createPaymentIntegration(
  locationId: string,
  config: GhlCreateProviderRequest,
  accessToken: string
): Promise<GhlCreateProviderResponse> {
  const response = await ghlFetch(
    `/payments/custom-provider/provider?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  )

  if (!response.ok) {
    const text = await response.text()

    // If provider already exists (422/409), this is not fatal
    if (response.status === 422 || response.status === 409) {
      log('provider_already_exists', { locationId })
      const existing = await fetchProviderDefinition(locationId, accessToken)
      if (existing) {
        return {
          _id: existing._id || existing.id || '',
          name: existing.name || config.name,
          description: existing.description || config.description,
          imageUrl: existing.imageUrl || config.imageUrl,
          paymentsUrl: existing.paymentsUrl || config.paymentsUrl,
          queryUrl: existing.queryUrl || config.queryUrl,
          locationId: existing.locationId || locationId,
          marketplaceAppId: existing.marketplaceAppId || '',
          supportsSubscriptionSchedule: existing.supportsSubscriptionSchedule || false,
          deleted: existing.deleted || false,
          createdAt: existing.createdAt || '',
          updatedAt: existing.updatedAt || '',
          traceId: existing.traceId || '',
        }
      }
    }

    logError('create_provider_failed', { locationId, status: response.status })
    throw new Error(`Failed to create payment provider (HTTP ${response.status}): ${text}`)
  }

  const result: GhlCreateProviderResponse = await response.json()
  log('provider_created', {
    locationId,
    providerId: result._id,
  })

  return result
}

export async function connectProviderConfig(
  locationId: string,
  config: GhlConnectProviderRequest,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(
    `/payments/custom-provider/connect?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    logError('connect_provider_failed', { locationId, status: response.status })
    throw new Error(`Failed to connect provider config (HTTP ${response.status}): ${text}`)
  }

  return response.json()
}

export async function disconnectProviderConfig(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(
    `/payments/custom-provider/disconnect?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    logError('disconnect_provider_failed', { locationId, status: response.status })
    throw new Error(`Failed to disconnect provider config: ${text}`)
  }

  return response.json()
}

export async function fetchProviderConfig(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  const response = await ghlFetch(
    `/payments/custom-provider/connect?locationId=${encodeURIComponent(locationId)}`,
    accessToken
  )

  if (!response.ok) {
    const text = await response.text()
    logError('fetch_provider_config_failed', { locationId, status: response.status })
    throw new Error(`Failed to fetch provider config: ${text}`)
  }

  return response.json()
}

/**
 * Registers (or re-registers) a payment provider for a location.
 *
 * Always attempts to create the provider via POST every call.
 * If GHL rejects because it already exists (422/409), falls back
 * to fetching the existing definition.
 * Only calls connectProviderConfig when valid API keys are provided.
 *
 * Returns an object describing what was done.
 */
export async function registerPaymentProvider(
  locationId: string,
  accessToken: string,
  connectionConfig?: GhlConnectProviderRequest
): Promise<{ provider: GhlCreateProviderResponse | GhlFetchProviderResponse; connect?: Record<string, unknown> }> {
  const providerConfig = buildProviderConfig()

  log('register_step_1_create_provider', { locationId })

  const providerResult = await createPaymentIntegration(locationId, providerConfig, accessToken)

  log('register_step_2_provider_ready', {
    locationId,
    providerId: (providerResult as GhlCreateProviderResponse)._id || (providerResult as GhlFetchProviderResponse).id,
  })

  if (connectionConfig && (connectionConfig.test || connectionConfig.live)) {
    const cleanConfig: GhlConnectProviderRequest = {
      test: connectionConfig.test?.apiKey ? connectionConfig.test : null,
      live: connectionConfig.live?.apiKey ? connectionConfig.live : null,
    }

    if (cleanConfig.test || cleanConfig.live) {
      log('register_step_3_connect_keys', { locationId, hasTest: !!cleanConfig.test, hasLive: !!cleanConfig.live })
      const connectResult = await connectProviderConfig(locationId, cleanConfig, accessToken)
      log('register_done', { locationId, connected: true })
      return { provider: providerResult, connect: connectResult }
    }
  }

  log('register_done', { locationId, connected: false, reason: connectionConfig ? 'no valid API keys' : 'no config' })
  return { provider: providerResult }
}
