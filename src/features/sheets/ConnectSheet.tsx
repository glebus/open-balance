import { useState } from 'react'
import { useStore } from '@/lib/store'
import { getSpreadsheetInfo, createSheetTab, writeSheet } from './api'
import { SHEET_TABS } from './constants'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

export function ConnectSheet() {
  const { accessToken, setSheet } = useStore()
  const [inputId, setInputId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    if (!accessToken || !inputId.trim()) return
    setLoading(true)
    setError('')

    try {
      const id = extractSpreadsheetId(inputId.trim())
      const info = await getSpreadsheetInfo(accessToken, id)

      // Ensure all required tabs exist
      const existingTabs = new Set(info.sheets.map((s) => s.title))
      for (const tab of Object.values(SHEET_TABS)) {
        if (!existingTabs.has(tab.name)) {
          const sheetId = await createSheetTab(accessToken, id, tab.name)
          // Write headers
          await writeSheet(accessToken, id, tab.name, [...tab.columns], [])
          info.sheets.push({ sheetId, title: tab.name })
        }
      }

      setSheet(id, info.title)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-lg mt-12">
      <div className="rounded-xl bg-card p-8 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet size={24} className="text-primary" />
          <h2 className="text-lg font-semibold">Connect a Spreadsheet</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Paste a Google Sheets URL or spreadsheet ID. The app will create the required tabs
          automatically if they don't exist.
        </p>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Spreadsheet URL or ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={handleConnect}
            disabled={loading || !inputId.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Connect
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          The spreadsheet must be owned by or shared with your Google account.
        </p>
      </div>
    </div>
  )
}

function extractSpreadsheetId(input: string): string {
  // Handle full URLs
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  // Assume raw ID
  return input
}
