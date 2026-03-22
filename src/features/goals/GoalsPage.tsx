import { useState } from 'react'
import { useSheetData, useAppendRow, useUpdateRow, useDeleteRow, useSheetId } from '@/features/sheets'
import { formatCurrency } from '@/lib/utils'
import { Target, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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

interface GoalForm {
  Name: string
  Target: string
  Currency: string
  Deadline: string
  Category: string
  Notes: string
}

const empty: GoalForm = {
  Name: '',
  Target: '',
  Currency: 'EUR',
  Deadline: '',
  Category: '',
  Notes: '',
}

export function GoalsPage() {
  const { data: goals, isLoading } = useSheetData('Goals')
  const appendRow = useAppendRow('Goals')
  const updateRow = useUpdateRow('Goals')
  const sheetId = useSheetId('Goals')
  const deleteRow = useDeleteRow('Goals', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<GoalForm>(empty)
  const [saving, setSaving] = useState(false)

  const rows = goals || []

  const openAdd = () => {
    setForm(empty)
    setEditIndex(null)
    setOpen(true)
  }

  const openEdit = (i: number) => {
    const row = rows[i]
    setForm({
      Name: row.Name || '',
      Target: row.Target || '',
      Currency: row.Currency || 'EUR',
      Deadline: row.Deadline || '',
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

  const set = (field: keyof GoalForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading goals...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Goals</h2>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Goal
        </Button>
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
              <div key={i} className="rounded-xl bg-card border border-border p-6 shadow-sm group relative">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-xs" onClick={() => openEdit(i)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(i)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
                <div className="flex items-start justify-between mb-3 pr-16">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="g-name">Name</Label>
              <Input id="g-name" value={form.Name} onChange={set('Name')} placeholder="e.g. Apartment downpayment" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-target">Target Amount</Label>
                <Input id="g-target" type="number" step="any" value={form.Target} onChange={set('Target')} />
              </div>
              <div>
                <Label htmlFor="g-currency">Currency</Label>
                <Input id="g-currency" value={form.Currency} onChange={set('Currency')} placeholder="EUR" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-deadline">Deadline</Label>
                <Input id="g-deadline" type="date" value={form.Deadline} onChange={set('Deadline')} />
              </div>
              <div>
                <Label htmlFor="g-category">Category</Label>
                <Input id="g-category" value={form.Category} onChange={set('Category')} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="g-notes">Notes</Label>
              <Input id="g-notes" value={form.Notes} onChange={set('Notes')} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.Name || !form.Target}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
