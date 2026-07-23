export interface GhlTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user_type: 'Location' | 'Company'
  locationId?: string
  companyId?: string
  scope: string
  version: string
}

export interface GhlLocation {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
  currency?: string
  timezone?: string
}

export interface GhlContact {
  id: string
  locationId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  [key: string]: unknown
}

export interface GhlOpportunity {
  id: string
  locationId: string
  contactId: string
  name: string
  status: string
  monetaryValue?: number
  pipelineId?: string
  pipelineStageId?: string
}

export interface GhlCreateContactRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  locationId: string
  customFields?: Record<string, unknown>
}

export interface GhlCreateOpportunityRequest {
  contactId: string
  locationId: string
  name: string
  pipelineId?: string
  pipelineStageId?: string
  monetaryValue?: number
  status?: string
}

export interface GhlWebhookPayload {
  type: string
  locationId?: string
  companyId?: string
  [key: string]: unknown
}

export interface GhlAppInstallEvent extends GhlWebhookPayload {
  type: 'AppInstall'
  appId: string
  locationId: string
  companyId: string
}

export interface GhlAppUninstallEvent extends GhlWebhookPayload {
  type: 'AppUninstall'
  appId: string
  locationId: string
  companyId: string
}

export interface GhlCustomProviderConfig {
  name: string
  description: string
  imageUrl: string
  locationId: string
  queryUrl: string
  paymentsUrl: string
  webhookUrl?: string
}

export interface GhlProviderConnectConfig {
  apiKey: string
  publishableKey: string
}

export interface GhlPaymentQueryRequest {
  type: 'verify' | 'refund' | 'list_payment_methods' | 'charge_payment'
  transactionId?: string
  apiKey?: string
  chargeId?: string
  subscriptionId?: string
  locationId?: string
  contactId?: string
  paymentMethodId?: string
  amount?: number
  currency?: string
  chargeDescription?: string
}

export interface GhlPaymentQueryResponse {
  success?: boolean
  failed?: boolean
  chargeId?: string
  message?: string
  chargeSnapshot?: {
    id: string
    status: string
    amount: number
    chargeId: string
    chargedAt: number
  }
}

export interface PaymentInitiateProps {
  type: 'payment_initiate_props'
  publishableKey: string
  amount: number
  currency: string
  mode: 'payment' | 'setup'
  productDetails?: {
    productId?: string
    priceId?: string
  }
  contact?: {
    id: string
    name?: string
    email?: string
    contact?: string
  }
  orderId?: string
  transactionId?: string
  subscriptionId?: string
  locationId: string
}

export interface SetupInitiateProps {
  type: 'setup_initiate_props'
  publishableKey: string
  currency: string
  mode: 'setup'
  contact: {
    id: string
  }
  locationId: string
}
