import { Routes, Route } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { LandingPage } from '@/features/onboarding/LandingPage'
import { ConnectSheetPage } from '@/features/onboarding/ConnectSheetPage'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HoldingsPage } from '@/features/holdings/HoldingsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { PricesPage } from '@/features/prices/PricesPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export default function App() {
  const accessToken = useStore((s) => s.accessToken)
  const spreadsheetId = useStore((s) => s.spreadsheetId)

  // Not logged in
  if (!accessToken) {
    return <LandingPage />
  }

  // Logged in but no spreadsheet connected
  if (!spreadsheetId) {
    return <ConnectSheetPage />
  }

  // Full app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="holdings" element={<HoldingsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="prices" element={<PricesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
