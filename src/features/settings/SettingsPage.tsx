import { useSheetData } from '@/features/sheets'
import { useStore } from '@/lib/store'
import { Settings } from 'lucide-react'

export function SettingsPage() {
  const { data: settings, isLoading } = useSheetData('Settings')
  const spreadsheetId = useStore((s) => s.spreadsheetId)

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading settings...</div>
  }

  const rows = settings || []

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>

      <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
        <h3 className="font-medium mb-3">Connected Spreadsheet</h3>
        <p className="text-sm text-muted-foreground break-all">{spreadsheetId}</p>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="font-medium">Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Key-value pairs stored in the Settings tab. Edit directly in the spreadsheet for now.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Settings size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No settings yet. Add rows to the Settings tab in your spreadsheet.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Example: Key = <code>baseCurrency</code>, Value = <code>EUR</code>
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3 font-mono text-sm">{row.Key}</td>
                  <td className="px-4 py-3">{row.Value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
