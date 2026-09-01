import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/.data' : path.join(process.cwd(), '.data'))
const DB_DIR = path.join(DATA_DIR)
const DB_PATH = path.join(DB_DIR, 'store.json')

interface Installation {
  id: string
  locationId: string
  companyId: string | null
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: number | null
  installedAt: string
}

interface Transaction {
  id: string
  depositId: string
  locationId: string
  ghlTransactionId: string | null
  contactId: string | null
  opportunityId: string | null
  amount: string
  currency: string
  provider: string
  phoneNumber: string
  status: string
  clientReferenceId: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
}

interface Config {
  locationId: string
  testModeApiKey: string | null
  testModePublishableKey: string | null
  liveModeApiKey: string | null
  liveModePublishableKey: string | null
  isLive: number
}

interface Store {
  installations: Installation[]
  transactions: Transaction[]
  configs: Config[]
}

function loadStore(): Store {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    if (!fs.existsSync(DB_PATH)) {
      const initial: Store = { installations: [], transactions: [], configs: [] }
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2))
      return initial
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return { installations: [], transactions: [], configs: [] }
  }
}

function saveStore(store: Store): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2))
}

export function getInstallation(locationId: string): Installation | undefined {
  const store = loadStore()
  return store.installations.find(i => i.locationId === locationId)
}

export function getInstallationByCompany(companyId: string): Installation[] {
  const store = loadStore()
  return store.installations.filter(i => i.companyId === companyId)
}

export function getAllInstallations(): Installation[] {
  const store = loadStore()
  return store.installations
}

export function upsertInstallation(installation: Installation): void {
  const store = loadStore()
  const idx = store.installations.findIndex(i => i.locationId === installation.locationId)
  if (idx >= 0) {
    store.installations[idx] = installation
  } else {
    store.installations.push(installation)
  }
  saveStore(store)
}

export function removeInstallation(locationId: string): void {
  const store = loadStore()
  store.installations = store.installations.filter(i => i.locationId !== locationId)
  store.configs = store.configs.filter(c => c.locationId !== locationId)
  saveStore(store)
}

export function getTransaction(depositId: string): Transaction | undefined {
  const store = loadStore()
  return store.transactions.find(t => t.depositId === depositId)
}

export function getTransactionByGhlId(ghlTransactionId: string): Transaction | undefined {
  const store = loadStore()
  return store.transactions.find(t => t.ghlTransactionId === ghlTransactionId)
}

export function getAllTransactions(): Transaction[] {
  const store = loadStore()
  return store.transactions
}

export function getTransactionsByLocation(locationId: string): Transaction[] {
  const store = loadStore()
  return store.transactions.filter(t => t.locationId === locationId)
}

export function upsertTransaction(tx: Transaction): void {
  const store = loadStore()
  const idx = store.transactions.findIndex(t => t.depositId === tx.depositId)
  if (idx >= 0) {
    store.transactions[idx] = tx
  } else {
    store.transactions.push(tx)
  }
  saveStore(store)
}

export function getConfig(locationId: string): Config | undefined {
  const store = loadStore()
  return store.configs.find(c => c.locationId === locationId)
}

export function upsertConfig(config: Config): void {
  const store = loadStore()
  const idx = store.configs.findIndex(c => c.locationId === config.locationId)
  if (idx >= 0) {
    store.configs[idx] = config
  } else {
    store.configs.push(config)
  }
  saveStore(store)
}
