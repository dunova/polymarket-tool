'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, StatCard, Badge, Button } from '@/components/ui';

// BTC Range Buckets (similar to original strategy)
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
    trades: Array<{
        date: string;
        range: string;
        entry: number;
        exit: number;
        pnl: number;
    }>;
}

export default function BTCStrategyPage() {
    const [currentPrice] = useState(104532);
    const [selectedRange, setSelectedRange] = useState<string | null>(null);
    const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);

    // Find current range
    const currentRange = BTC_RANGES.find(r => currentPrice >= r.min && currentPrice < r.max);

    const runBacktest = () => {
        // Simulate backtest results
        const results: BacktestResult = {
            wins: 12,
            losses: 5,
            winRate: 0.706,
            totalReturn: 47.3,
            trades: [
                { date: '2026-01-08', range: '$100K-$105K', entry: 0.22, exit: 0.85, pnl: 286 },
                { date: '2026-01-05', range: '$105K-$110K', entry: 0.28, exit: 0.12, pnl: -57 },
                { date: '2026-01-02', range: '$95K-$100K', entry: 0.15, exit: 0.92, pnl: 513 },
            ],
        };
        setBacktestResults(results);
    };

    return (
        <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        ₿ BTC Strategy Dashboard
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Price range prediction and strategy backtesting</p>
                </div>

                <Badge variant="success">Live</Badge>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="BTC Price"
                    value={`$${currentPrice.toLocaleString()}`}
                    trend="up"
                    change={2.4}
                    icon={<span className="text-xl">₿</span>}
                />
                <StatCard
                    label="Current Range"
                    value={currentRange?.label || '--'}
                    icon={<span className="text-xl">📊</span>}
                />
                <StatCard
                    label="Win Rate"
                    value={backtestResults ? `${(backtestResults.winRate * 100).toFixed(1)}%` : '--'}
                    icon={<span className="text-xl">🎯</span>}
                />
                <StatCard
                    label="Total Return"
                    value={backtestResults ? `+${backtestResults.totalReturn}%` : '--'}
                    trend="up"
                    icon={<span className="text-xl">💰</span>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Range Selection */}
                <Card>
                    <CardHeader
                        title="Price Ranges"
                        subtitle="Select a range to analyze"
                        action={<Button variant="primary" size="sm" onClick={runBacktest}>Run Backtest</Button>}
                    />
                    <CardContent>
                        <div className="space-y-3">
                            {BTC_RANGES.map((range) => {
                                const isCurrent = range.label === currentRange?.label;
                                const isSelected = range.label === selectedRange;

                                return (
                                    <button
                                        key={range.label}
                                        onClick={() => setSelectedRange(range.label)}
                                        className={`
                      w-full p-4 rounded-xl text-left transition-all cursor-pointer
                      ${isSelected ? 'bg-[var(--primary)] text-slate-900' : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'}
                    `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">{range.label}</span>
                                                {isCurrent && <Badge variant="success" size="sm">Current</Badge>}
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-mono text-lg ${isSelected ? 'text-slate-900' : 'text-[var(--primary)]'}`}>
                                                    {(range.yesPrice * 100).toFixed(1)}¢
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Backtest Results */}
                <Card>
                    <CardHeader title="Backtest Results" subtitle="Historical performance analysis" />
                    <CardContent>
                        {backtestResults ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-[var(--success-muted)]">
                                        <p className="text-sm text-[var(--text-muted)]">Wins</p>
                                        <p className="text-2xl font-bold text-[var(--success)]">{backtestResults.wins}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--danger-muted)]">
                                        <p className="text-sm text-[var(--text-muted)]">Losses</p>
                                        <p className="text-2xl font-bold text-[var(--danger)]">{backtestResults.losses}</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Range</th>
                                                <th>Entry</th>
                                                <th>Exit</th>
                                                <th>P&L</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {backtestResults.trades.map((trade, i) => (
                                                <tr key={i}>
                                                    <td>{trade.date}</td>
                                                    <td>{trade.range}</td>
                                                    <td>{(trade.entry * 100).toFixed(1)}¢</td>
                                                    <td>{(trade.exit * 100).toFixed(1)}¢</td>
                                                    <td className={trade.pnl > 0 ? 'price-up' : 'price-down'}>
                                                        {trade.pnl > 0 ? '+' : ''}{trade.pnl}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-[var(--text-muted)]">
                                <p className="text-4xl mb-4">📈</p>
                                <p>Click &quot;Run Backtest&quot; to analyze historical performance</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
