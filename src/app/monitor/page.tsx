'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, StatCard, Badge, DataTable } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface MarketItem {
    [key: string]: unknown;
    id: string;
    question: string;
    volume: number;
    liquidity: number;
    yesPrice: number;
    change24h: number;
    active: boolean;
}

const MOCK_MARKETS: MarketItem[] = [
    { id: '1', question: 'Will BTC reach $120K by end of Q1 2026?', volume: 2450000, liquidity: 890000, yesPrice: 0.42, change24h: 5.2, active: true },
    { id: '2', question: 'Will the Fed cut rates in January?', volume: 1890000, liquidity: 450000, yesPrice: 0.28, change24h: -3.1, active: true },
    { id: '3', question: 'Will ETH flip BTC market cap by 2027?', volume: 980000, liquidity: 320000, yesPrice: 0.12, change24h: 1.8, active: true },
    { id: '4', question: 'Will Apple announce AR glasses at WWDC?', volume: 720000, liquidity: 210000, yesPrice: 0.65, change24h: 8.4, active: true },
];

export default function MarketMonitorPage() {
    const { t } = useTranslation();
    const [markets, setMarkets] = useState(MOCK_MARKETS);
    const [filter, setFilter] = useState<'all' | 'trending' | 'new'>('all');
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setMarkets(prev => prev.map(m => ({
                ...m,
                yesPrice: Math.max(0.01, Math.min(0.99, m.yesPrice + (Math.random() - 0.5) * 0.02)),
                change24h: m.change24h + (Math.random() - 0.5) * 0.5,
            })));
            setLastUpdate(new Date());
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
    const totalLiquidity = markets.reduce((sum, m) => sum + m.liquidity, 0);

    const columns = [
        {
            key: 'question',
            header: 'Market',
            render: (m: MarketItem) => (
                <p className="text-sm text-[var(--text-primary)] truncate max-w-md">{m.question}</p>
            )
        },
        {
            key: 'yesPrice',
            header: 'Price',
            align: 'right' as const,
            render: (m: MarketItem) => <span className="font-mono">{(m.yesPrice * 100).toFixed(1)}¢</span>
        },
        {
            key: 'change24h',
            header: '24h',
            align: 'right' as const,
            render: (m: MarketItem) => (
                <span className={`font-mono ${m.change24h > 0 ? 'price-up' : 'price-down'}`}>
                    {m.change24h > 0 ? '+' : ''}{m.change24h.toFixed(1)}%
                </span>
            )
        },
        {
            key: 'volume',
            header: 'Volume',
            align: 'right' as const,
            render: (m: MarketItem) => <span className="font-mono">${(m.volume / 1000).toFixed(0)}K</span>
        },
        {
            key: 'liquidity',
            header: 'Liquidity',
            align: 'right' as const,
            render: (m: MarketItem) => <span className="font-mono">${(m.liquidity / 1000).toFixed(0)}K</span>
        },
        {
            key: 'active',
            header: 'Status',
            align: 'center' as const,
            render: (m: MarketItem) => <Badge variant={m.active ? 'success' : 'default'}>{m.active ? 'Live' : 'Closed'}</Badge>
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl mb-1">Market Monitor</h1>
                    <p className="text-sm text-[var(--text-muted)]">Live market tracking</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="tabs">
                        {(['all', 'trending', 'new'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`tab capitalize ${filter === f ? 'active' : ''}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <Badge variant="success">
                        {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard label="Total Volume" value={`$${(totalVolume / 1_000_000).toFixed(1)}M`} trend="up" change={12.4} />
                <StatCard label="Total Liquidity" value={`$${(totalLiquidity / 1_000_000).toFixed(1)}M`} />
                <StatCard label="Active Markets" value={markets.filter(m => m.active).length.toString()} />
                <StatCard label="Avg Change" value={`${(markets.reduce((sum, m) => sum + m.change24h, 0) / markets.length).toFixed(1)}%`} trend="up" />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={markets}
                keyExtractor={(m) => m.id}
                className="w-full"
            />
        </div>
    );
}
