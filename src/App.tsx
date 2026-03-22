import { Routes, Route } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { LoginButton } from '@/features/auth'
import { ConnectSheet } from '@/features/sheets/ConnectSheet'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HoldingsPage } from '@/features/holdings/HoldingsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export default function App() {
  const accessToken = useStore((s) => s.accessToken)
  const spreadsheetId = useStore((s) => s.spreadsheetId)

  // Not logged in
  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">OpenBalance</h1>
          <p className="text-muted-foreground mb-6">
            Track your investments with Google Sheets as your database.
          </p>
          <LoginButton />
        </div>
      </div>
    )
  }

  // Logged in but no spreadsheet connected
  if (!spreadsheetId) {
    return <ConnectSheet />
  }

  // Full app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="holdings" element={<HoldingsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
