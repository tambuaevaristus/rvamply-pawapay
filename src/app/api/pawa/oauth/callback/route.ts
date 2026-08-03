import { NextRequest } from 'next/server'
import {
  exchangeCodeForToken,
  listCompanyLocations,
  registerPaymentProvider,
} from '@/lib/ghl'
import { getConfig, upsertInstallation } from '@/lib/db'
import type { GhlConnectProviderRequest, GhlProviderModeConfig } from '@/lib/ghl-types'

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(step: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'oauth_callback',
    step,
    ...data,
  }))
}

function logError(step: string, data: Record<string, unknown>) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    source: 'oauth_callback',
    level: 'error',
    step,
    ...data,
  }))
}

// ─── Connect config builder ───────────────────────────────────────────────────

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

  const config: GhlConnectProviderRequest = {
    test: testModeConfig,
    live: liveModeConfig,
  }

  return config
}

// ─── OAuth Callback Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const requestStart = Date.now()

  try {
    const { searchParams } = new URL(request.url)

    log('callback_received', {
      hasClientId: !!process.env.GHL_CLIENT_ID,
      hasClientSecret: !!process.env.GHL_CLIENT_SECRET,
    })

    const code = searchParams.get('code')
    const locationId = searchParams.get('locationId') || searchParams.get('location_id')
    const companyId = searchParams.get('companyId') || searchParams.get('company_id')

    // ── Step 1: Validate authorization code ────────────────────────────────
    if (!code) {
      logError('missing_code', { url: request.url })
      return new Response(
        '<html><body><h2>OAuth Error</h2><p>Missing authorization code.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }
    log('step_1_code_present', { codeLength: code.length })

    // ── Step 2: Exchange code for access token ─────────────────────────────
    const tokenData = await exchangeCodeForToken(code)

    const tokenAny = tokenData as unknown as Record<string, unknown>
    const tokenLocationId =
      (tokenAny.locationId as string) ||
      (tokenAny.location_id as string) ||
      (tokenAny.LocationId as string) ||
      ''

    const tokenCompanyId =
      (tokenAny.companyId as string) ||
      (tokenAny.company_id as string) ||
      (tokenAny.CompanyId as string) ||
      ''

    const resolvedLocationId = locationId || tokenLocationId
    const resolvedCompanyId = companyId || tokenCompanyId || null

    log('step_2_token_received', {
      resolvedLocationId,
      resolvedCompanyId,
    })

    if (!resolvedLocationId && !resolvedCompanyId) {
      logError('no_location_or_company', { tokenLocationId, tokenCompanyId, urlLocationId: locationId })
      return new Response(
        '<html><body><h2>Installation Failed</h2><p>No location or company ID received from GoHighLevel.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const { access_token, refresh_token, expires_in } = tokenData

    // ── Step 3: Install for direct location (sub-account level) ────────────
    if (resolvedLocationId) {
      log('step_3_installing_location', { locationId: resolvedLocationId })
      await installLocation(resolvedLocationId, resolvedCompanyId, access_token, refresh_token, expires_in)
    }

    // ── Step 4: Install for company-level (all sub-accounts) ───────────────
    if (resolvedCompanyId && !resolvedLocationId) {
      log('step_4_company_install', { companyId: resolvedCompanyId })

      try {
        const { locations } = await listCompanyLocations(resolvedCompanyId, access_token)

        if (locations.length === 0) {
          log('step_4_no_locations', {
            companyId: resolvedCompanyId,
            message: 'No sub-account locations found. Attempting fallback: treating companyId as locationId.',
          })

          try {
            await installLocation(resolvedCompanyId, resolvedCompanyId, access_token, refresh_token, expires_in)
            log('step_4_fallback_success', { companyId: resolvedCompanyId })
          } catch (e) {
            logError('step_4_fallback_failed', {
              companyId: resolvedCompanyId,
              error: e instanceof Error ? e.message : 'Unknown error',
            })
          }
        } else {
          let successCount = 0
          let failCount = 0

          for (const loc of locations) {
            try {
              await installLocation(loc.id, resolvedCompanyId, access_token, refresh_token, expires_in)
              successCount++
            } catch (e) {
              failCount++
              logError('step_4_location_install_failed', {
                locationId: loc.id,
                error: e instanceof Error ? e.message : 'Unknown error',
              })
            }
          }

          log('step_4_done', {
            companyId: resolvedCompanyId,
            successCount,
            failCount,
            totalLocations: locations.length,
          })
        }
      } catch (e) {
        logError('step_4_company_locations_failed', {
          companyId: resolvedCompanyId,
          error: e instanceof Error ? e.message : 'Unknown error',
        })
      }
    }

    log('callback_complete', {
      resolvedLocationId,
      resolvedCompanyId,
      duration_ms: Date.now() - requestStart,
    })

    // ── Step 5: Return page that closes tab and notifies GHL ───────────────
    return new Response(renderCompletionPage(resolvedLocationId || ''), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth failed'
    logError('callback_error', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: Date.now() - requestStart,
    })

    return new Response(renderErrorPage(message), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// ─── Location installation logic ──────────────────────────────────────────────

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

  const connectConfig = buildConnectConfig(locationId)

  const registerStart = Date.now()
  const result = await registerPaymentProvider(locationId, accessToken, connectConfig)
  const registerDuration = Date.now() - registerStart

  log('install_location_done', {
    locationId,
    providerId: (result.provider as Record<string, unknown>)._id as string || (result.provider as Record<string, unknown>).id as string,
    connected: !!result.connect,
    duration_ms: registerDuration,
  })
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

function renderCompletionPage(locationId: string): string {
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
    .loader { display: inline-block; width: 20px; height: 20px; border: 2px solid #e9d5ff; border-top: 2px solid #581c87; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
    <p style="font-size:14px;color:#a78bfa;margin-top:16px;">
      <span class="loader"></span>Refreshing HighLevel...
    </p>
    <p style="font-size:14px;color:#a78bfa;">Go to Settings &rarr; Payments &rarr; Integrations to configure.</p>
  </div>
  <script>
    // Notify the parent (GHL's opener window) that installation completed
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'app_installed', locationId: '${locationId}' }, '*');
      }
    } catch(e) { console.log('postMessage to opener failed', e); }

    // Close this tab after 2 seconds
    setTimeout(function() {
      window.close();
    }, 2000);
  </script>
</body>
</html>`
}

function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Installation Failed - mountainHub</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fef2f2; }
    .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    h1 { color: #991b1b; font-size: 24px; margin: 16px 0 8px; }
    p { color: #b91c1c; margin: 8px 0; }
    .error-icon { width: 64px; height: 64px; background: #fca5a5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
    .error-icon svg { width: 32px; height: 32px; stroke: #991b1b; stroke-width: 2; fill: none; }
    .details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 12px; color: #b91c1c; word-break: break-word; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <div class="error-icon">
      <svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    </div>
    <h1>Installation Failed</h1>
    <p>There was an error connecting mountainHub.africa.</p>
    <div class="details">${message}</div>
    <p style="font-size:14px;color:#a78bfa;margin-top:16px;">You can close this tab and try again.</p>
  </div>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'app_install_failed', error: '${message.replace(/'/g, "\\'")}' }, '*');
      }
    } catch(e) {}
    setTimeout(function() { window.close(); }, 5000);
  </script>
</body>
</html>`
}
