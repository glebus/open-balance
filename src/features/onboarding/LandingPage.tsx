import { useLogin } from '@/features/auth'
import { LogIn, Sheet, BarChart3, Shield, Globe, Github } from 'lucide-react'

const steps = [
  { icon: LogIn, title: 'Sign in', description: 'Use your Google account to get started' },
  { icon: Sheet, title: 'Pick a spreadsheet', description: 'Connect an existing sheet or create a new one' },
  { icon: BarChart3, title: 'Track your portfolio', description: 'View holdings, transactions, and goals in one place' },
]

const benefits = [
  {
    icon: Shield,
    title: 'Own your data',
    description: 'Your portfolio lives in your Google Sheet. No third-party databases, no lock-in.',
  },
  {
    icon: Globe,
    title: 'Multi-broker support',
    description: 'Track holdings across Interactive Brokers, Revolut, DeFi, and more.',
  },
  {
    icon: Github,
    title: 'Open source & free',
    description: 'No subscriptions, no ads. Inspect the code and self-host if you want.',
  },
]

export function LandingPage() {
  const login = useLogin()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight mb-4">OpenBalance</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track your investment portfolio with Google Sheets as your database.
            <br />
            No backend. No fees. Your data stays yours.
          </p>
          <button
            onClick={() => login()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <LogIn size={18} />
            Get Started with Google
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon size={24} />
                </div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Step {i + 1}</div>
                <h3 className="text-lg font-medium mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-10">Why OpenBalance?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="rounded-xl border border-border bg-card p-6">
                <benefit.icon size={24} className="text-primary mb-3" />
                <h3 className="text-lg font-medium mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-muted/30 px-6 py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Ready to take control of your portfolio?</p>
          <button
            onClick={() => login()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <LogIn size={18} />
            Get Started with Google
          </button>
        </div>
      </section>
    </div>
  )
}
