export type PawapayEnvironment = 'sandbox' | 'production'

export type PawapayProvider =
  | 'AIRTEL_COD'
  | 'AIRTEL_COG'
  | 'AIRTEL_GAB'
  | 'AIRTEL_MWI'
  | 'AIRTEL_NGA'
  | 'AIRTEL_OAPI_UGA'
  | 'AIRTEL_OAPI_ZMB'
  | 'AIRTEL_RWA'
  | 'AIRTEL_TZA'
  | 'AIRTELTIGO_GHA'
  | 'FREE_SEN'
  | 'HALOTEL_TZA'
  | 'MOOV_BEN'
  | 'MOOV_BFA'
  | 'MOVITEL_MOZ'
  | 'MPESA_ETH'
  | 'MPESA_KEN'
  | 'MPESA_LSO'
  | 'MTN_MOMO_BEN'
  | 'MTN_MOMO_CIV'
  | 'MTN_MOMO_CMR'
  | 'MTN_MOMO_COG'
  | 'MTN_MOMO_GHA'
  | 'MTN_MOMO_NGA'
  | 'MTN_MOMO_RWA'
  | 'MTN_MOMO_UGA'
  | 'MTN_MOMO_ZMB'
  | 'ORANGE_BFA'
  | 'ORANGE_CIV'
  | 'ORANGE_CMR'
  | 'ORANGE_COD'
  | 'ORANGE_SEN'
  | 'ORANGE_SLE'
  | 'TIGO_TZA'
  | 'TNM_MWI'
  | 'VODACOM_MOZ'
  | 'VODACOM_MPESA_COD'
  | 'VODACOM_TZA'
  | 'VODAFONE_GHA'
  | 'WAVE_CIV'
  | 'WAVE_SEN'
  | 'ZAMTEL_ZMB'

export interface InitiateDepositRequest {
  depositId: string
  amount: string
  currency: string
  payer: {
    type: 'MMO'
    accountDetails: {
      provider: PawapayProvider
      phoneNumber: string
    }
  }
  clientReferenceId?: string
  customerMessage?: string
  metadata?: Record<string, string>
}

export type DepositInitiationStatus = 'ACCEPTED' | 'REJECTED' | 'DUPLICATE_IGNORED'

export interface InitiateDepositResponse {
  depositId: string
  status: DepositInitiationStatus
  created?: string
  failureReason?: {
    failureCode: string
    failureMessage: string
  }
}

export type DepositFinalStatus =
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'IN_RECONCILIATION'
  | 'COMPLETED'
  | 'FAILED'

export interface DepositData {
  depositId: string
  status: DepositFinalStatus
  amount: string
  currency: string
  country: string
  payer: {
    type: 'MMO'
    accountDetails: {
      phoneNumber: string
      provider: PawapayProvider
    }
  }
  customerMessage?: string
  clientReferenceId?: string
  created: string
  providerTransactionId?: string
  failureReason?: {
    failureCode: string
    failureMessage: string
  }
  metadata?: Record<string, string>
}

export interface CheckDepositResponse {
  status: 'FOUND' | 'NOT_FOUND'
  data?: DepositData
}

export interface DepositCallbackPayload {
  depositId: string
  status: DepositFinalStatus
  amount: string
  currency: string
  country: string
  payer: {
    type: 'MMO'
    accountDetails: {
      phoneNumber: string
      provider: PawapayProvider
    }
  }
  customerMessage?: string
  clientReferenceId?: string
  created: string
  providerTransactionId?: string
  failureReason?: {
    failureCode: string
    failureMessage: string
  }
  metadata?: Record<string, string>
}
