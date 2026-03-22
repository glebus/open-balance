import { useState } from 'react'
import { useSheetData, useAppendRow, useUpdateRow, useDeleteRow, useSheetId } from '@/features/sheets'
import { formatDate, formatNumber } from '@/lib/utils'
import { ArrowLeftRight, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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

const TYPES = ['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE'] as const

interface TxForm {
  Date: string
  Type: string
  Account: string
  Ticker: string
  Qty: string
  Price: string
  Currency: string
  Total: string
  Fee: string
  Notes: string
}

const today = () => new Date().toISOString().slice(0, 10)

const empty: TxForm = {
  Date: today(),
  Type: 'BUY',
  Account: '',
  Ticker: '',
  Qty: '',
  Price: '',
  Currency: 'USD',
  Total: '',
  Fee: '',
  Notes: '',
}

export function TransactionsPage() {
  const { data: transactions, isLoading } = useSheetData('Transactions')
  const appendRow = useAppendRow('Transactions')
  const updateRow = useUpdateRow('Transactions')
  const sheetId = useSheetId('Transactions')
  const deleteRow = useDeleteRow('Transactions', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<TxForm>(empty)
  const [saving, setSaving] = useState(false)

  const allRows = transactions || []
  const rows = allRows.slice().reverse()

  const openAdd = () => {
    setForm({ ...empty, Date: today() })
    setEditIndex(null)
    setOpen(true)
  }

  const openEdit = (displayIndex: number) => {
    // rows are reversed for display, convert back to original index
    const originalIndex = allRows.length - 1 - displayIndex
    const row = allRows[originalIndex]
    setForm({
      Date: row.Date || '',
      Type: row.Type || 'BUY',
      Account: row.Account || '',
      Ticker: row.Ticker || '',
      Qty: row.Qty || '',
      Price: row.Price || '',
      Currency: row.Currency || 'USD',
      Total: row.Total || '',
      Fee: row.Fee || '',
      Notes: row.Notes || '',
    })
    setEditIndex(originalIndex)
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const row: Record<string, string> = { ...form }
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

  const handleDelete = async (displayIndex: number) => {
    if (sheetId === undefined) return
    const originalIndex = allRows.length - 1 - displayIndex
    await deleteRow.mutateAsync(originalIndex)
  }

  const set = (field: keyof TxForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading transactions...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Transaction
        </Button>
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
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isBuy = row.Type === 'BUY'
                const isSell = row.Type === 'SELL'
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-date">Date</Label>
                <Input id="t-date" type="date" value={form.Date} onChange={set('Date')} />
              </div>
              <div>
                <Label htmlFor="t-type">Type</Label>
                <select
                  id="t-type"
                  value={form.Type}
                  onChange={set('Type')}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-account">Account</Label>
                <Input id="t-account" value={form.Account} onChange={set('Account')} placeholder="e.g. IB" />
              </div>
              <div>
                <Label htmlFor="t-ticker">Ticker</Label>
                <Input id="t-ticker" value={form.Ticker} onChange={set('Ticker')} placeholder="e.g. AAPL" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="t-qty">Qty</Label>
                <Input id="t-qty" type="number" step="any" value={form.Qty} onChange={set('Qty')} />
              </div>
              <div>
                <Label htmlFor="t-price">Price</Label>
                <Input id="t-price" type="number" step="any" value={form.Price} onChange={set('Price')} />
              </div>
              <div>
                <Label htmlFor="t-currency">Currency</Label>
                <Input id="t-currency" value={form.Currency} onChange={set('Currency')} placeholder="USD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-total">Total</Label>
                <Input id="t-total" type="number" step="any" value={form.Total} onChange={set('Total')} />
              </div>
              <div>
                <Label htmlFor="t-fee">Fee</Label>
                <Input id="t-fee" type="number" step="any" value={form.Fee} onChange={set('Fee')} placeholder="0" />
              </div>
            </div>
            <div>
              <Label htmlFor="t-notes">Notes</Label>
              <Input id="t-notes" value={form.Notes} onChange={set('Notes')} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.Date || !form.Account || !form.Ticker}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
