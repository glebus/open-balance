import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { UserMenu } from '@/features/auth'
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Target,
  Landmark,
  DollarSign,
  Settings,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/holdings', label: 'Holdings', icon: Briefcase },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/prices', label: 'Prices', icon: DollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  const { spreadsheetTitle, clearSheet } = useStore()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">OpenBalance</h1>
            {spreadsheetTitle && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">&mdash;</span>
                <span className="hidden sm:inline">{spreadsheetTitle}</span>
                <button
                  onClick={clearSheet}
                  className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Disconnect spreadsheet"
                >
                  <Unlink size={14} />
                </button>
              </div>
            )}
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Nav */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              <item.icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
