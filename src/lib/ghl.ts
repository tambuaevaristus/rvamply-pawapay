import {
  GhlTokenResponse,
  GhlCreateProviderRequest,
  GhlCreateProviderResponse,
  GhlConnectProviderRequest,
  GhlFetchProviderResponse,
} from './ghl-types'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_OAUTH_TOKEN_URL = `${GHL_API_BASE}/oauth/token`

const PROVIDER_NAME = 'mountainHub PawaPay'
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
    imageUrl: `${baseUrl}/globe.svg`,
    paymentsUrl: `${baseUrl}/payment/ghl`,
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
  const start = Date.now()

  log('ghl_fetch', {
    method: options.method || 'GET',
    url,
    hasToken: !!accessToken,
  })

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

  const duration = Date.now() - start
  const responseBody = await response.text().catch(() => '')

  log('ghl_fetch_response', {
    url,
    status: response.status,
    statusText: response.statusText,
    duration_ms: duration,
    responseBody: responseBody.length > 2000 ? responseBody.slice(0, 2000) + '...' : responseBody,
  })

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

  log('oauth_exchange', {
    redirectUri,
    clientId: clientId.slice(0, 10) + '...',
    codeLength: code.length,
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
  log('oauth_exchange_success', {
    duration_ms: duration,
    user_type: tokenData.user_type,
    locationId: tokenData.locationId || null,
    companyId: tokenData.companyId || null,
    scope: tokenData.scope,
    hasRefreshToken: !!tokenData.refresh_token,
    expires_in: tokenData.expires_in,
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
  log('get_location', { locationId })
  const response = await ghlFetch(`/v3/locations/${locationId}`, accessToken)
  if (!response.ok) {
    const text = await response.text()
    logError('get_location_failed', { locationId, status: response.status, response: text })
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
  log('list_company_locations', { companyId })
  const response = await ghlFetch(`/v3/locations/search?companyId=${companyId}`, accessToken)
  if (!response.ok) {
    const body = await response.text()
    if (!body.trim()) return { locations: [] }
    logError('list_company_locations_failed', { companyId, status: response.status, response: body })
    throw new Error(`Failed to list locations: ${body}`)
  }
  const body = await response.text()
  if (!body.trim()) return { locations: [] }
  try {
    return { locations: normalizeLocationsPayload(JSON.parse(body)) }
  } catch {
    logError('list_company_locations_parse_error', { body })
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
    logError('create_contact_failed', { locationId: data.locationId, status: response.status, response: text })
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
    logError('get_contact_failed', { contactId, status: response.status, response: text })
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
    logError('create_opportunity_failed', { locationId: data.locationId, contactId: data.contactId, status: response.status, response: text })
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
    logError('update_opportunity_stage_failed', { opportunityId, status: response.status, response: text })
    throw new Error(`Failed to update opportunity: ${text}`)
  }
  return response.json()
}

// ─── Payment Provider Integration ──────────────────────────────────────────

export async function fetchProviderDefinition(
  locationId: string,
  accessToken: string
): Promise<GhlFetchProviderResponse | null> {
  log('fetch_provider_definition', { locationId })

  const response = await ghlFetch(
    `/v3/payments/custom-provider/provider?locationId=${encodeURIComponent(locationId)}`,
    accessToken
  )

  if (response.status === 404) {
    log('fetch_provider_definition_not_found', { locationId })
    return null
  }

  if (!response.ok) {
    const text = await response.text()
    logError('fetch_provider_definition_failed', {
      locationId,
      status: response.status,
      statusText: response.statusText,
      response: text,
    })
    // Don't throw — treat as not found for resilience
    return null
  }

  const data: GhlFetchProviderResponse = await response.json()
  log('fetch_provider_definition_found', {
    locationId,
    providerId: data._id || data.id,
    name: data.name,
    deleted: data.deleted,
  })

  return data
}

export async function createPaymentIntegration(
  locationId: string,
  config: GhlCreateProviderRequest,
  accessToken: string
): Promise<GhlCreateProviderResponse> {
  log('create_payment_integration', {
    locationId,
    name: config.name,
    paymentsUrl: config.paymentsUrl,
    queryUrl: config.queryUrl,
    supportsSubscriptionSchedule: config.supportsSubscriptionSchedule,
  })

  const response = await ghlFetch(
    `/v3/payments/custom-provider/provider?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    logError('create_payment_integration_failed', {
      locationId,
      status: response.status,
      statusText: response.statusText,
      response: text,
    })

    // If provider already exists (422/409), this is not fatal
    if (response.status === 422 || response.status === 409) {
      log('create_payment_integration_already_exists', { locationId })
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

    throw new Error(`Failed to create payment provider (HTTP ${response.status}): ${text}`)
  }

  const result: GhlCreateProviderResponse = await response.json()
  log('create_payment_integration_success', {
    locationId,
    providerId: result._id,
    traceId: result.traceId,
  })

  return result
}

export async function connectProviderConfig(
  locationId: string,
  config: GhlConnectProviderRequest,
  accessToken: string
): Promise<Record<string, unknown>> {
  log('connect_provider_config', {
    locationId,
    hasTest: !!config.test,
    hasLive: !!config.live,
  })

  const response = await ghlFetch(
    `/v3/payments/custom-provider/connect?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(config),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    logError('connect_provider_config_failed', {
      locationId,
      status: response.status,
      statusText: response.statusText,
      response: text,
    })
    throw new Error(`Failed to connect provider config (HTTP ${response.status}): ${text}`)
  }

  const result = await response.json()
  log('connect_provider_config_success', { locationId, result })

  return result
}

export async function disconnectProviderConfig(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  log('disconnect_provider_config', { locationId })

  const response = await ghlFetch(
    `/v3/payments/custom-provider/disconnect?locationId=${encodeURIComponent(locationId)}`,
    accessToken,
    {
      method: 'POST',
    }
  )

  if (!response.ok) {
    const text = await response.text()
    logError('disconnect_provider_config_failed', {
      locationId,
      status: response.status,
      response: text,
    })
    throw new Error(`Failed to disconnect provider config: ${text}`)
  }

  return response.json()
}

export async function fetchProviderConfig(
  locationId: string,
  accessToken: string
): Promise<Record<string, unknown>> {
  log('fetch_provider_config', { locationId })

  const response = await ghlFetch(
    `/v3/payments/custom-provider/connect?locationId=${encodeURIComponent(locationId)}`,
    accessToken
  )

  if (!response.ok) {
    const text = await response.text()
    logError('fetch_provider_config_failed', {
      locationId,
      status: response.status,
      response: text,
    })
    throw new Error(`Failed to fetch provider config: ${text}`)
  }

  return response.json()
}

/**
 * Registers (or updates) a payment provider for a location.
 *
 * This is idempotent:
 * 1. Checks if a provider definition already exists — skips creation if so.
 * 2. Only calls connectProviderConfig when there are valid API keys to send.
 *
 * Returns an object describing what was done.
 */
export async function registerPaymentProvider(
  locationId: string,
  accessToken: string,
  connectionConfig?: GhlConnectProviderRequest
): Promise<{ provider: GhlCreateProviderResponse | GhlFetchProviderResponse; connect?: Record<string, unknown> }> {
  const providerConfig = buildProviderConfig()

  log('register_payment_provider_start', { locationId, hasConnectionConfig: !!connectionConfig })

  // Always attempt to create the provider via POST.
  // If it already exists, the API returns 422/409 and createPaymentIntegration
  // falls back to fetching the existing definition.
  const providerResult = await createPaymentIntegration(locationId, providerConfig, accessToken)
  log('register_provider_created', {
    locationId,
    providerId: (providerResult as GhlCreateProviderResponse)._id || (providerResult as GhlFetchProviderResponse).id,
  })

  // Step 2: Connect config only if we have valid API credentials
  if (connectionConfig && (connectionConfig.test || connectionConfig.live)) {
    // Validate that we're not sending empty objects — GHL may reject them
    const cleanConfig: GhlConnectProviderRequest = {
      test: connectionConfig.test?.apiKey ? connectionConfig.test : null,
      live: connectionConfig.live?.apiKey ? connectionConfig.live : null,
    }

    if (cleanConfig.test || cleanConfig.live) {
      const connectResult = await connectProviderConfig(locationId, cleanConfig, accessToken)
      log('register_provider_connected', { locationId })

      return {
        provider: providerResult,
        connect: connectResult,
      }
    }
  }

  log('register_provider_no_connect', {
    locationId,
    reason: connectionConfig ? 'no valid API keys' : 'no config provided',
  })

  return { provider: providerResult }
}
