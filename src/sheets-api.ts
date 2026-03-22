const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export interface SheetRow {
  [key: string]: string
}

export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<SheetRow[]> {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to read sheet')
  }
  const data = await res.json()
  const rows: string[][] = data.values || []
  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map((row) => {
    const obj: SheetRow = {}
    headers.forEach((h, i) => {
      obj[h] = row[i] || ''
    })
    return obj
  })
}

export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  row: SheetRow
): Promise<void> {
  const values = [headers.map((h) => row[h] || '')]
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to append row')
  }
}

export async function updateCell(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  value: string
): Promise<void> {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[value]] }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to update cell')
  }
}

export async function deleteRow(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
): Promise<void> {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to delete row')
  }
}

export async function getSpreadsheetInfo(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: { sheetId: number; title: string }[] }> {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}?fields=properties.title,sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to get spreadsheet info')
  }
  const data = await res.json()
  return {
    title: data.properties.title,
    sheets: data.sheets.map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  }
}
