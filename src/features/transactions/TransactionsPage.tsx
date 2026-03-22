import { useSheetData } from '@/features/sheets'
import { formatDate, formatNumber } from '@/lib/utils'
import { ArrowLeftRight } from 'lucide-react'

export function TransactionsPage() {
  const { data: transactions, isLoading } = useSheetData('Transactions')

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading transactions...</div>
  }

  const rows = (transactions || []).slice().reverse()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Transactions</h2>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <ArrowLeftRight size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No transactions yet.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ticker</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Currency</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Fee</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isBuy = row.Type === 'BUY'
                const isSell = row.Type === 'SELL'
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">{formatDate(row.Date)}</td>
                    <td className={`px-4 py-3 font-semibold ${isBuy ? 'text-success' : isSell ? 'text-destructive' : ''}`}>
                      {row.Type}
                    </td>
                    <td className="px-4 py-3">{row.Account}</td>
                    <td className="px-4 py-3 font-semibold">{row.Ticker}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(parseFloat(row.Qty) || 0, 4)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(parseFloat(row.Price) || 0)}</td>
                    <td className="px-4 py-3">{row.Currency}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(parseFloat(row.Total) || 0)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.Fee || '—'}</td>
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
