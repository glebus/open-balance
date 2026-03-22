import { useMemo, useState } from 'react'
import {
  useSheetData,
  useAppendRow,
  useUpdateRow,
  useDeleteRow,
  useSheetId,
} from '@/features/sheets'
import { formatCurrency, formatDate, toNumber } from '@/lib/utils'
import {
  buildPriceLookup,
  convertAmount,
  getBaseCurrency,
  getFxTicker,
  normalizeCurrency,
  normalizeTicker,
} from '@/lib/fx'
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

function normalizeCategory(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function GoalsPage() {
  const { data: goals, isLoading: loadingGoals } = useSheetData('Goals')
  const { data: holdings, isLoading: loadingHoldings } = useSheetData('Holdings')
  const { data: accounts, isLoading: loadingAccounts } = useSheetData('Accounts')
  const { data: prices, isLoading: loadingPrices } = useSheetData('Prices')
  const { data: settings, isLoading: loadingSettings } = useSheetData('Settings')
  const appendRow = useAppendRow('Goals')
  const updateRow = useUpdateRow('Goals')
  const sheetId = useSheetId('Goals')
  const deleteRow = useDeleteRow('Goals', sheetId ?? 0)

  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<GoalForm>(empty)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => goals || [], [goals])
  const priceLookup = useMemo(() => buildPriceLookup(prices), [prices])
  const baseCurrency = useMemo(() => getBaseCurrency(settings), [settings])
  const availableCategories = useMemo(() => {
    const categories = new Map<string, string>()

    for (const holding of holdings || []) {
      const normalized = normalizeCategory(holding.Category)
      const label = holding.Category?.trim() ?? ''

      if (normalized && label && !categories.has(normalized)) {
        categories.set(normalized, label)
      }
    }

    const currentCategory = form.Category.trim()
    const normalizedCurrentCategory = normalizeCategory(currentCategory)
    if (
      normalizedCurrentCategory &&
      currentCategory &&
      !categories.has(normalizedCurrentCategory)
    ) {
      categories.set(normalizedCurrentCategory, currentCategory)
    }

    return [...categories.values()].sort((left, right) => left.localeCompare(right))
  }, [form.Category, holdings])

  const { portfolioValueBase, categoryTotalsBase, missingFxPairs } = useMemo(() => {
    const missing = new Set<string>()
    const categoryTotals = new Map<string, number>()

    const holdingsValueBase = (holdings || []).reduce((sum, holding) => {
      const qty = toNumber(holding.Qty)
      const priceEntry = priceLookup.get(normalizeTicker(holding.Ticker))
      const unitPrice = priceEntry?.price ?? toNumber(holding.AvgPrice)
      const quoteCurrency = normalizeCurrency(
        priceEntry?.currency || holding.Currency,
        baseCurrency,
      )
      const convertedValue = convertAmount(
        qty * unitPrice,
        quoteCurrency,
        baseCurrency,
        priceLookup,
      )

      if (convertedValue === undefined) {
        const missingTicker = getFxTicker(quoteCurrency, baseCurrency)
        if (missingTicker) {
          missing.add(missingTicker)
        }
        return sum
      }

      const categoryKey = normalizeCategory(holding.Category)
      if (categoryKey) {
        categoryTotals.set(categoryKey, (categoryTotals.get(categoryKey) || 0) + convertedValue)
      }

      return sum + convertedValue
    }, 0)

    const cashValueBase = (accounts || []).reduce((sum, account) => {
      const accountCurrency = normalizeCurrency(account.Currency, baseCurrency)
      const convertedValue = convertAmount(
        toNumber(account.Balance),
        accountCurrency,
        baseCurrency,
        priceLookup,
      )

      if (convertedValue === undefined) {
        const missingTicker = getFxTicker(accountCurrency, baseCurrency)
        if (missingTicker) {
          missing.add(missingTicker)
        }
        return sum
      }

      return sum + convertedValue
    }, 0)

    return {
      portfolioValueBase: holdingsValueBase + cashValueBase,
      categoryTotalsBase: categoryTotals,
      missingFxPairs: [...missing],
    }
  }, [accounts, baseCurrency, holdings, priceLookup])

  const goalSummary = useMemo(() => {
    return rows.reduce(
      (summary, goal) => {
        const target = toNumber(goal.Target)
        const goalCurrency = normalizeCurrency(goal.Currency, baseCurrency)
        const trackedValueBase = goal.Category
          ? categoryTotalsBase.get(normalizeCategory(goal.Category)) || 0
          : portfolioValueBase
        const currentValue = convertAmount(
          trackedValueBase,
          baseCurrency,
          goalCurrency,
          priceLookup,
        )

        if (currentValue !== undefined && currentValue >= target && target > 0) {
          summary.completed += 1
        }

        return summary
      },
      { completed: 0, total: rows.length },
    )
  }, [baseCurrency, categoryTotalsBase, portfolioValueBase, priceLookup, rows])

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

  const set =
    (field: keyof GoalForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  if (loadingGoals || loadingHoldings || loadingAccounts || loadingPrices || loadingSettings) {
    return <div className="text-muted-foreground text-sm">Loading goals...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Goals</h2>
          <p className="text-sm text-muted-foreground">
            {goalSummary.completed} of {goalSummary.total} goals reached
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />
          Add Goal
        </Button>
      </div>

      {missingFxPairs.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Missing FX rates in Prices: {missingFxPairs.join(', ')}. Goal progress excludes values
          that could not be converted to {baseCurrency}.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center shadow-sm">
          <Target size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No goals yet. Define what you're saving for.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row, i) => {
            const target = toNumber(row.Target)
            const goalCurrency = normalizeCurrency(row.Currency, baseCurrency)
            const goalCategoryKey = normalizeCategory(row.Category)
            const trackedValueBase = row.Category
              ? categoryTotalsBase.get(goalCategoryKey) || 0
              : portfolioValueBase
            const currentValue = convertAmount(
              trackedValueBase,
              baseCurrency,
              goalCurrency,
              priceLookup,
            )
            const progress = currentValue !== undefined && target > 0 ? currentValue / target : 0
            const progressWidth = `${Math.min(progress * 100, 100)}%`
            const remainingValue =
              currentValue !== undefined ? Math.max(target - currentValue, 0) : undefined
            const isCompleted = currentValue !== undefined && currentValue >= target && target > 0
            const hasMatchingCategory = row.Category
              ? categoryTotalsBase.has(goalCategoryKey)
              : true
            const goalFxPair =
              currentValue === undefined ? getFxTicker(baseCurrency, goalCurrency) : null
            return (
              <div
                key={i}
                className="rounded-xl bg-card border border-border p-6 shadow-sm group relative"
              >
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
                    <span className="text-xs text-muted-foreground">
                      {row.Category
                        ? `Tracking category ${row.Category}`
                        : 'Tracking total portfolio'}
                    </span>
                  </div>
                  <span className="text-lg font-bold">{formatCurrency(target, goalCurrency)}</span>
                </div>
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span className="font-medium">
                      {currentValue !== undefined
                        ? formatCurrency(currentValue, goalCurrency)
                        : '—'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-[width] ${
                        isCompleted ? 'bg-success' : 'bg-primary'
                      }`}
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.min(progress * 100, 100).toFixed(0)}% funded</span>
                    <span>
                      {remainingValue !== undefined
                        ? `${formatCurrency(remainingValue, goalCurrency)} left`
                        : 'Progress unavailable'}
                    </span>
                  </div>
                </div>
                {goalFxPair && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Missing FX rate for {goalFxPair}. Progress is unavailable in {goalCurrency}.
                  </p>
                )}
                {!goalFxPair && row.Category && !hasMatchingCategory && (
                  <p className="text-sm text-muted-foreground">
                    No holdings currently match category {row.Category}.
                  </p>
                )}
                {row.Deadline && (
                  <p className="text-sm text-muted-foreground">
                    Deadline: {formatDate(row.Deadline)}
                  </p>
                )}
                {row.Notes && <p className="mt-2 text-sm text-muted-foreground">{row.Notes}</p>}
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
              <Input
                id="g-name"
                value={form.Name}
                onChange={set('Name')}
                placeholder="e.g. Apartment downpayment"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-target">Target Amount</Label>
                <Input
                  id="g-target"
                  type="number"
                  step="any"
                  value={form.Target}
                  onChange={set('Target')}
                />
              </div>
              <div>
                <Label htmlFor="g-currency">Currency</Label>
                <Input
                  id="g-currency"
                  value={form.Currency}
                  onChange={set('Currency')}
                  placeholder="EUR"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="g-deadline">Deadline</Label>
                <Input
                  id="g-deadline"
                  type="date"
                  value={form.Deadline}
                  onChange={set('Deadline')}
                />
              </div>
              <div>
                <Label htmlFor="g-category">Category</Label>
                <select
                  id="g-category"
                  value={form.Category}
                  onChange={set('Category')}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Whole portfolio</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a Holdings category to link this goal. Leave blank to track total portfolio
                  value.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="g-notes">Notes</Label>
              <Input
                id="g-notes"
                value={form.Notes}
                onChange={set('Notes')}
                placeholder="Optional"
              />
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
