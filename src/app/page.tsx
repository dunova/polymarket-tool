import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui';

const tools = [
  {
    href: '/elon',
    title: 'Elon Terminal',
    description: 'Real-time tweet prediction with probability modeling and sleep pattern analysis.',
    icon: '🐦',
    gradient: 'from-blue-500 to-cyan-500',
    stats: { label: 'Markets', value: 'Live' },
  },
  {
    href: '/btc',
    title: 'BTC Strategy',
    description: 'Bitcoin price range predictions with market-based strategy backtesting.',
    icon: '₿',
    gradient: 'from-amber-500 to-orange-500',
    stats: { label: 'Win Rate', value: '67%' },
  },
  {
    href: '/trader',
    title: 'Trader Analyzer',
    description: 'Analyze whale traders, copy their positions, and track performance.',
    icon: '🔍',
    gradient: 'from-purple-500 to-pink-500',
    stats: { label: 'Traders', value: '1.2K' },
  },
  {
    href: '/monitor',
    title: 'Market Monitor',
    description: 'Live market monitoring with price alerts and volume tracking.',
    icon: '📊',
    gradient: 'from-green-500 to-emerald-500',
    stats: { label: 'Status', value: 'Active' },
  },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] text-sm text-[var(--text-secondary)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          Real-time market data
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[var(--text-primary)] via-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
          Polymarket Tools
        </h1>

        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10">
          Professional trading dashboard for prediction markets. Real-time analytics,
          alpha discovery, and automated strategies.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/elon"
            className="btn btn-primary px-8 py-3 text-base"
          >
            Launch Terminal
          </Link>
          <a
            href="https://github.com/dunova/polymarket-tool"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary px-8 py-3 text-base"
          >
            View Source
          </a>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16">
        <h2 className="text-2xl font-semibold text-center mb-12">Trading Tools</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href}>
              <Card variant="interactive" className="h-full group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-2xl`}>
                      {tool.icon}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)] uppercase">{tool.stats.label}</p>
                      <p className="text-lg font-semibold text-[var(--primary)]">{tool.stats.value}</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-2 group-hover:text-[var(--primary)] transition-colors">
                    {tool.title}
                  </h3>

                  <p className="text-[var(--text-secondary)] text-sm">
                    {tool.description}
                  </p>

                  <div className="mt-4 flex items-center text-[var(--primary)] text-sm font-medium">
                    Open Tool
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <Card className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="stat-value text-3xl">$2.1B</p>
              <p className="stat-label mt-1">Trading Volume</p>
            </div>
            <div className="text-center">
              <p className="stat-value text-3xl">1,200+</p>
              <p className="stat-label mt-1">Active Markets</p>
            </div>
            <div className="text-center">
              <p className="stat-value text-3xl">&lt;50ms</p>
              <p className="stat-label mt-1">Data Latency</p>
            </div>
            <div className="text-center">
              <p className="stat-value text-3xl">24/7</p>
              <p className="stat-label mt-1">Live Updates</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
