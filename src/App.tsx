import { useState, useCallback } from 'react'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import {
  getSheetData,
  appendRow,
  updateCell,
  deleteRow,
  getSpreadsheetInfo,
  SheetRow,
} from './sheets-api'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

// The sheet tab we'll work with for this POC
const SHEET_NAME = 'Items'
const HEADERS = ['Name', 'Value', 'Notes']

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('')
  const [sheetId, setSheetId] = useState<number | null>(null)
  const [rows, setRows] = useState<SheetRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  // --- Auth ---
  const login = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      setError('')
      // Fetch user info
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const info = await res.json()
        setUserEmail(info.email || 'Unknown')
      } catch {
        setUserEmail('Signed in')
      }
    },
    onError: (err) => setError('Login failed: ' + (err.error_description || err.error || 'unknown')),
  })

  const logout = () => {
    googleLogout()
    setAccessToken(null)
    setUserEmail('')
    setSpreadsheetId('')
    setSpreadsheetTitle('')
    setRows([])
    setSheetId(null)
  }

  // --- Connect spreadsheet ---
  const connectSheet = useCallback(async () => {
    if (!accessToken || !spreadsheetId.trim()) return
    setLoading(true)
    setError('')
    try {
      const info = await getSpreadsheetInfo(accessToken, spreadsheetId.trim())
      setSpreadsheetTitle(info.title)

      // Find or note our sheet tab
      const tab = info.sheets.find((s) => s.title === SHEET_NAME)
      if (tab) {
        setSheetId(tab.sheetId)
      } else {
        setError(
          `Sheet tab "${SHEET_NAME}" not found. Available tabs: ${info.sheets.map((s) => s.title).join(', ')}. Create a tab named "${SHEET_NAME}" with headers: ${HEADERS.join(', ')}`
        )
        setLoading(false)
        return
      }

      const data = await getSheetData(accessToken, spreadsheetId.trim(), SHEET_NAME)
      setRows(data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [accessToken, spreadsheetId])

  // --- CRUD ---
  const refresh = async () => {
    if (!accessToken || !spreadsheetId) return
    setLoading(true)
    try {
      const data = await getSheetData(accessToken, spreadsheetId, SHEET_NAME)
      setRows(data)
      setError('')
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!accessToken || !spreadsheetId || !formName.trim()) return
    setLoading(true)
    try {
      await appendRow(accessToken, spreadsheetId, SHEET_NAME, HEADERS, {
        Name: formName,
        Value: formValue,
        Notes: formNotes,
      })
      setFormName('')
      setFormValue('')
      setFormNotes('')
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!accessToken || !spreadsheetId || editingIdx === null) return
    setLoading(true)
    try {
      const rowNum = editingIdx + 2 // +1 for header, +1 for 1-based
      await updateCell(accessToken, spreadsheetId, `${SHEET_NAME}!A${rowNum}`, formName)
      await updateCell(accessToken, spreadsheetId, `${SHEET_NAME}!B${rowNum}`, formValue)
      await updateCell(accessToken, spreadsheetId, `${SHEET_NAME}!C${rowNum}`, formNotes)
      setEditingIdx(null)
      setFormName('')
      setFormValue('')
      setFormNotes('')
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleDelete = async (idx: number) => {
    if (!accessToken || !spreadsheetId || sheetId === null) return
    if (!confirm(`Delete "${rows[idx]?.Name}"?`)) return
    setLoading(true)
    try {
      await deleteRow(accessToken, spreadsheetId, sheetId, idx + 1) // +1 for header row
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setFormName(rows[idx].Name || '')
    setFormValue(rows[idx].Value || '')
    setFormNotes(rows[idx].Notes || '')
  }

  const cancelEdit = () => {
    setEditingIdx(null)
    setFormName('')
    setFormValue('')
    setFormNotes('')
  }

  // --- Render ---
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>InvestTrack POC</h1>
      <p style={styles.subtitle}>Google Sheets CRUD Demo</p>

      {error && <div style={styles.error}>{error}</div>}

      {/* Auth Section */}
      {!accessToken ? (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Step 1: Sign in with Google</h2>
          <button onClick={() => login()} style={styles.btn}>
            Sign in with Google
          </button>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.row}>
            <span>Signed in as <strong>{userEmail}</strong></span>
            <button onClick={logout} style={styles.btnSmall}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Connection */}
      {accessToken && !spreadsheetTitle && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Step 2: Connect a Spreadsheet</h2>
          <p style={styles.hint}>
            Paste the spreadsheet ID from the URL:<br />
            <code>https://docs.google.com/spreadsheets/d/<strong>[THIS_PART]</strong>/edit</code>
          </p>
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Spreadsheet ID"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
            <button onClick={connectSheet} style={styles.btn} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Data View + CRUD */}
      {accessToken && spreadsheetTitle && (
        <>
          <div style={styles.card}>
            <div style={styles.row}>
              <h2 style={styles.cardTitle}>
                Connected: {spreadsheetTitle}
              </h2>
              <button onClick={refresh} style={styles.btnSmall} disabled={loading}>
                Refresh
              </button>
              <button
                onClick={() => {
                  setSpreadsheetTitle('')
                  setRows([])
                  setSheetId(null)
                }}
                style={styles.btnSmall}
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Add / Edit Form */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              {editingIdx !== null ? 'Edit Item' : 'Add Item'}
            </h2>
            <div style={styles.row}>
              <input
                style={styles.input}
                placeholder="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
              />
              <input
                style={{ ...styles.input, flex: 2 }}
                placeholder="Notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
              {editingIdx !== null ? (
                <>
                  <button onClick={handleUpdate} style={styles.btn} disabled={loading}>
                    Save
                  </button>
                  <button onClick={cancelEdit} style={styles.btnSmall}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={handleAdd} style={styles.btn} disabled={loading || !formName.trim()}>
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Data ({rows.length} rows)</h2>
            {rows.length === 0 ? (
              <p style={styles.hint}>No data yet. Add some items above.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Value</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : undefined}>
                      <td style={styles.td}>{i + 1}</td>
                      <td style={styles.td}>{row.Name}</td>
                      <td style={styles.td}>{row.Value}</td>
                      <td style={styles.td}>{row.Notes}</td>
                      <td style={styles.td}>
                        <button onClick={() => startEdit(i)} style={styles.actionBtn}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(i)} style={styles.deleteBtn}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Inline styles for POC — no CSS deps needed
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 20,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: '#666', marginBottom: 20 },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, flex: 1 },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
  input: {
    flex: 1,
    minWidth: 80,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
  },
  btn: {
    padding: '8px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  btnSmall: {
    padding: '4px 12px',
    background: 'none',
    color: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  hint: { color: '#888', fontSize: 13, marginBottom: 12 },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    borderBottom: '2px solid #eee',
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase' as const,
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #f0f0f0' },
  trEven: { background: '#f9fafb' },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    marginRight: 8,
    fontSize: 13,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: 13,
  },
}
