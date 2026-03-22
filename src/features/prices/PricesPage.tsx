import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useSheetData,
  useAppendRow,
  useUpdateRow,
  useDeleteRow,
  useSheetId,
} from '@/features/sheets'
import { syncHeaders } from '@/features/sheets/api'
import { SHEET_TABS } from '@/features/sheets/constants'
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
import {
  getBaseCurrency,
  getFxQuoteCurrency,
  getFxTicker,
  isFxTicker,
  normalizeCurrency,
  normalizeTicker,
} from '@/lib/fx'
import { useStore } from '@/lib/store'

function defaultGoogleFinanceSymbol(ticker: string): string {
  const normalizedTicker = normalizeTicker(ticker)

  if (isFxTicker(normalizedTicker)) {
    const [from, to] = normalizedTicker.split('/')
    return `CURRENCY:${from}${to}`
  }

  return normalizedTicker
}

function normalizeGoogleFinanceSymbol(symbol: string, ticker: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase()
  return normalizedSymbol || defaultGoogleFinanceSymbol(ticker)
}

function googleFinanceFormula(symbol: string, ticker: string): string {
  return `=GOOGLEFINANCE("${normalizeGoogleFinanceSymbol(symbol, ticker)}")`
}

interface PriceForm {
  Ticker: string
  Price: string
  Currency: string
  Source: string
  GoogleFinanceSymbol: string
}

const empty: PriceForm = {
  Ticker: '',
  Price: '',
  Currency: 'USD',
  Source: 'formula',
  GoogleFinanceSymbol: '',
}

export function PricesPage() {
  const accessToken = useStore((s) => s.accessToken)
  const spreadsheetId = useStore((s) => s.spreadsheetId)
  const { data: prices, isLoading: loadingPrices } = useSheetData('Prices')
  const { data: holdings, isLoading: loadingHoldings } = useSheetData('Holdings')
  const { data: accounts } = useSheetData('Accounts')
  const { data: settings } = useSheetData('Settings')
  const appendRow = useAppendRow('Prices')
  const updateRow = useUpdateRow('Prices')
  const sheetId = useSheetId('Prices')
  const deleteRow = useDeleteRow('Prices', sheetId ?? 0)
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<PriceForm>(empty)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const rows = useMemo(() => prices || [], [prices])
  const holdingRows = useMemo(() => holdings || [], [holdings])

  const existingTickers = useMemo(
    () => new Set(rows.map((r) => normalizeTicker(r.Ticker)).filter(Boolean)),
    [rows],
  )

  const baseCurrency = useMemo(() => getBaseCurrency(settings), [settings])

  const missingTickers = useMemo(() => {
    const needed = new Set<string>()

    // Asset tickers from holdings
    for (const h of holdingRows) {
      const ticker = normalizeTicker(h.Ticker)
      if (ticker) needed.add(ticker)
    }

    // FX pairs: any currency that differs from base currency
    const currencies = new Set<string>()
    for (const h of holdingRows) {
      const currency = normalizeCurrency(h.Currency)
      if (currency) currencies.add(currency)
    }
    for (const a of accounts || []) {
      const currency = normalizeCurrency(a.Currency)
      if (currency) currencies.add(currency)
    }
    const base = normalizeCurrency(baseCurrency, 'EUR')
    for (const ccy of currencies) {
      const fxTicker = getFxTicker(ccy, base)
      if (fxTicker) needed.add(fxTicker)
    }

    return [...needed].filter((t) => !existingTickers.has(t))
  }, [holdingRows, accounts, baseCurrency, existingTickers])

  const buildRow = (f: PriceForm): Record<string, string> => {
    const ticker = normalizeTicker(f.Ticker)
    const currency = isFxTicker(ticker)
      ? getFxQuoteCurrency(ticker, baseCurrency)
      : normalizeCurrency(f.Currency, 'USD')
    const googleFinanceSymbol = normalizeGoogleFinanceSymbol(f.GoogleFinanceSymbol, ticker)

    if (f.Source === 'formula') {
      return {
        Ticker: ticker,
        Price: googleFinanceFormula(googleFinanceSymbol, ticker),
        Currency: currency,
        Source: 'formula',
        GoogleFinanceSymbol: googleFinanceSymbol,
      }
    }
    return {
      Ticker: ticker,
      Price: f.Price.trim(),
      Currency: currency,
      Source: 'manual',
      GoogleFinanceSymbol: googleFinanceSymbol,
    }
  }

  const handleSync = async () => {
    if (missingTickers.length === 0) return
    setSyncing(true)
    try {
      for (const ticker of missingTickers) {
        // Try to infer currency from the holding
        const holding = holdingRows.find((h) => normalizeTicker(h.Ticker) === ticker)
        const currency = isFxTicker(ticker)
          ? getFxQuoteCurrency(ticker, baseCurrency)
          : normalizeCurrency(holding?.Currency, 'USD')
        await appendRow.mutateAsync(
          buildRow({
            Ticker: ticker,
            Price: '',
            Currency: currency,
            Source: 'formula',
            GoogleFinanceSymbol: defaultGoogleFinanceSymbol(ticker),
          }),
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
      GoogleFinanceSymbol: row.GoogleFinanceSymbol || defaultGoogleFinanceSymbol(row.Ticker || ''),
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
    (field: keyof PriceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    if (!accessToken || !spreadsheetId) {
      return
    }

    let cancelled = false

    const ensurePricesHeaders = async () => {
      try {
        await syncHeaders(accessToken, spreadsheetId, SHEET_TABS.Prices.name, [
          ...SHEET_TABS.Prices.columns,
        ])
      } catch {
        return
      }

      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['sheet', spreadsheetId, 'Prices'] })
      }
    }

    void ensurePricesHeaders()

    return () => {
      cancelled = true
    }
  }, [accessToken, queryClient, spreadsheetId])

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
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sync {missingTickers.length} from Portfolio
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
          Missing prices or FX for: {missingTickers.join(', ')}
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
                  GOOGLEFINANCE Symbol
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
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.Source === 'formula'
                        ? row.GoogleFinanceSymbol || defaultGoogleFinanceSymbol(row.Ticker)
                        : row.GoogleFinanceSymbol || '—'}
                    </td>
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
                        <Button variant="ghost" size="icon-xs" onClick={() => openEdit(i)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(i)}>
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
            <DialogTitle>{editIndex !== null ? 'Edit Price' : 'Add Price'}</DialogTitle>
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
            {form.Source === 'formula' && (
              <div>
                <Label htmlFor="p-gf-symbol">GOOGLEFINANCE Symbol</Label>
                <Input
                  id="p-gf-symbol"
                  value={form.GoogleFinanceSymbol}
                  onChange={set('GoogleFinanceSymbol')}
                  placeholder={defaultGoogleFinanceSymbol(form.Ticker)}
                />
              </div>
            )}
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
              disabled={saving || !form.Ticker || (form.Source === 'manual' && !form.Price)}
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
