'use client';

import { useState } from 'react';
import { Card, CardHeader, StatCard, Badge, Button, DataTable } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface Trader {
    [key: string]: unknown;
    address: string;
    displayName: string;
    winRate: number;
    totalPnl: number;
    avgPosition: number;
    recentTrades: number;
    tags: string[];
}

const MOCK_TRADERS: Trader[] = [
    { address: '0x23cb...796c', displayName: 'Alpha Whale', winRate: 0.73, totalPnl: 125000, avgPosition: 5000, recentTrades: 24, tags: ['Whale', 'High WR'] },
    { address: '0x8f1a...2d4e', displayName: 'Sniper Pro', winRate: 0.68, totalPnl: 45000, avgPosition: 2500, recentTrades: 87, tags: ['High Volume'] },
    { address: '0xd9c2...1b8f', displayName: 'Smart Money', winRate: 0.81, totalPnl: 89000, avgPosition: 8000, recentTrades: 12, tags: ['Whale', 'Selective'] },
];

export default function TraderAnalyzerPage() {
    const { t } = useTranslation();
    const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTraders = MOCK_TRADERS.filter(t =>
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        {
            key: 'displayName',
            header: 'Trader',
            render: (t: Trader) => (
                <div>
                    <p className="font-medium">{t.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{t.address}</p>
                </div>
            )
        },
        {
            key: 'tags',
            header: 'Tags',
            render: (t: Trader) => (
                <div className="flex gap-1">
                    {t.tags.map(tag => <Badge key={tag} variant="accent">{tag}</Badge>)}
                </div>
            )
        },
        {
            key: 'winRate',
            header: 'Win Rate',
            align: 'right' as const,
            render: (t: Trader) => <span className="font-mono price-up">{(t.winRate * 100).toFixed(0)}%</span>
        },
        {
            key: 'totalPnl',
            header: 'P/L',
            align: 'right' as const,
            render: (t: Trader) => <span className="font-mono price-up">+${(t.totalPnl / 1000).toFixed(0)}K</span>
        },
        {
            key: 'avgPosition',
            header: 'Avg Size',
            align: 'right' as const,
            render: (t: Trader) => <span className="font-mono">${t.avgPosition.toLocaleString()}</span>
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl mb-1">Trader Analyzer</h1>
                    <p className="text-sm text-[var(--text-muted)]">Whale tracking and copy trading</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-64"
                    />
                    <Badge variant="warning">Demo Mode</Badge>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="Tracked Wallets" value={MOCK_TRADERS.length.toString()} />
                <StatCard label="Avg Win Rate" value="74.2%" />
                <StatCard label="Total P/L" value="+$259K" trend="up" />
                <StatCard label="Active" value={MOCK_TRADERS.length.toString()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Trader Table */}
                <div className="lg:col-span-2">
                    <DataTable
                        columns={columns}
                        data={filteredTraders}
                        keyExtractor={(t) => t.address}
                        onRowClick={(t) => setSelectedTrader(t)}
                    />
                </div>

                {/* Trader Details */}
                <Card variant="elevated">
                    <CardHeader title="Trader Profile" subtitle={selectedTrader?.displayName || 'Select a trader'} />
                    {selectedTrader ? (
                        <div className="p-4 space-y-4">
                            <div className="p-4 rounded bg-[var(--bg-base)] text-center">
                                <p className="text-2xl font-mono font-semibold">{selectedTrader.displayName}</p>
                                <p className="text-xs text-[var(--text-muted)] font-mono mt-1">{selectedTrader.address}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded bg-[var(--bg-base)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                                    <p className="text-lg font-mono font-semibold price-up">{(selectedTrader.winRate * 100).toFixed(1)}%</p>
                                </div>
                                <div className="p-3 rounded bg-[var(--bg-base)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Total P/L</p>
                                    <p className="text-lg font-mono font-semibold price-up">${(selectedTrader.totalPnl / 1000).toFixed(0)}K</p>
                                </div>
                                <div className="p-3 rounded bg-[var(--bg-base)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Avg Size</p>
                                    <p className="text-lg font-mono font-semibold">${selectedTrader.avgPosition.toLocaleString()}</p>
                                </div>
                                <div className="p-3 rounded bg-[var(--bg-base)]">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Trades</p>
                                    <p className="text-lg font-mono font-semibold">{selectedTrader.recentTrades}</p>
                                </div>
                            </div>
                            <Button variant="primary" className="w-full">
                                Copy Trade
                            </Button>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-[var(--text-muted)] text-sm">Click a row to view details</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
