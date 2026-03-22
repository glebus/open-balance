import { useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import {
  getSpreadsheetInfo,
  createSpreadsheet,
  createSheetTab,
  writeSheet,
} from '@/features/sheets/api'
import { SHEET_TABS } from '@/features/sheets/constants'
import { useGooglePicker } from './useGooglePicker'
import {
  FolderOpen,
  Plus,
  Link,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return input
}

export function ConnectSheetPage() {
  const { accessToken, userEmail, userPhoto, setSheet } = useStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [pasteInput, setPasteInput] = useState('')

  const connectSheet = useCallback(
    async (spreadsheetId: string) => {
      if (!accessToken) return
      const info = await getSpreadsheetInfo(accessToken, spreadsheetId)

      // Ensure all required tabs exist
      const existingTabs = new Set(info.sheets.map((s) => s.title))
      for (const tab of Object.values(SHEET_TABS)) {
        if (!existingTabs.has(tab.name)) {
          await createSheetTab(accessToken, spreadsheetId, tab.name)
          await writeSheet(accessToken, spreadsheetId, tab.name, [...tab.columns], [])
        }
      }

      setSheet(spreadsheetId, info.title)
    },
    [accessToken, setSheet],
  )

  const handlePicked = useCallback(
    async (id: string) => {
      setError('')
      setLoading('picker')
      try {
        await connectSheet(id)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to connect spreadsheet')
      }
      setLoading(null)
    },
    [connectSheet],
  )

  const openPicker = useGooglePicker(accessToken || '', API_KEY, handlePicked)

  const handleBrowse = async () => {
    if (!API_KEY) {
      setError('Google API Key not configured. Use paste URL instead.')
      setShowPaste(true)
      return
    }
    setError('')
    setLoading('picker')
    try {
      await openPicker()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to open file picker')
    }
    setLoading(null)
  }

  const handleCreate = async () => {
    if (!accessToken) return
    setError('')
    setLoading('create')
    try {
      const tabs = Object.values(SHEET_TABS).map((t) => ({
        name: t.name,
        columns: t.columns,
      }))
      const result = await createSpreadsheet(accessToken, 'OpenBalance Portfolio', tabs)
      setSheet(result.spreadsheetId, result.title)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create spreadsheet')
    }
    setLoading(null)
  }

  const handlePaste = async () => {
    if (!pasteInput.trim()) return
    setError('')
    setLoading('paste')
    try {
      const id = extractSpreadsheetId(pasteInput.trim())
      await connectSheet(id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect spreadsheet')
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Welcome header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {userPhoto ? (
              <img src={userPhoto} alt="" className="h-16 w-16 rounded-full" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <User size={28} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold">
            Welcome{userEmail ? `, ${userEmail.split('@')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">Connect a spreadsheet to get started</p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Browse Google Drive */}
          <button
            onClick={handleBrowse}
            disabled={loading !== null}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {loading === 'picker' ? <Loader2 size={20} className="animate-spin" /> : <FolderOpen size={20} />}
            </div>
            <div>
              <div className="font-medium">Browse Google Drive</div>
              <div className="text-sm text-muted-foreground">Pick an existing spreadsheet</div>
            </div>
          </button>

          {/* Create new */}
          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {loading === 'create' ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </div>
            <div>
              <div className="font-medium">Create New Spreadsheet</div>
              <div className="text-sm text-muted-foreground">
                Pre-configured with all required tabs
              </div>
            </div>
          </button>

          {/* Paste URL (collapsible) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setShowPaste(!showPaste)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Link size={20} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-muted-foreground">Paste a URL</div>
                <div className="text-sm text-muted-foreground">Enter a spreadsheet URL or ID</div>
              </div>
              {showPaste ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </button>

            {showPaste && (
              <div className="px-4 pb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Spreadsheet URL or ID"
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePaste()}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    onClick={handlePaste}
                    disabled={loading !== null || !pasteInput.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {loading === 'paste' && <Loader2 size={14} className="animate-spin" />}
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
