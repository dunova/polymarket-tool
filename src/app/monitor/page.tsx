'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, StatCard, Badge } from '@/components/ui';

interface MarketItem {
    id: string;
    question: string;
    volume: number;
    liquidity: number;
    yesPrice: number;
    change24h: number;
    active: boolean;
}

const MOCK_MARKETS: MarketItem[] = [
    {
        id: '1',
        question: 'Will BTC reach $120K by end of Q1 2026?',
        volume: 2450000,
        liquidity: 890000,
        yesPrice: 0.42,
        change24h: 5.2,
        active: true,
    },
    {
        id: '2',
        question: 'Will the Fed cut rates in January?',
        volume: 1890000,
        liquidity: 450000,
        yesPrice: 0.28,
        change24h: -3.1,
        active: true,
    },
    {
        id: '3',
        question: 'Will ETH flip BTC market cap by 2027?',
        volume: 980000,
        liquidity: 320000,
        yesPrice: 0.12,
        change24h: 1.8,
        active: true,
    },
    {
        id: '4',
        question: 'Will Apple announce AR glasses at WWDC?',
        volume: 720000,
        liquidity: 210000,
        yesPrice: 0.65,
        change24h: 8.4,
        active: true,
    },
];

export default function MarketMonitorPage() {
    const [markets, setMarkets] = useState(MOCK_MARKETS);
    const [filter, setFilter] = useState<'all' | 'trending' | 'new'>('all');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Simulate live updates
    useEffect(() => {
        const timer = setInterval(() => {
            setMarkets(prev => prev.map(m => ({
                ...m,
                yesPrice: m.yesPrice + (Math.random() - 0.5) * 0.02,
                change24h: m.change24h + (Math.random() - 0.5) * 0.5,
            })));
            setLastUpdate(new Date());
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
    const totalLiquidity = markets.reduce((sum, m) => sum + m.liquidity, 0);

    return (
        <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        📊 Market Monitor
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Live market tracking and price alerts</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
                        {(['all', 'trending', 'new'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`
                  px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize
                  ${filter === f ? 'bg-[var(--primary)] text-slate-900' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
                `}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <Badge variant="success">
                        Updated {lastUpdate.toLocaleTimeString()}
                    </Badge>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total Volume"
                    value={`$${(totalVolume / 1_000_000).toFixed(1)}M`}
                    trend="up"
                    change={12.4}
                    icon={<span className="text-xl">💵</span>}
                />
                <StatCard
                    label="Total Liquidity"
                    value={`$${(totalLiquidity / 1_000_000).toFixed(1)}M`}
                    icon={<span className="text-xl">💧</span>}
                />
                <StatCard
                    label="Active Markets"
                    value={markets.filter(m => m.active).length}
                    icon={<span className="text-xl">📈</span>}
                />
                <StatCard
                    label="Avg Price Change"
                    value={`${(markets.reduce((sum, m) => sum + m.change24h, 0) / markets.length).toFixed(1)}%`}
                    trend="up"
                    icon={<span className="text-xl">📊</span>}
                />
            </div>

            {/* Markets Table */}
            <Card>
                <CardHeader
                    title="Active Markets"
                    subtitle={`${markets.length} markets tracked`}
                />
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Market</th>
                                    <th>Price</th>
                                    <th>24h Change</th>
                                    <th>Volume</th>
                                    <th>Liquidity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {markets.map((market) => (
                                    <tr key={market.id}>
                                        <td className="max-w-md">
                                            <p className="font-medium text-[var(--text-primary)] truncate">
                                                {market.question}
                                            </p>
                                        </td>
                                        <td className="font-mono text-lg">
                                            {(market.yesPrice * 100).toFixed(1)}¢
                                        </td>
                                        <td className={market.change24h > 0 ? 'price-up' : 'price-down'}>
                                            {market.change24h > 0 ? '+' : ''}{market.change24h.toFixed(1)}%
                                        </td>
                                        <td>${(market.volume / 1000).toFixed(0)}K</td>
                                        <td>${(market.liquidity / 1000).toFixed(0)}K</td>
                                        <td>
                                            <Badge variant={market.active ? 'success' : 'default'}>
                                                {market.active ? 'Active' : 'Closed'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
