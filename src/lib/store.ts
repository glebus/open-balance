import { create } from 'zustand'
import type { Account, Holding, Transaction, Goal, Snapshot, Setting } from './schemas'

interface AuthState {
  accessToken: string | null
  userEmail: string
  userPhoto: string
}

interface SheetState {
  spreadsheetId: string
  spreadsheetTitle: string
}

interface DataState {
  accounts: Account[]
  holdings: Holding[]
  transactions: Transaction[]
  goals: Goal[]
  snapshots: Snapshot[]
  settings: Setting[]
}

interface AppState extends AuthState, SheetState, DataState {
  // Auth actions
  setAuth: (token: string, email: string, photo?: string) => void
  clearAuth: () => void

  // Sheet actions
  setSheet: (id: string, title: string) => void
  clearSheet: () => void

  // Data actions
  setAccounts: (data: Account[]) => void
  setHoldings: (data: Holding[]) => void
  setTransactions: (data: Transaction[]) => void
  setGoals: (data: Goal[]) => void
  setSnapshots: (data: Snapshot[]) => void
  setSettings: (data: Setting[]) => void
  clearData: () => void

  // Settings helpers
  getSetting: (key: string, fallback?: string) => string
  getBaseCurrency: () => string
  getFxRate: (from: string, to: string) => number
}

const initialData: DataState = {
  accounts: [],
  holdings: [],
  transactions: [],
  goals: [],
  snapshots: [],
  settings: [],
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  accessToken: null,
  userEmail: '',
  userPhoto: '',
  setAuth: (token, email, photo = '') => set({ accessToken: token, userEmail: email, userPhoto: photo }),
  clearAuth: () =>
    set({
      accessToken: null,
      userEmail: '',
      userPhoto: '',
      spreadsheetId: '',
      spreadsheetTitle: '',
      ...initialData,
    }),

  // Sheet
  spreadsheetId: '',
  spreadsheetTitle: '',
  setSheet: (id, title) => set({ spreadsheetId: id, spreadsheetTitle: title }),
  clearSheet: () => set({ spreadsheetId: '', spreadsheetTitle: '', ...initialData }),

  // Data
  ...initialData,
  setAccounts: (data) => set({ accounts: data }),
  setHoldings: (data) => set({ holdings: data }),
  setTransactions: (data) => set({ transactions: data }),
  setGoals: (data) => set({ goals: data }),
  setSnapshots: (data) => set({ snapshots: data }),
  setSettings: (data) => set({ settings: data }),
  clearData: () => set(initialData),

  // Settings helpers
  getSetting: (key, fallback = '') => {
    const s = get().settings.find((s) => s.key === key)
    return s?.value ?? fallback
  },
  getBaseCurrency: () => {
    return get().getSetting('baseCurrency', 'EUR')
  },
  getFxRate: (from, to) => {
    if (from === to) return 1
    const key = `fx_${from}_${to}`
    const rate = get().getSetting(key)
    if (rate) return parseFloat(rate)
    // Try reverse
    const reverseKey = `fx_${to}_${from}`
    const reverseRate = get().getSetting(reverseKey)
    if (reverseRate) return 1 / parseFloat(reverseRate)
    return 1
  },
}))
