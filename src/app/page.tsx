'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardHeader, StatCard, Badge } from '@/components/ui';
import { fetchGamma } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface TrendingMarket {
  id: string;
  title: string;
  slug: string;
  volume24hr: number;
  liquidity: number;
  bestAsk?: number;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [trending, setTrending] = useState<TrendingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: 0,
    activeMarkets: 0,
    liquidity: 0,
  });

  const tools = [
    { href: '/elon', label: t.home.tools.elon.label, desc: t.home.tools.elon.desc },
    { href: '/btc', label: t.home.tools.btc.label, desc: t.home.tools.btc.desc },
    { href: '/trader', label: t.home.tools.traders.label, desc: t.home.tools.traders.desc },
    { href: '/monitor', label: t.home.tools.markets.label, desc: t.home.tools.markets.desc },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const events = await fetchGamma('/events?limit=10&active=true&order=volume24hr&ascending=false');

        const markets = events.slice(0, 5).map((e: {
          id: string;
          title: string;
          slug: string;
          volume24hr: number;
          liquidity: number;
        }) => ({
          id: e.id,
          title: e.title,
          slug: e.slug,
          volume24hr: e.volume24hr || 0,
          liquidity: e.liquidity || 0,
        }));

        setTrending(markets);
        setStats({
          totalVolume: events.reduce((sum: number, e: { volume24hr?: number }) => sum + (e.volume24hr || 0), 0),
          activeMarkets: events.length,
          liquidity: events.reduce((sum: number, e: { liquidity?: number }) => sum + (e.liquidity || 0), 0),
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl mb-1">{t.home.title}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t.home.subtitle}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label={t.home.volume24h}
          value={formatNumber(stats.totalVolume)}
          loading={loading}
        />
        <StatCard
          label={t.home.activeMarkets}
          value={stats.activeMarkets.toString()}
          loading={loading}
        />
        <StatCard
          label={t.home.totalLiquidity}
          value={formatNumber(stats.liquidity)}
          loading={loading}
        />
        <StatCard
          label={t.home.status}
          value={t.common.online}
          icon={<span className="status-dot online" />}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Access */}
        <Card variant="elevated" className="lg:col-span-1">
          <CardHeader title={t.home.quickAccess} />
          <div className="space-y-2">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center justify-between p-3 rounded bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)]">
                    {tool.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{tool.desc}</p>
                </div>
                <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </Card>

        {/* Trending Markets */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader
            title={t.home.trendingMarkets}
            subtitle={t.home.topByVolume}
            action={
              <Link href="/monitor" className="text-xs text-[var(--primary)] hover:underline">
                {t.common.viewAll}
              </Link>
            }
          />

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((market, i) => (
                <Link
                  key={market.id}
                  href={`https://polymarket.com/event/${market.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <span className="text-xs font-mono text-[var(--text-muted)] w-5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--primary)]">
                      {market.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="default">
                      {formatNumber(market.volume24hr)} vol
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
