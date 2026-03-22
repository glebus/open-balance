import { useState, useMemo } from 'react'
import {
  useSheetData,
  useAppendRow,
  useUpdateRow,
  useDeleteRow,
  useSheetId,
} from '@/features/sheets'
import { formatNumber } from '@/lib/utils'
import { DollarSign, Plus, RefreshCw, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function googleFinanceFormula(ticker: string): string {
  return `=GOOGLEFINANCE("${ticker}","price")`
}

interface PriceForm {
  Ticker: string
  Price: string
  Currency: string
  Source: string
}

const empty: PriceForm = {
  Ticker: '',
  Price: '',
  Currency: 'USD',
  Source: 'formula',
}

export function PricesPage() {
  const { data: prices, isLoading: loadingPrices } = useSheetData('Prices')
  const { data: holdings, isLoading: loadingHoldings } = useSheetData('Holdings')
  const appendRow = useAppendRow('Prices')
  const updateRow = useUpdateRow('Prices')
  const sheetId = useSheetId('Prices')
  const deleteRow = useDeleteRow('Prices', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<PriceForm>(empty)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const rows = useMemo(() => prices || [], [prices])
  const holdingRows = useMemo(() => holdings || [], [holdings])

  const existingTickers = useMemo(
    () => new Set(rows.map((r) => r.Ticker.toUpperCase())),
    [rows],
  )

  const missingTickers = useMemo(() => {
    const holdingTickers = new Set(
      holdingRows.map((h) => h.Ticker.toUpperCase()).filter(Boolean),
    )
    return [...holdingTickers].filter((t) => !existingTickers.has(t))
  }, [holdingRows, existingTickers])

  const buildRow = (f: PriceForm): Record<string, string> => {
    if (f.Source === 'formula') {
      return {
        Ticker: f.Ticker,
        Price: googleFinanceFormula(f.Ticker),
        Currency: f.Currency,
        Source: 'formula',
      }
    }
    return { ...f }
  }

  const handleSync = async () => {
    if (missingTickers.length === 0) return
    setSyncing(true)
    try {
      for (const ticker of missingTickers) {
        // Try to infer currency from the holding
        const holding = holdingRows.find(
          (h) => h.Ticker.toUpperCase() === ticker,
        )
        const currency = holding?.Currency || 'USD'
        await appendRow.mutateAsync(
          buildRow({ Ticker: ticker, Price: '', Currency: currency, Source: 'formula' }),
        )
      }
    } finally {
      setSyncing(false)
    }
  }

  const openAdd = () => {
    setForm(empty)
    setEditIndex(null)
    setOpen(true)
  }

  const openEdit = (i: number) => {
    const row = rows[i]
    setForm({
      Ticker: row.Ticker || '',
      Price: row.Price || '',
      Currency: row.Currency || 'USD',
      Source: row.Source || 'manual',
    })
    setEditIndex(i)
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const row = buildRow(form)
      if (editIndex !== null) {
        await updateRow.mutateAsync({ index: editIndex, row })
      } else {
        await appendRow.mutateAsync(row)
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (i: number) => {
    if (sheetId === undefined) return
    await deleteRow.mutateAsync(i)
  }

  const set =
    (field: keyof PriceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  if (loadingPrices || loadingHoldings) {
    return <div className="text-muted-foreground text-sm">Loading prices...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Prices</h2>
        <div className="flex gap-2">
          {missingTickers.length > 0 && (
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Sync {missingTickers.length} from Holdings
            </Button>
          )}
          <Button onClick={openAdd}>
            <Plus size={16} />
            Add Price
          </Button>
        </div>
      </div>

      {missingTickers.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} />
          Missing prices for: {missingTickers.join(', ')}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <DollarSign size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No prices yet. Sync from holdings or add manually.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ticker
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Currency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const price = parseFloat(row.Price)
                const hasError = isNaN(price) || row.Price === '' || row.Price === '#N/A'
                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors group"
                  >
                    <td className="px-4 py-3 font-semibold">{row.Ticker}</td>
                    <td className="px-4 py-3 text-right">
                      {hasError ? (
                        <span className="text-destructive flex items-center justify-end gap-1">
                          <AlertTriangle size={14} />
                          {row.Price || 'N/A'}
                        </span>
                      ) : (
                        formatNumber(price)
                      )}
                    </td>
                    <td className="px-4 py-3">{row.Currency}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.Source === 'formula'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {row.Source === 'formula' ? 'GOOGLEFINANCE' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(i)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(i)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? 'Edit Price' : 'Add Price'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="p-ticker">Ticker</Label>
              <Input
                id="p-ticker"
                value={form.Ticker}
                onChange={set('Ticker')}
                placeholder="e.g. AAPL"
                disabled={editIndex !== null}
              />
            </div>
            <div>
              <Label htmlFor="p-source">Source</Label>
              <select
                id="p-source"
                value={form.Source}
                onChange={set('Source')}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="formula">GOOGLEFINANCE (auto)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            {form.Source === 'manual' && (
              <div>
                <Label htmlFor="p-price">Price</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="any"
                  value={form.Price}
                  onChange={set('Price')}
                />
              </div>
            )}
            <div>
              <Label htmlFor="p-currency">Currency</Label>
              <Input
                id="p-currency"
                value={form.Currency}
                onChange={set('Currency')}
                placeholder="USD"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.Ticker ||
                (form.Source === 'manual' && !form.Price)
              }
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
