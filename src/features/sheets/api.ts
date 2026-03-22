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
  values?: Array<Array<string | number | boolean | null>>
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

function toCellString(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
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
  const res = await fetch(`${BASE}/${spreadsheetId}?fields=properties.title,sheets.properties`, {
    headers: headers(token),
  })
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
  const params = new URLSearchParams({
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })
  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?${params.toString()}`,
    {
      headers: headers(token),
    },
  )
  const data = await handleResponse<ValuesResponse>(res)
  const rows = data.values || []
  if (rows.length < 2) return []

  const hdrs = rows[0].map((value) => toCellString(value))
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    hdrs.forEach((h, i) => {
      obj[h] = toCellString(row[i])
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

// --- Sync tab headers (migrate schema) ---

export async function syncHeaders(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  expectedColumns: string[],
): Promise<void> {
  const res = await fetch(
    `${BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueRenderOption=FORMATTED_VALUE`,
    { headers: headers(token) },
  )
  const data = await handleResponse<ValuesResponse>(res)
  const allRows = data.values || []
  if (allRows.length === 0) return

  const currentHeaders = allRows[0].map((value) => toCellString(value))
  const expectedSet = new Set(expectedColumns)
  const currentSet = new Set(currentHeaders)

  // Check if all expected columns exist
  const missing = expectedColumns.filter((c) => !currentSet.has(c))
  if (missing.length === 0) return

  // Remap existing data rows to the new column order
  const dataRows = allRows.slice(1)
  const remapped: Record<string, string>[] = dataRows.map((row) => {
    const obj: Record<string, string> = {}
    currentHeaders.forEach((h, i) => {
      if (expectedSet.has(h)) obj[h] = toCellString(row[i])
    })
    return obj
  })

  await writeSheet(token, spreadsheetId, sheetName, expectedColumns, remapped)
}

// --- Create new spreadsheet ---

interface CreateSpreadsheetResponse {
  spreadsheetId: string
  properties: { title: string }
}

export async function createSpreadsheet(
  token: string,
  title: string,
  tabs: { name: string; columns: readonly string[] }[],
): Promise<{ spreadsheetId: string; title: string }> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      properties: { title },
      sheets: tabs.map((tab) => ({
        properties: { title: tab.name },
      })),
    }),
  })
  const data = await handleResponse<CreateSpreadsheetResponse>(res)

  // Write headers to each tab
  for (const tab of tabs) {
    await writeSheet(token, data.spreadsheetId, tab.name, [...tab.columns], [])
  }

  return { spreadsheetId: data.spreadsheetId, title: data.properties.title }
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
