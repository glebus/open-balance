import { useState } from 'react'
import { useSheetData, useAppendRow, useUpdateRow } from '@/features/sheets'
import { useStore } from '@/lib/store'
import { Loader2, Check, Unlink } from 'lucide-react'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN', 'CHF', 'JPY', 'CAD', 'AUD']

export function SettingsPage() {
  const { data: settings, isLoading } = useSheetData('Settings')
  const appendRow = useAppendRow('Settings')
  const updateRow = useUpdateRow('Settings')
  const { spreadsheetId, spreadsheetTitle, clearSheet } = useStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const rows = settings || []
  const baseCurrencyRow = rows.findIndex((r) => r.Key === 'baseCurrency')
  const currentCurrency = baseCurrencyRow >= 0 ? rows[baseCurrencyRow].Value : 'EUR'

  const handleCurrencyChange = async (value: string) => {
    setSaving(true)
    setSaved(false)
    try {
      if (baseCurrencyRow >= 0) {
        await updateRow.mutateAsync({
          index: baseCurrencyRow,
          row: { Key: 'baseCurrency', Value: value },
        })
      } else {
        await appendRow.mutateAsync({ Key: 'baseCurrency', Value: value })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading settings...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="rounded-xl bg-card border border-border p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="baseCurrency">
            Base Currency
          </label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            All portfolio values will be converted to this currency.
          </p>
          <div className="flex items-center gap-2">
            <select
              id="baseCurrency"
              value={currentCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={saving}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {saving && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            {saved && <Check size={16} className="text-green-500" />}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
        <h3 className="font-medium mb-1">Connected Spreadsheet</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {spreadsheetTitle || spreadsheetId}
        </p>
        <button
          onClick={clearSheet}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors cursor-pointer"
        >
          <Unlink size={14} />
          Disconnect
        </button>
      </div>
    </div>
  )
}
