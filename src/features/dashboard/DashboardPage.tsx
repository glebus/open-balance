import { useMemo } from 'react'
import { useSheetData } from '@/features/sheets'
import { toNumber, formatCurrency } from '@/lib/utils'
import {
  buildPriceLookup,
  convertAmount,
  getBaseCurrency,
  getFxTicker,
  normalizeCurrency,
  normalizeTicker,
} from '@/lib/fx'
import { TrendingUp, Briefcase, Target, ArrowLeftRight, Landmark } from 'lucide-react'

export function DashboardPage() {
  const { data: holdings, isLoading: loadingH } = useSheetData('Holdings')
  const { data: prices } = useSheetData('Prices')
  const { data: accounts } = useSheetData('Accounts')
  const { data: goals } = useSheetData('Goals')
  const { data: transactions } = useSheetData('Transactions')
  const { data: settings } = useSheetData('Settings')

  const priceLookup = useMemo(() => buildPriceLookup(prices), [prices])
  const baseCurrency = useMemo(() => getBaseCurrency(settings), [settings])

  const { holdingsValue, cashValue, missingFxPairs } = useMemo(() => {
    const missing = new Set<string>()

    const convertedHoldingsValue = (holdings || []).reduce((sum, holding) => {
      const qty = toNumber(holding.Qty)
      const priceEntry = priceLookup.get(normalizeTicker(holding.Ticker))
      const unitPrice = priceEntry?.price ?? toNumber(holding.AvgPrice)
      const quoteCurrency = normalizeCurrency(
        priceEntry?.currency || holding.Currency,
        baseCurrency,
      )
      const convertedValue = convertAmount(
        qty * unitPrice,
        quoteCurrency,
        baseCurrency,
        priceLookup,
      )

      if (convertedValue === undefined) {
        const missingTicker = getFxTicker(quoteCurrency, baseCurrency)
        if (missingTicker) {
          missing.add(missingTicker)
        }
        return sum
      }

      return sum + convertedValue
    }, 0)

    const convertedCashValue = (accounts || []).reduce((sum, account) => {
      const accountCurrency = normalizeCurrency(account.Currency, baseCurrency)
      const convertedValue = convertAmount(
        toNumber(account.Balance),
        accountCurrency,
        baseCurrency,
        priceLookup,
      )

      if (convertedValue === undefined) {
        const missingTicker = getFxTicker(accountCurrency, baseCurrency)
        if (missingTicker) {
          missing.add(missingTicker)
        }
        return sum
      }

      return sum + convertedValue
    }, 0)

    return {
      holdingsValue: convertedHoldingsValue,
      cashValue: convertedCashValue,
      missingFxPairs: [...missing],
    }
  }, [accounts, baseCurrency, holdings, priceLookup])

  const totalValue = holdingsValue + cashValue

  const stats = [
    {
      label: 'Total Value',
      value: formatCurrency(totalValue, baseCurrency),
      icon: TrendingUp,
    },
    {
      label: 'Holdings',
      value: formatCurrency(holdingsValue, baseCurrency),
      icon: Briefcase,
    },
    {
      label: 'Cash',
      value: formatCurrency(cashValue, baseCurrency),
      icon: Landmark,
    },
    {
      label: 'Goals',
      value: String((goals || []).length),
      icon: Target,
    },
    {
      label: 'Transactions',
      value: String((transactions || []).length),
      icon: ArrowLeftRight,
    },
  ]

  if (loadingH) {
    return <div className="text-muted-foreground text-sm">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <stat.icon size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {missingFxPairs.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Missing FX rates in Prices: {missingFxPairs.join(', ')}. Totals exclude balances that
          could not be converted to {baseCurrency}.
        </div>
      )}

      <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Charts and detailed breakdowns coming soon. Add holdings and transactions to see your
          portfolio here.
        </p>
      </div>
    </div>
  )
}
