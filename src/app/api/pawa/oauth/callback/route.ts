import { NextRequest } from 'next/server'
import { exchangeCodeForToken, getGhlRedirectUri, listCompanyLocations, registerPaymentProvider } from '@/lib/ghl'
import { getConfig, upsertInstallation } from '@/lib/db'
import type { GhlConnectProviderRequest, GhlProviderModeConfig } from '@/lib/ghl-types'

function buildConnectConfig(locationId: string): GhlConnectProviderRequest {
  const existingConfig = getConfig(locationId)
  const envApiKey = process.env.PAWAPAY_API_KEY

  const testModeConfig: GhlProviderModeConfig | null =
    existingConfig?.testModeApiKey || envApiKey
      ? {
          apiKey: existingConfig?.testModeApiKey || envApiKey || '',
          publishableKey: existingConfig?.testModePublishableKey || envApiKey || '',
        }
      : null

  const liveModeConfig: GhlProviderModeConfig | null =
    existingConfig?.liveModeApiKey
      ? {
          apiKey: existingConfig.liveModeApiKey,
          publishableKey: existingConfig.liveModePublishableKey || existingConfig.liveModeApiKey,
        }
      : null

  if (!testModeConfig && !liveModeConfig) {
    console.warn(`[GHL] No API keys available for location ${locationId}, provider will be created without live/test config`)
    return { test: null, live: null }
  }

  return {
    test: testModeConfig,
    live: liveModeConfig,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('[GHL] OAuth callback - all params:', JSON.stringify(Object.fromEntries(searchParams.entries())))
    console.log('[GHL] Expected redirect URI:', getGhlRedirectUri())

    const code = searchParams.get('code')
    const locationId = searchParams.get('locationId') || searchParams.get('location_id')
    const companyId = searchParams.get('companyId') || searchParams.get('company_id')

    if (!code) {
      return new Response(
        '<html><body><h2>OAuth Error</h2><p>Missing authorization code.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const tokenData = await exchangeCodeForToken(code)
    console.log('[GHL] Token response keys:', Object.keys(tokenData as unknown as Record<string, unknown>))

    const tokenAny = tokenData as unknown as Record<string, unknown>
    const tokenLocationId =
      (tokenAny.locationId as string | undefined) ||
      (tokenAny.location_id as string | undefined) ||
      (tokenAny.LocationId as string | undefined)

    const tokenCompanyId =
      (tokenAny.companyId as string | undefined) ||
      (tokenAny.company_id as string | undefined) ||
      (tokenAny.CompanyId as string | undefined)

    const resolvedLocationId = locationId || tokenLocationId || ''
    const resolvedCompanyId = companyId || tokenCompanyId || null

    if (!resolvedLocationId && !resolvedCompanyId) {
      return new Response(
        '<html><body><h2>Installation Failed</h2><p>No location or company ID received from GoHighLevel.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const { access_token, refresh_token, expires_in } = tokenData

    if (resolvedLocationId) {
      await installLocation(resolvedLocationId, resolvedCompanyId, access_token, refresh_token, expires_in)
    }

    if (resolvedCompanyId && !resolvedLocationId) {
      console.log(`[GHL] Company-level install for ${resolvedCompanyId}, fetching locations...`)

      let installNotice = 'Company-level install completed. Use the admin page to configure a specific location if needed.'

      try {
        const { locations } = await listCompanyLocations(resolvedCompanyId, access_token)
        console.log(`[GHL] Found ${locations.length} locations for company ${resolvedCompanyId}`)

        if (locations.length > 0) {
          let successCount = 0
          for (const loc of locations) {
            try {
              await installLocation(loc.id, resolvedCompanyId, access_token, refresh_token, expires_in)
              successCount++
            } catch (e) {
              console.error(`[GHL] Failed to configure integration for location ${loc.id} (${loc.name}):`, e)
            }
          }
          installNotice = `Configured ${successCount} of ${locations.length} location(s) for this company.`
        } else {
          console.warn(`[GHL] No locations returned for company ${resolvedCompanyId}`)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        console.warn('[GHL] Failed to configure locations from company:', message)
      }

      console.log(`[GHL] Install notice: ${installNotice}`)
    }

    return new Response(renderSuccessPage(resolvedLocationId || undefined), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth failed'
    console.error('[GHL] OAuth callback error:', message)

    return new Response(
      `<html><body><h2>Installation Failed</h2><p>${message}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}

async function installLocation(
  locationId: string,
  companyId: string | null,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | undefined
) {
  upsertInstallation({
    id: `${locationId}-${Date.now()}`,
    locationId,
    companyId,
    accessToken,
    refreshToken,
    tokenExpiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
    installedAt: new Date().toISOString(),
  })

  console.log(`[GHL] App installed for location ${locationId}`)

  try {
    const connectConfig = buildConnectConfig(locationId)
    const result = await registerPaymentProvider(locationId, accessToken, connectConfig)
    console.log(`[GHL] Payment provider registered for location ${locationId}:`, JSON.stringify(result))
  } catch (e) {
    console.error(`[GHL] Failed to register payment provider for location ${locationId}:`, e)
  }
}

function renderSuccessPage(locationId?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Installation Complete - mountainHub</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #faf5ff; }
    .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    h1 { color: #581c87; font-size: 24px; margin: 16px 0 8px; }
    p { color: #6b21a8; margin: 8px 0; }
    .check { width: 64px; height: 64px; background: #581c87; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
    .check svg { width: 32px; height: 32px; stroke: white; stroke-width: 2; fill: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">
      <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
    </div>
    <h1>Installation Complete</h1>
    <p>mountainHub.africa has been connected successfully.</p>
    ${locationId ? `<p style="font-size:14px;color:#a78bfa;">Location: ${locationId}</p>` : ''}
    <p style="font-size:14px;color:#a78bfa;">Check Payments &rarr; Integrations in your sub-account to configure.</p>
    <p style="font-size:14px;color:#a78bfa;">You can now close this tab.</p>
  </div>
</body>
</html>`
}
