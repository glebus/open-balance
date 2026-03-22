export const SHEET_TABS = {
  Accounts: {
    name: 'Accounts',
    columns: ['Name', 'Type', 'Currency', 'Notes'],
  },
  Holdings: {
    name: 'Holdings',
    columns: ['Account', 'Ticker', 'Qty', 'AvgPrice', 'Currency', 'Category', 'Notes'],
  },
  Transactions: {
    name: 'Transactions',
    columns: ['Date', 'Type', 'Account', 'Ticker', 'Qty', 'Price', 'Currency', 'Total', 'Fee', 'Notes'],
  },
  Goals: {
    name: 'Goals',
    columns: ['Name', 'Target', 'Currency', 'Deadline', 'Category', 'Notes'],
  },
  Snapshots: {
    name: 'Snapshots',
    columns: ['Date', 'TotalValue', 'Currency', 'Notes'],
  },
  Settings: {
    name: 'Settings',
    columns: ['Key', 'Value'],
  },
} as const

export type SheetTabName = keyof typeof SHEET_TABS
