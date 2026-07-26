# mountainHub PawaPay

A GoHighLevel Marketplace payment provider for PawaPay mobile money payments.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Start the app:
   ```bash
   npm run dev
   ```

## Required environment variables

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
GHL_CLIENT_ID=your-ghl-client-id
GHL_CLIENT_SECRET=your-ghl-client-secret
GHL_REDIRECT_URI=https://your-domain.com/api/pawa/oauth/callback
PAWAPAY_API_KEY=your-pawapay-api-key
PAWAPAY_ENVIRONMENT=sandbox
```

## GoHighLevel marketplace configuration

Use these URLs in the marketplace app configuration:

- OAuth redirect URI: https://your-domain.com/api/pawa/oauth/callback
- Webhook URL: https://your-domain.com/api/pawa/webhook
- Query URL: https://your-domain.com/api/pawa/payments/query
- Payments URL: https://your-domain.com/payment/ghl

## Common install failure

If the install page returns an OAuth error such as "Invalid client credentials", verify that:

- the GHL client ID and secret are copied from the correct marketplace app
- the redirect URI in the GHL app matches the deployed callback URL exactly
- the app is running with the same values in the hosting environment
