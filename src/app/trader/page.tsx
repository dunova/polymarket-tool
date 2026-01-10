'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, StatCard, Badge, Button } from '@/components/ui';

interface Trader {
    address: string;
    displayName: string;
    winRate: number;
    totalPnl: number;
    avgPosition: number;
    recentTrades: number;
    tags: string[];
}

const MOCK_TRADERS: Trader[] = [
    {
        address: '0x23cb...796c',
        displayName: 'Alpha Whale',
        winRate: 0.73,
        totalPnl: 125000,
        avgPosition: 5000,
        recentTrades: 24,
        tags: ['Whale', 'High WR'],
    },
    {
        address: '0x8f1a...2d4e',
        displayName: 'Sniper Pro',
        winRate: 0.68,
        totalPnl: 45000,
        avgPosition: 2500,
        recentTrades: 87,
        tags: ['High Volume'],
    },
    {
        address: '0xd9c2...1b8f',
        displayName: 'Smart Money',
        winRate: 0.81,
        totalPnl: 89000,
        avgPosition: 8000,
        recentTrades: 12,
        tags: ['Whale', 'Selective'],
    },
];

export default function TraderAnalyzerPage() {
    const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTraders = MOCK_TRADERS.filter(t =>
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        🔍 Trader Analyzer
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Analyze whale traders and copy their strategies</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search by address or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Tracked Traders"
                    value={MOCK_TRADERS.length}
                    icon={<span className="text-xl">👥</span>}
                />
                <StatCard
                    label="Avg Win Rate"
                    value="74%"
                    icon={<span className="text-xl">🎯</span>}
                />
                <StatCard
                    label="Total Volume"
                    value="$2.1M"
                    icon={<span className="text-xl">💰</span>}
                />
                <StatCard
                    label="Active Signals"
                    value="7"
                    icon={<span className="text-xl">📡</span>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trader List */}
                <Card className="lg:col-span-2">
                    <CardHeader title="Top Traders" subtitle="Ranked by performance" />
                    <CardContent>
                        <div className="space-y-3">
                            {filteredTraders.map((trader) => (
                                <button
                                    key={trader.address}
                                    onClick={() => setSelectedTrader(trader)}
                                    className={`
                    w-full p-4 rounded-xl text-left transition-all cursor-pointer
                    ${selectedTrader?.address === trader.address
                                            ? 'bg-[var(--primary)] text-slate-900'
                                            : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                                        }
                  `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{trader.displayName}</span>
                                                <span className={`text-xs font-mono ${selectedTrader?.address === trader.address ? 'text-slate-700' : 'text-[var(--text-muted)]'}`}>
                                                    {trader.address}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {trader.tags.map(tag => (
                                                    <Badge
                                                        key={tag}
                                                        variant={selectedTrader?.address === trader.address ? 'default' : 'purple'}
                                                        size="sm"
                                                    >
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${selectedTrader?.address === trader.address ? 'text-slate-900' : 'text-[var(--success)]'}`}>
                                                {(trader.winRate * 100).toFixed(0)}% WR
                                            </p>
                                            <p className={`text-sm ${selectedTrader?.address === trader.address ? 'text-slate-700' : 'text-[var(--text-muted)]'}`}>
                                                +${(trader.totalPnl / 1000).toFixed(0)}K P&L
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Trader Details */}
                <Card>
                    <CardHeader title="Trader Profile" subtitle={selectedTrader?.displayName || 'Select a trader'} />
                    <CardContent>
                        {selectedTrader ? (
                            <div className="space-y-6">
                                <div className="text-center p-6 rounded-xl bg-[var(--surface)]">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center text-2xl">
                                        🐋
                                    </div>
                                    <p className="text-lg font-semibold">{selectedTrader.displayName}</p>
                                    <p className="text-sm text-[var(--text-muted)] font-mono">{selectedTrader.address}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-[var(--surface)]">
                                        <p className="text-xs text-[var(--text-muted)]">Win Rate</p>
                                        <p className="text-lg font-bold text-[var(--success)]">{(selectedTrader.winRate * 100).toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[var(--surface)]">
                                        <p className="text-xs text-[var(--text-muted)]">Total P&L</p>
                                        <p className="text-lg font-bold text-[var(--primary)]">+${selectedTrader.totalPnl.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[var(--surface)]">
                                        <p className="text-xs text-[var(--text-muted)]">Avg Position</p>
                                        <p className="text-lg font-bold">${selectedTrader.avgPosition.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[var(--surface)]">
                                        <p className="text-xs text-[var(--text-muted)]">Recent Trades</p>
                                        <p className="text-lg font-bold">{selectedTrader.recentTrades}</p>
                                    </div>
                                </div>

                                <Button variant="primary" className="w-full">
                                    Copy This Trader
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                <p className="text-4xl mb-4">👈</p>
                                <p>Select a trader to view their profile</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
