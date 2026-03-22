import { z } from 'zod/v4'

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Broker', 'Bank', 'Crypto', 'DeFi', 'Other']),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional().default(''),
})

export const holdingSchema = z.object({
  account: z.string().min(1, 'Account is required'),
  ticker: z.string().min(1, 'Ticker is required'),
  qty: z.number(),
  avgPrice: z.number().min(0),
  currency: z.string().min(1),
  category: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const transactionSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE']),
  account: z.string().min(1, 'Account is required'),
  ticker: z.string().min(1, 'Ticker is required'),
  qty: z.number(),
  price: z.number().min(0),
  currency: z.string().min(1),
  total: z.number(),
  fee: z.number().optional().default(0),
  notes: z.string().optional().default(''),
})

export const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target: z.number().min(0, 'Target must be positive'),
  currency: z.string().min(1),
  deadline: z.string().optional().default(''),
  category: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export const snapshotSchema = z.object({
  date: z.string().min(1),
  totalValue: z.number(),
  currency: z.string().min(1),
  notes: z.string().optional().default(''),
})

export const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export type Account = z.infer<typeof accountSchema>
export type Holding = z.infer<typeof holdingSchema>
export type Transaction = z.infer<typeof transactionSchema>
export type Goal = z.infer<typeof goalSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type Setting = z.infer<typeof settingSchema>
