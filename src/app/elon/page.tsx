'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardContent, StatCard, Badge, Button } from '@/components/ui';
import { discoverElonMarkets, getMarketData } from '@/lib/api';
import { getCSTDate, getMuskStatus, getTimeRemaining, formatPrice, formatPercent } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Tracking {
    id: string;
    slug: string;
    title: string;
    startTime: Date;
    endTime: Date;
    tweetCount?: number;
}

interface MarketData {
    label: string;
    minVal: number;
    maxVal: number;
    yesPrice: number;
    slug: string;
    assetId: string | null;
}

interface ScoredMarket extends MarketData {
    prob: number;
    raw?: number;
}

// Prediction rates (tweets per hour)
const RATES = {
    CONSERVATIVE: 8,
    NORMAL: 10.8,
    BURST: 15,
};

export default function ElonTerminalPage() {
    const [trackings, setTrackings] = useState<Tracking[]>([]);
    const [activeTracking, setActiveTracking] = useState<Tracking | null>(null);
    const [marketData, setMarketData] = useState<MarketData[]>([]);
    const [tweetCount, setTweetCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Initializing...');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Load market data
    const loadData = useCallback(async (tracking: Tracking) => {
        try {
            const data = await getMarketData(tracking.slug);
            setMarketData(data);
            // Use tweetCount from tracking or estimate
            setTweetCount(tracking.tweetCount || 0);
        } catch (error) {
            console.error('Failed to load market data:', error);
        }
    }, []);

    // WebSocket price update handler
    const handlePriceUpdate = useCallback((assetId: string, price: number) => {
        setMarketData(prev => prev.map(m =>
            m.assetId === assetId ? { ...m, yesPrice: price } : m
        ));
    }, []);

    // Get asset IDs for WebSocket subscription
    const assetIds = useMemo(() =>
        marketData.filter(m => m.assetId).map(m => m.assetId as string),
        [marketData]
    );

    // WebSocket for real-time updates
    useWebSocket({
        assetIds,
        onPriceUpdate: handlePriceUpdate,
        enabled: assetIds.length > 0,
    });

    // Initial load
    useEffect(() => {
        async function init() {
            try {
                setStatus('Discovering Markets...');
                const markets = await discoverElonMarkets();
                setTrackings(markets);

                if (markets.length > 0) {
                    setActiveTracking(markets[0]);
                    setStatus('Loading Data...');
                    await loadData(markets[0]);
                    setStatus('Ready (Live)');
                } else {
                    setStatus('No Markets Found');
                }
            } catch (error) {
                console.error('Init failed:', error);
                setStatus('Failed to Initialize');
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [loadData]);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Refresh data every 5 seconds (backup for WebSocket)
    useEffect(() => {
        if (!activeTracking) return;
        const timer = setInterval(() => loadData(activeTracking), 5000);
        return () => clearInterval(timer);
    }, [activeTracking, loadData]);

    // Calculate predictions
    const { cstHour } = getCSTDate();
    const muskStatus = getMuskStatus(cstHour);
    const timeLeft = activeTracking ? getTimeRemaining(activeTracking.endTime) : { hours: 0, formatted: '--' };

    // Effective active hours (accounting for sleep)
    const activeHours = Math.max(0, timeLeft.hours - (cstHour >= 18 || cstHour < 8 ? 8 : 0));

    const predictions = {
        conservative: tweetCount + Math.round(RATES.CONSERVATIVE * activeHours),
        normal: tweetCount + Math.round(RATES.NORMAL * activeHours),
        burst: tweetCount + Math.round(RATES.BURST * activeHours),
    };

    // Find predicted range
    const predictedRange = marketData.find(
        m => m.minVal <= predictions.normal && (m.maxVal === 9999 || m.maxVal >= predictions.normal)
    );

    // Calculate probabilities (Gaussian distribution)
    const stdDev = Math.max(15, activeHours * 5);
    const scoredMarkets: ScoredMarket[] = marketData.map(m => {
        if (m.maxVal < tweetCount) return { ...m, prob: 0 };
        const effMax = m.maxVal === 9999 ? m.minVal + 19 : m.maxVal;
        const mid = (m.minVal + effMax) / 2;
        const dist = Math.abs(predictions.normal - mid);
        const raw = Math.exp(-(dist * dist) / (2 * stdDev * stdDev));
        return { ...m, raw, prob: 0 };
    });

    const totalScore = scoredMarkets.reduce((sum, m) => sum + (m.raw || 0), 0);
    scoredMarkets.forEach(m => {
        if (totalScore > 0 && m.raw) m.prob = m.raw / totalScore;
    });

    const handleMarketChange = async (id: string) => {
        const tracking = trackings.find(t => t.id === id);
        if (tracking) {
            setActiveTracking(tracking);
            setLoading(true);
            await loadData(tracking);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        🐦 Elon Terminal
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Real-time tweet prediction engine</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        value={activeTracking?.id || ''}
                        onChange={(e) => handleMarketChange(e.target.value)}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        {trackings.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>

                    <Badge variant={status === 'Ready' ? 'success' : 'warning'}>
                        {status}
                    </Badge>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatCard
                    label="Tweet Count"
                    value={tweetCount}
                    icon={<span className="text-xl">🐦</span>}
                />
                <StatCard
                    label="Time Left"
                    value={timeLeft.formatted}
                    icon={<span className="text-xl">⏱️</span>}
                />
                <StatCard
                    label="Musk Status"
                    value={muskStatus.status}
                    icon={<span className="text-xl">{muskStatus.icon}</span>}
                />
                <StatCard
                    label="Active Hours"
                    value={`${activeHours.toFixed(1)}h`}
                    icon={<span className="text-xl">📈</span>}
                />
                <StatCard
                    label="CST Time"
                    value={currentTime.toLocaleTimeString('en-US', {
                        timeZone: 'America/Chicago',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    })}
                    icon={<span className="text-xl">🕐</span>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Prediction Panel */}
                <Card className="lg:col-span-1">
                    <CardHeader title="Prediction" subtitle="End-of-period forecast" />
                    <CardContent>
                        <div className="space-y-6">
                            <div className="text-center p-6 rounded-xl bg-[var(--surface)]">
                                <p className="text-sm text-[var(--text-muted)] mb-2">Predicted Total</p>
                                <p className="text-4xl font-bold text-[var(--primary)] font-mono">
                                    {predictions.normal}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                    Range: {predictedRange?.label || '--'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--text-muted)]">Conservative</span>
                                    <span className="font-mono text-[var(--info)]">{predictions.conservative}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--text-muted)]">Linear</span>
                                    <span className="font-mono text-[var(--warning)]">{predictions.normal}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--text-muted)]">Burst Mode</span>
                                    <span className="font-mono text-[var(--danger)]">{predictions.burst}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Market Table */}
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Market Odds"
                        subtitle="Live probabilities vs predictions"
                        action={
                            <Button variant="ghost" size="sm" onClick={() => activeTracking && loadData(activeTracking)}>
                                Refresh
                            </Button>
                        }
                    />
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Range</th>
                                        <th>Price</th>
                                        <th>Prob.</th>
                                        <th>Alpha</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scoredMarkets.filter(m => m.maxVal >= tweetCount - 10).map((m, i) => {
                                        const alpha = (m.prob * 100) - (m.yesPrice * 100);
                                        const isCurrent = tweetCount >= m.minVal && tweetCount <= m.maxVal;
                                        const isPredicted = m.label === predictedRange?.label;

                                        return (
                                            <tr key={i} className={isCurrent ? 'bg-[var(--success-muted)]' : ''}>
                                                <td className="flex items-center gap-2">
                                                    {m.label}
                                                    {isCurrent && <Badge variant="success" size="sm">Current</Badge>}
                                                    {isPredicted && <Badge variant="purple" size="sm">Predicted</Badge>}
                                                </td>
                                                <td>{formatPrice(m.yesPrice)}</td>
                                                <td>{formatPercent(m.prob)}</td>
                                                <td className={alpha > 5 ? 'price-up' : alpha < -5 ? 'price-down' : ''}>
                                                    {alpha > 0 ? '+' : ''}{alpha.toFixed(1)}%
                                                </td>
                                                <td>
                                                    <a
                                                        href={`https://polymarket.com/event/${m.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary py-1 px-3 text-xs"
                                                    >
                                                        Trade
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
