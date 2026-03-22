import { useMemo } from 'react'
import { useSheetData } from '@/features/sheets'
import { toNumber, formatCurrency } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { TrendingUp, Briefcase, Target, ArrowLeftRight } from 'lucide-react'

export function DashboardPage() {
  const { data: holdings, isLoading: loadingH } = useSheetData('Holdings')
  const { data: prices } = useSheetData('Prices')
  const { data: goals } = useSheetData('Goals')
  const { data: transactions } = useSheetData('Transactions')
  const { data: settings } = useSheetData('Settings')
  const getBaseCurrency = useStore((s) => s.getBaseCurrency)
  const setSettings = useStore((s) => s.setSettings)

  // Sync settings to store
  if (settings) {
    setSettings(settings.map((s) => ({ key: s.Key, value: s.Value })))
  }

  const priceMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of prices || []) {
      const val = parseFloat(p.Price)
      if (!isNaN(val)) map.set(p.Ticker.toUpperCase(), val)
    }
    return map
  }, [prices])

  const baseCurrency = getBaseCurrency()
  // Use market price when available, fall back to avg price (cost basis)
  const totalValue = (holdings || []).reduce((sum, h) => {
    const qty = toNumber(h.Qty)
    const mktPrice = priceMap.get(h.Ticker.toUpperCase())
    const price = mktPrice ?? toNumber(h.AvgPrice)
    return sum + qty * price
  }, 0)

  const stats = [
    {
      label: 'Total Value',
      value: formatCurrency(totalValue, baseCurrency),
      icon: TrendingUp,
    },
    {
      label: 'Holdings',
      value: String((holdings || []).length),
      icon: Briefcase,
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Charts and detailed breakdowns coming soon. Add holdings and transactions to see your
          portfolio here.
        </p>
      </div>
    </div>
  )
}
