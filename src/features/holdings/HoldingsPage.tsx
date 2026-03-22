import { useSheetData } from '@/features/sheets'
import { formatNumber } from '@/lib/utils'
import { Briefcase } from 'lucide-react'

export function HoldingsPage() {
  const { data: holdings, isLoading } = useSheetData('Holdings')

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading holdings...</div>
  }

  const rows = holdings || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Holdings</h2>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <Briefcase size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No holdings yet. Add your first position.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ticker</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Currency</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = parseFloat(row.Qty) || 0
                const price = parseFloat(row.AvgPrice) || 0
                const value = qty * price
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">{row.Account}</td>
                    <td className="px-4 py-3 font-semibold">{row.Ticker}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(qty, 4)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(price)}</td>
                    <td className="px-4 py-3">{row.Currency}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(value)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.Category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.Notes}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
