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

export interface GhlCreateProviderRequest {
  name: string
  description: string
  imageUrl: string
  paymentsUrl: string
  queryUrl: string
  webhookUrl?: string
  supportsSubscriptionSchedule: boolean
}

export interface GhlCreateProviderResponse {
  _id: string
  name: string
  description: string
  imageUrl: string
  paymentsUrl: string
  queryUrl: string
  locationId: string
  marketplaceAppId: string
  supportsSubscriptionSchedule: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
  traceId: string
}

export interface GhlProviderModeConfig {
  apiKey: string
  publishableKey: string
}

export interface GhlConnectProviderRequest {
  test: GhlProviderModeConfig | null
  live: GhlProviderModeConfig | null
}

export interface GhlFetchProviderResponse {
  _id?: string
  id?: string
  name?: string
  description?: string
  imageUrl?: string
  paymentsUrl?: string
  queryUrl?: string
  webhookUrl?: string
  locationId?: string
  marketplaceAppId?: string
  supportsSubscriptionSchedule?: boolean
  deleted?: boolean
  createdAt?: string
  updatedAt?: string
  traceId?: string
  paymentProvider?: {
    test?: { apiKey?: string; publishableKey?: string; liveMode?: boolean }
    live?: { apiKey?: string; publishableKey?: string; liveMode?: boolean }
  }
}

export interface GhlPaymentQueryRequest {
  type: 'verify' | 'refund' | 'list_payment_methods' | 'charge_payment' | 'create_subscription'
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

export interface GhlPaymentMethod {
  id: string
  type: string
  title: string
  subTitle: string
  expiry: string
  customerId: string
  imageUrl: string
}

export interface GhlChargeSnapshot {
  id: string
  status: string
  amount: number
  chargeId: string
  chargedAt: number
}

export interface GhlVerifyResponse {
  success?: boolean
  failed?: boolean
  chargeId?: string
  message?: string
  chargeSnapshot?: GhlChargeSnapshot
}

export interface GhlRefundResponse {
  success?: boolean
  failed?: boolean
  message?: string
  refundId?: string
}

export interface GhlChargePaymentResponse {
  success?: boolean
  failed?: boolean
  chargeId?: string
  message?: string
  chargeSnapshot?: GhlChargeSnapshot
}

// ─── GHL PostMessage Types ─────────────────────────────────────────────────────

export interface GhlProductDetail {
  _id?: string
  name: string
  qty: number
  productId: string
  priceId: string
  isTaxesEnabled?: boolean
  taxes?: Array<{
    rate: number
    name: string
  }>
  prices?: Array<{
    _id?: string
    name?: string
    type?: string
    currency?: string
    amount: number
    compareAtPrice?: number
  }>
}

export interface GhlShippingAddress {
  city?: string
  country?: string
  line1?: string
  zipCode?: string
  state?: string
}

export interface GhlPaymentContact {
  id: string
  name?: string
  email?: string
  contact?: string
  shippingAddress?: GhlShippingAddress
}

export interface PaymentInitiateProps {
  type: 'payment_initiate_props'
  publishableKey: string
  amount: number
  currency: string
  mode: 'payment' | 'setup' | 'subscription'
  productDetails?: GhlProductDetail[]
  contact?: GhlPaymentContact
  orderId?: string
  transactionId?: string
  subscriptionId?: string
  locationId: string
  invoiceId?: string
  language?: string
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

// ─── GHL Order Types ──────────────────────────────────────────────────────────

export interface GhlOrderTax {
  name: string
  amount: number
}

export interface GhlOrderItem {
  name: string
  quantity: number
  price: number
  discount: number
  subtotal: number
  productId: string
  priceId: string
  taxes?: GhlOrderTax[]
}

export interface GhlOrderProcessingCharge {
  name: string
  amount: number
}

export interface GhlOrder {
  id: string
  altId?: string
  altType?: string
  contactId?: string
  contactName?: string
  contactEmail?: string
  currency: string
  amount: number
  subtotal: number
  discount: number
  status: string
  liveMode?: boolean
  totalProducts?: number
  sourceType?: string
  sourceName?: string
  sourceId?: string
  couponCode?: string
  fulfillmentStatus?: string
  onetimeProducts?: number
  recurringProducts?: number
  createdBy?: string
  createdAt: string
  updatedAt: string
  automaticTaxesCalculated?: boolean
  taxCalculationProvider?: string
  items?: GhlOrderItem[]
  processingCharges?: GhlOrderProcessingCharge[]
}

export interface GhlOrderResponse {
  order: GhlOrder
}
