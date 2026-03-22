export interface PriceLookupEntry {
  price: number
  currency: string
}

export type PriceLookup = Map<string, PriceLookupEntry>

function normalizeCode(value: string | undefined, fallback = ''): string {
  const normalized = value?.trim().toUpperCase() ?? ''
  return normalized || fallback.toUpperCase()
}

export function normalizeCurrency(value: string | undefined, fallback = ''): string {
  return normalizeCode(value, fallback)
}

export function normalizeTicker(value: string | undefined): string {
  return normalizeCode(value)
}

export function isFxTicker(ticker: string): boolean {
  return /^[A-Z]{3}\/[A-Z]{3}$/.test(normalizeTicker(ticker))
}

export function getFxTicker(from: string, to: string): string | null {
  const normalizedFrom = normalizeCurrency(from)
  const normalizedTo = normalizeCurrency(to)

  if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    return null
  }

  return `${normalizedFrom}/${normalizedTo}`
}

export function getFxQuoteCurrency(ticker: string, fallback = ''): string {
  if (!isFxTicker(ticker)) {
    return normalizeCurrency(fallback)
  }

  const [, quote] = normalizeTicker(ticker).split('/')
  return normalizeCurrency(quote, fallback)
}

export function getBaseCurrency(settings: Record<string, string>[] | undefined): string {
  const row = settings?.find((setting) => setting.Key === 'baseCurrency')
  return normalizeCurrency(row?.Value, 'EUR')
}

export function buildPriceLookup(rows: Record<string, string>[] | undefined): PriceLookup {
  const lookup: PriceLookup = new Map()

  for (const row of rows || []) {
    const ticker = normalizeTicker(row.Ticker)
    const price = Number.parseFloat(row.Price)

    if (!ticker || !Number.isFinite(price)) {
      continue
    }

    lookup.set(ticker, {
      price,
      currency: normalizeCurrency(row.Currency),
    })
  }

  return lookup
}

export function getFxRate(priceLookup: PriceLookup, from: string, to: string): number | undefined {
  const normalizedFrom = normalizeCurrency(from)
  const normalizedTo = normalizeCurrency(to)

  if (!normalizedFrom || !normalizedTo) {
    return undefined
  }

  if (normalizedFrom === normalizedTo) {
    return 1
  }

  const directTicker = getFxTicker(normalizedFrom, normalizedTo)
  const directRate = directTicker ? priceLookup.get(directTicker)?.price : undefined
  if (directRate !== undefined && Number.isFinite(directRate) && directRate > 0) {
    return directRate
  }

  const reverseTicker = getFxTicker(normalizedTo, normalizedFrom)
  const reverseRate = reverseTicker ? priceLookup.get(reverseTicker)?.price : undefined
  if (reverseRate !== undefined && Number.isFinite(reverseRate) && reverseRate > 0) {
    return 1 / reverseRate
  }

  return undefined
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  priceLookup: PriceLookup,
): number | undefined {
  const rate = getFxRate(priceLookup, from, to)

  if (rate === undefined) {
    return undefined
  }

  return amount * rate
}
