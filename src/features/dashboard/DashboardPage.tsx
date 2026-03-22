import { useSheetData } from '@/features/sheets'
import { toNumber, formatCurrency } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { TrendingUp, Briefcase, Target, ArrowLeftRight } from 'lucide-react'

export function DashboardPage() {
  const { data: holdings, isLoading: loadingH } = useSheetData('Holdings')
  const { data: goals } = useSheetData('Goals')
  const { data: transactions } = useSheetData('Transactions')
  const { data: settings } = useSheetData('Settings')
  const getBaseCurrency = useStore((s) => s.getBaseCurrency)
  const setSettings = useStore((s) => s.setSettings)

  // Sync settings to store
  if (settings) {
    setSettings(settings.map((s) => ({ key: s.Key, value: s.Value })))
  }

  const baseCurrency = getBaseCurrency()
  const totalValue = (holdings || []).reduce((sum, h) => {
    return sum + toNumber(h.Qty) * toNumber(h.AvgPrice)
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
