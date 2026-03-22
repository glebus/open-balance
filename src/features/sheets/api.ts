const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

interface SheetsErrorResponse {
  error?: { message?: string }
}

interface SpreadsheetResponse {
  properties: { title: string }
  sheets: { properties: { sheetId: number; title: string } }[]
}

interface ValuesResponse {
  values?: string[][]
}

interface BatchUpdateResponse {
  replies: { addSheet: { properties: { sheetId: number } } }[]
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err: SheetsErrorResponse = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error: ${res.status}`)
  }
  return res.json()
}

// --- Spreadsheet info ---

export interface SheetInfo {
  sheetId: number
  title: string
}

export interface SpreadsheetInfo {
  title: string
  sheets: SheetInfo[]
}

export async function getSpreadsheetInfo(
  token: string,
  spreadsheetId: string,
): Promise<SpreadsheetInfo> {
  const res = await fetch(
    `${BASE}/${spreadsheetId}?fields=properties.title,sheets.properties`,
    { headers: headers(token) },
  )
  const data = await handleResponse<SpreadsheetResponse>(res)
  return {
    title: data.properties.title,
    sheets: data.sheets.map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  }
}

// --- Read sheet data ---

export async function readSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
): Promise<Record<string, string>[]> {
  const res = await fetch(`${BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`, {
    headers: headers(token),
  })
  const data = await handleResponse<ValuesResponse>(res)
  const rows: string[][] = data.values || []
  if (rows.length < 2) return []

  const hdrs = rows[0]
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    hdrs.forEach((h, i) => {
      obj[h] = row[i] || ''
    })
    return obj
  })
}

// --- Append row ---

export async function appendRow(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  columnHeaders: string[],
  row: Record<string, string>,
): Promise<void> {
  const values = [columnHeaders.map((h) => row[h] || '')]
  const range = encodeURIComponent(sheetName)
  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ values }),
    },
  )
  await handleResponse(res)
}

// --- Update row (batch cells) ---

export async function updateRow(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  columnHeaders: string[],
  row: Record<string, string>,
): Promise<void> {
  const rowNum = rowIndex + 2 // +1 header, +1 for 1-based
  const values = [columnHeaders.map((h) => row[h] || '')]
  const lastCol = String.fromCharCode(64 + columnHeaders.length)
  const range = `${sheetName}!A${rowNum}:${lastCol}${rowNum}`
  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({ values }),
    },
  )
  await handleResponse(res)
}

// --- Delete row ---

export async function deleteRow(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number,
): Promise<void> {
  const res = await fetch(`${BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1, // +1 for header
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    }),
  })
  await handleResponse(res)
}

// --- Write full sheet (overwrite) ---

export async function writeSheet(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  columnHeaders: string[],
  rows: Record<string, string>[],
): Promise<void> {
  const values = [columnHeaders, ...rows.map((r) => columnHeaders.map((h) => r[h] || ''))]
  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({ range: sheetName, values }),
    },
  )
  await handleResponse(res)
}

// --- Create sheet tab ---

export async function createSheetTab(
  token: string,
  spreadsheetId: string,
  title: string,
): Promise<number> {
  const res = await fetch(`${BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  })
  const data = await handleResponse<BatchUpdateResponse>(res)
  return data.replies[0].addSheet.properties.sheetId
}
