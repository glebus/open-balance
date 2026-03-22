import { useSheetData } from '@/features/sheets'
import { formatCurrency } from '@/lib/utils'
import { Target } from 'lucide-react'

export function GoalsPage() {
  const { data: goals, isLoading } = useSheetData('Goals')

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading goals...</div>
  }

  const rows = goals || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Goals</h2>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <Target size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No goals yet. Define what you're saving for.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row, i) => {
            const target = parseFloat(row.Target) || 0
            return (
              <div key={i} className="rounded-xl bg-card border border-border p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{row.Name}</h3>
                    {row.Category && (
                      <span className="text-xs text-muted-foreground">{row.Category}</span>
                    )}
                  </div>
                  <span className="text-lg font-bold">
                    {formatCurrency(target, row.Currency || 'EUR')}
                  </span>
                </div>
                {row.Deadline && (
                  <p className="text-sm text-muted-foreground">Deadline: {row.Deadline}</p>
                )}
                {row.Notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{row.Notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
