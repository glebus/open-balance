import { useState } from 'react'
import { useSheetData, useAppendRow, useUpdateRow, useDeleteRow, useSheetId } from '@/features/sheets'
import { formatNumber } from '@/lib/utils'
import { Briefcase, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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

interface HoldingForm {
  Account: string
  Ticker: string
  Qty: string
  AvgPrice: string
  Currency: string
  Category: string
  Notes: string
}

const empty: HoldingForm = {
  Account: '',
  Ticker: '',
  Qty: '',
  AvgPrice: '',
  Currency: 'USD',
  Category: '',
  Notes: '',
}

export function HoldingsPage() {
  const { data: holdings, isLoading } = useSheetData('Holdings')
  const appendRow = useAppendRow('Holdings')
  const updateRow = useUpdateRow('Holdings')
  const sheetId = useSheetId('Holdings')
  const deleteRow = useDeleteRow('Holdings', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<HoldingForm>(empty)
  const [saving, setSaving] = useState(false)

  const rows = holdings || []

  const openAdd = () => {
    setForm(empty)
    setEditIndex(null)
    setOpen(true)
  }

  const openEdit = (i: number) => {
    const row = rows[i]
    setForm({
      Account: row.Account || '',
      Ticker: row.Ticker || '',
      Qty: row.Qty || '',
      AvgPrice: row.AvgPrice || '',
      Currency: row.Currency || 'USD',
      Category: row.Category || '',
      Notes: row.Notes || '',
    })
    setEditIndex(i)
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

  const handleDelete = async (i: number) => {
    if (sheetId === undefined) return
    await deleteRow.mutateAsync(i)
  }

  const set = (field: keyof HoldingForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading holdings...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Holdings</h2>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Holding
        </Button>
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
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const qty = parseFloat(row.Qty) || 0
                const price = parseFloat(row.AvgPrice) || 0
                const value = qty * price
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
                    <td className="px-4 py-3">{row.Account}</td>
                    <td className="px-4 py-3 font-semibold">{row.Ticker}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(qty, 4)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(price)}</td>
                    <td className="px-4 py-3">{row.Currency}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(value)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.Category}</td>
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
            <DialogTitle>{editIndex !== null ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="h-account">Account</Label>
                <Input id="h-account" value={form.Account} onChange={set('Account')} placeholder="e.g. IB" />
              </div>
              <div>
                <Label htmlFor="h-ticker">Ticker</Label>
                <Input id="h-ticker" value={form.Ticker} onChange={set('Ticker')} placeholder="e.g. AAPL" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="h-qty">Qty</Label>
                <Input id="h-qty" type="number" step="any" value={form.Qty} onChange={set('Qty')} />
              </div>
              <div>
                <Label htmlFor="h-price">Avg Price</Label>
                <Input id="h-price" type="number" step="any" value={form.AvgPrice} onChange={set('AvgPrice')} />
              </div>
              <div>
                <Label htmlFor="h-currency">Currency</Label>
                <Input id="h-currency" value={form.Currency} onChange={set('Currency')} placeholder="USD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="h-category">Category</Label>
                <Input id="h-category" value={form.Category} onChange={set('Category')} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="h-notes">Notes</Label>
                <Input id="h-notes" value={form.Notes} onChange={set('Notes')} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.Account || !form.Ticker}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
