import { NextRequest } from 'next/server'
import { exchangeCodeForToken, getGhlRedirectUri } from '@/lib/ghl'
import { upsertInstallation } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const locationId = searchParams.get('locationId')
    const companyId = searchParams.get('companyId')

    if (!code) {
      return new Response(
        '<html><body><h2>OAuth Error</h2><p>Missing authorization code.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      )
    }
// kk
    console.log('[GHL] Exchanging code. redirect_uri:', getGhlRedirectUri())
    console.log('[GHL] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)

    const tokenData = await exchangeCodeForToken(code)
    const resolvedLocationId = locationId || tokenData.locationId || ''
    const resolvedCompanyId = companyId || tokenData.companyId || null

    upsertInstallation({
      id: `${resolvedLocationId}-${Date.now()}`,
      locationId: resolvedLocationId,
      companyId: resolvedCompanyId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in
        ? Date.now() + tokenData.expires_in * 1000
        : null,
      installedAt: new Date().toISOString(),
    })

    console.log(
      `[GHL] App installed for location ${resolvedLocationId}`
    )

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
      await fetch(`${baseUrl}/api/ghl/connect-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: resolvedLocationId,
          companyId: resolvedCompanyId,
        }),
      }).catch(e => console.error('[GHL] Failed to auto-create integration:', e))
    } catch (e) {
      console.error('[GHL] Failed to auto-create integration:', e)
    }

    return new Response(
      `<!DOCTYPE html>
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
    <p style="font-size:14px;color:#a78bfa;">Location: ${resolvedLocationId}</p>
    <p style="font-size:14px;color:#a78bfa;">You can now close this tab.</p>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth failed'
    console.error('[GHL] OAuth callback error:', message)

    return new Response(
      `<html><body><h2>Installation Failed</h2><p>${message}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}
