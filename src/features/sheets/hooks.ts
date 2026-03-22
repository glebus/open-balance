import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { readSheet, appendRow, updateRow, deleteRow } from './api'
import { SHEET_TABS, type SheetTabName } from './constants'

function useSheetContext() {
  const token = useStore((s) => s.accessToken)
  const spreadsheetId = useStore((s) => s.spreadsheetId)
  if (!token || !spreadsheetId) throw new Error('Not connected')
  return { token, spreadsheetId }
}

export function useSheetData(tab: SheetTabName) {
  const { token, spreadsheetId } = useSheetContext()
  const config = SHEET_TABS[tab]

  return useQuery({
    queryKey: ['sheet', spreadsheetId, tab],
    queryFn: () => readSheet(token, spreadsheetId, config.name),
    enabled: !!token && !!spreadsheetId,
    staleTime: 30_000,
  })
}

export function useAppendRow(tab: SheetTabName) {
  const { token, spreadsheetId } = useSheetContext()
  const config = SHEET_TABS[tab]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (row: Record<string, string>) =>
      appendRow(token, spreadsheetId, config.name, [...config.columns], row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet', spreadsheetId, tab] })
    },
  })
}

export function useUpdateRow(tab: SheetTabName) {
  const { token, spreadsheetId } = useSheetContext()
  const config = SHEET_TABS[tab]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ index, row }: { index: number; row: Record<string, string> }) =>
      updateRow(token, spreadsheetId, config.name, index, [...config.columns], row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet', spreadsheetId, tab] })
    },
  })
}

export function useDeleteRow(tab: SheetTabName, sheetId: number) {
  const { token, spreadsheetId } = useSheetContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (index: number) => deleteRow(token, spreadsheetId, sheetId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheet', spreadsheetId, tab] })
    },
  })
}
