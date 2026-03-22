# OpenBalance — Agent Guide

## What is this project?

Open-source investment portfolio tracker. Users sign in with Google, pick a Google Sheets spreadsheet, and the app uses it as a database for all portfolio data. No backend — 100% client-side SPA hosted on GitHub Pages.

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Build | Vite | 8.x |
| Framework | React | 19.x |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (base-nova style, Radix) | via `npx shadcn@latest add <component>` |
| Icons | Lucide React | — |
| State | Zustand | 5.x |
| Data fetching | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | RHF 7.x, Zod 4.x |
| Charts | Recharts | 3.x |
| Routing | React Router (HashRouter) | 7.x |
| Auth | @react-oauth/google (implicit flow) | — |
| Data layer | Google Sheets API v4 (client-side) | — |
| Hosting | GitHub Pages (static export) | — |
| Deploy | GitHub Actions (auto on push to main) | — |
| Linting | ESLint 9 (flat config) + Prettier | — |

## Architecture

### Directory Structure

```
src/
  main.tsx                    # Entry point: Google OAuth provider, QueryClient, HashRouter
  App.tsx                     # Route definitions + auth/sheet connection gates
  index.css                   # Tailwind + shadcn theme variables

  components/
    Layout.tsx                # App shell: header, nav bar, <Outlet />
    ui/                       # shadcn/ui primitives (Button, Card, Table, Input, etc.)

  features/                   # Feature modules — each is self-contained
    auth/
      GoogleAuth.tsx          # LoginButton and UserMenu components
      index.ts                # Public exports
    sheets/
      api.ts                  # Raw Google Sheets API functions (read, append, update, delete)
      constants.ts            # Sheet tab names and column definitions
      hooks.ts                # TanStack Query hooks (useSheetData, useAppendRow, etc.)
      ConnectSheet.tsx         # Spreadsheet connection UI
      index.ts
    onboarding/
      LandingPage.tsx           # Marketing landing page (pre-auth)
      ConnectSheetPage.tsx      # Spreadsheet connection flow (post-auth)
      useGooglePicker.ts        # Google Picker API hook
      index.ts
    dashboard/
      DashboardPage.tsx
    holdings/
      HoldingsPage.tsx
    transactions/
      TransactionsPage.tsx
    goals/
      GoalsPage.tsx
    settings/
      SettingsPage.tsx

  lib/
    store.ts                  # Zustand store (auth state, sheet state, data, settings helpers)
    schemas.ts                # Zod schemas for all data types
    utils.ts                  # cn(), formatCurrency(), formatNumber(), formatDate(), toNumber()
```

### Key Patterns

**Feature-based modules**: Each feature in `src/features/` owns its pages, components, hooks, and types. Features import from `@/lib` and `@/components/ui` but not from each other (except `sheets` which is the shared data layer).

**Data flow**: Google Sheets API → TanStack Query hooks (`useSheetData`) → React components. Mutations use `useAppendRow`, `useUpdateRow`, `useDeleteRow` which auto-invalidate queries on success.

**State**: Zustand store holds auth token, connected spreadsheet info, and settings. Sheet data is managed by TanStack Query (not duplicated in Zustand).

**Auth gate**: `App.tsx` renders three states in order:
1. Not logged in → login screen
2. Logged in, no spreadsheet → `ConnectSheet`
3. Connected → full app with `Layout` + routes

## Google Sheets Structure

The app expects these tabs (auto-created on first connect):

| Tab | Columns |
|---|---|
| **Accounts** | Name, Type, Currency, Notes |
| **Holdings** | Account, Ticker, Qty, AvgPrice, Currency, Category, Notes |
| **Transactions** | Date, Type, Account, Ticker, Qty, Price, Currency, Total, Fee, Notes |
| **Goals** | Name, Target, Currency, Deadline, Category, Notes |
| **Snapshots** | Date, TotalValue, Currency, Notes |
| **Settings** | Key, Value |

Tab definitions live in `src/features/sheets/constants.ts`. Row 1 is always headers. Data starts at row 2.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check (tsc) + production build
npm run preview    # Preview production build locally
npm run lint       # ESLint
npm run format     # Prettier
```

## Conventions

- **Imports**: Use `@/` alias for `src/` (e.g., `import { cn } from '@/lib/utils'`)
- **Components**: Use shadcn/ui primitives from `@/components/ui`. Add new ones via `npx shadcn@latest add <name>`
- **Styling**: Tailwind utility classes. Use `cn()` for conditional classes. Never write raw CSS except in `index.css`
- **Types**: Zod schemas in `schemas.ts` are the source of truth for data shapes. Infer types with `z.infer<typeof schema>`
- **No `any`**: ESLint enforces `@typescript-eslint/no-explicit-any`. Use typed API responses
- **Routing**: Hash-based (`/#/holdings`) for GitHub Pages compatibility
- **Dates**: ISO format (YYYY-MM-DD) in sheet data, formatted for display via `formatDate()`
- **Currency**: User sets `baseCurrency` in Settings tab. FX rates stored as `fx_USD_EUR` keys
- **Feature files**: Pages are `*Page.tsx`, exported from feature directory. Hooks are `use*.ts`
- **Error handling**: API errors are caught and displayed in UI. Use `e instanceof Error ? e.message : 'fallback'` pattern

## Environment

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth 2.0 Client ID (set in `.env.local` locally, GitHub secret for deploy)
- `VITE_GOOGLE_API_KEY` — Google API Key for Picker API (set in `.env.local` locally, GitHub secret for deploy). Restricted to Picker API + app domain. Optional — paste-URL fallback works without it
- No backend — everything uses the user's OAuth token

## Deploy

Push to `main` triggers `.github/workflows/deploy.yml`:
1. `npm ci` → `npm run build` → uploads `dist/` to GitHub Pages
2. `VITE_GOOGLE_CLIENT_ID` injected from GitHub repo secret at build time
3. Live at `https://glebus.github.io/open-balance/`
4. `vite.config.ts` sets `base: '/open-balance/'` for correct asset paths

## Google Cloud Setup (for contributors)

To run locally, you need your own Google Cloud project:
1. Create project at console.cloud.google.com
2. Enable Google Sheets API + Google Drive API
3. Create OAuth 2.0 Client ID (Web app, origin: `http://localhost:5173`)
4. Set `VITE_GOOGLE_CLIENT_ID` in `.env.local`
