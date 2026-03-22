import { useState } from 'react'
import { useSheetData, useAppendRow, useUpdateRow, useDeleteRow, useSheetId } from '@/features/sheets'
import { formatNumber } from '@/lib/utils'
import { Landmark, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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

const ACCOUNT_TYPES = ['Broker', 'Bank', 'Crypto', 'DeFi', 'Other'] as const

interface AccountForm {
  Name: string
  Type: string
  Currency: string
  Balance: string
  Notes: string
}

const empty: AccountForm = {
  Name: '',
  Type: 'Broker',
  Currency: 'EUR',
  Balance: '0',
  Notes: '',
}

export function AccountsPage() {
  const { data: accounts, isLoading } = useSheetData('Accounts')
  const appendRow = useAppendRow('Accounts')
  const updateRow = useUpdateRow('Accounts')
  const sheetId = useSheetId('Accounts')
  const deleteRow = useDeleteRow('Accounts', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<AccountForm>(empty)
  const [saving, setSaving] = useState(false)

  const rows = accounts || []

  const openAdd = () => {
    setForm(empty)
    setEditIndex(null)
    setOpen(true)
  }

  const openEdit = (i: number) => {
    const row = rows[i]
    setForm({
      Name: row.Name || '',
      Type: row.Type || 'Broker',
      Currency: row.Currency || 'EUR',
      Balance: row.Balance || '0',
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

  const set = (field: keyof AccountForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading accounts...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Account
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <Landmark size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No accounts yet. Add your first broker or bank account.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Currency</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Cash Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
                  <td className="px-4 py-3 font-semibold">{row.Name}</td>
                  <td className="px-4 py-3">{row.Type}</td>
                  <td className="px-4 py-3">{row.Currency}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatNumber(parseFloat(row.Balance) || 0)}
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="a-name">Name</Label>
              <Input id="a-name" value={form.Name} onChange={set('Name')} placeholder="e.g. Interactive Brokers" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="a-type">Type</Label>
                <select
                  id="a-type"
                  value={form.Type}
                  onChange={set('Type')}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="a-currency">Currency</Label>
                <Input id="a-currency" value={form.Currency} onChange={set('Currency')} placeholder="EUR" />
              </div>
            </div>
            <div>
              <Label htmlFor="a-balance">Cash Balance</Label>
              <Input id="a-balance" type="number" step="any" value={form.Balance} onChange={set('Balance')} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="a-notes">Notes</Label>
              <Input id="a-notes" value={form.Notes} onChange={set('Notes')} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.Name}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
