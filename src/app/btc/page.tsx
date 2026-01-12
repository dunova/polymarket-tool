'use client';

import { useState } from 'react';
import { Card, CardHeader, StatCard, Badge, Button, DataTable } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

const BTC_RANGES = [
    { label: '$90K - $95K', min: 90000, max: 95000, yesPrice: 0.08 },
    { label: '$95K - $100K', min: 95000, max: 100000, yesPrice: 0.15 },
    { label: '$100K - $105K', min: 100000, max: 105000, yesPrice: 0.22 },
    { label: '$105K - $110K', min: 105000, max: 110000, yesPrice: 0.28 },
    { label: '$110K - $115K', min: 110000, max: 115000, yesPrice: 0.18 },
    { label: '$115K+', min: 115000, max: 999999, yesPrice: 0.09 },
];

interface BacktestResult {
    wins: number;
    losses: number;
    winRate: number;
    totalReturn: number;
    trades: Array<{ date: string; range: string; entry: number; exit: number; pnl: number }>;
}

export default function BTCStrategyPage() {
    const { t } = useTranslation();
    const [currentPrice] = useState(104532);
    const [selectedRange, setSelectedRange] = useState<string | null>(null);
    const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
    const [loading, setLoading] = useState(false);

    const currentRange = BTC_RANGES.find(r => currentPrice >= r.min && currentPrice < r.max);

    const runBacktest = () => {
        setLoading(true);
        setTimeout(() => {
            setBacktestResults({
                wins: 12,
                losses: 5,
                winRate: 0.706,
                totalReturn: 47.3,
                trades: [
                    { date: '2026-01-08', range: '$100K-$105K', entry: 0.22, exit: 0.85, pnl: 286 },
                    { date: '2026-01-05', range: '$105K-$110K', entry: 0.28, exit: 0.12, pnl: -57 },
                    { date: '2026-01-02', range: '$95K-$100K', entry: 0.15, exit: 0.92, pnl: 513 },
                ],
            });
            setLoading(false);
        }, 500);
    };

    const columns = [
        { key: 'date', header: 'Date', render: (t: BacktestResult['trades'][0]) => <span className="font-mono text-xs">{t.date}</span> },
        { key: 'range', header: 'Range', render: (t: BacktestResult['trades'][0]) => <span>{t.range}</span> },
        { key: 'entry', header: 'Entry', align: 'right' as const, render: (t: BacktestResult['trades'][0]) => <span className="font-mono">{(t.entry * 100).toFixed(0)}¢</span> },
        { key: 'exit', header: 'Exit', align: 'right' as const, render: (t: BacktestResult['trades'][0]) => <span className="font-mono">{(t.exit * 100).toFixed(0)}¢</span> },
        {
            key: 'pnl',
            header: 'P/L',
            align: 'right' as const,
            render: (t: BacktestResult['trades'][0]) => (
                <span className={`font-mono font-semibold ${t.pnl > 0 ? 'price-up' : 'price-down'}`}>
                    {t.pnl > 0 ? '+' : ''}{t.pnl}%
                </span>
            )
        },
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl mb-1">BTC Strategy</h1>
                    <p className="text-sm text-[var(--text-muted)]">Range prediction backtesting</p>
                </div>
                <Badge variant="warning">Demo Mode</Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="BTC Price" value={`$${currentPrice.toLocaleString()}`} trend="up" change={2.4} />
                <StatCard label="Current Range" value={currentRange?.label || '--'} />
                <StatCard label="Win Rate" value={backtestResults ? `${(backtestResults.winRate * 100).toFixed(1)}%` : '--'} />
                <StatCard label="Total Return" value={backtestResults ? `+${backtestResults.totalReturn}%` : '--'} trend="up" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Range Selection */}
                <Card variant="elevated">
                    <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <CardHeader title="Price Ranges" className="mb-0" />
                        <Button variant="primary" size="sm" onClick={runBacktest} loading={loading}>
                            Run Backtest
                        </Button>
                    </div>
                    <div className="p-4 space-y-2">
                        {BTC_RANGES.map((range) => {
                            const isCurrent = range.label === currentRange?.label;
                            const isSelected = range.label === selectedRange;
                            return (
                                <button
                                    key={range.label}
                                    onClick={() => setSelectedRange(range.label)}
                                    className={`
                                        w-full p-3 rounded text-left transition-all cursor-pointer border flex items-center justify-between
                                        ${isSelected
                                            ? 'bg-[var(--primary-muted)] border-[var(--primary)]'
                                            : 'bg-[var(--bg-base)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${isSelected ? 'text-[var(--primary)]' : ''}`}>
                                            {range.label}
                                        </span>
                                        {isCurrent && <Badge variant="success">Current</Badge>}
                                    </div>
                                    <span className="font-mono text-sm">
                                        {(range.yesPrice * 100).toFixed(0)}¢
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Backtest Results */}
                <Card variant="elevated">
                    <CardHeader title="Backtest Results" className="p-4 border-b border-[var(--border-subtle)]" />
                    {backtestResults ? (
                        <div>
                            <div className="grid grid-cols-2 gap-3 p-4 border-b border-[var(--border-subtle)]">
                                <div className="p-3 rounded bg-[var(--success-muted)] text-center">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Wins</p>
                                    <p className="text-2xl font-mono font-semibold text-[var(--success)]">{backtestResults.wins}</p>
                                </div>
                                <div className="p-3 rounded bg-[var(--danger-muted)] text-center">
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Losses</p>
                                    <p className="text-2xl font-mono font-semibold text-[var(--danger)]">{backtestResults.losses}</p>
                                </div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={backtestResults.trades}
                                keyExtractor={(_, i) => i}
                            />
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <p className="text-[var(--text-muted)] text-sm">Select a range and run backtest</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
