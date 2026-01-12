'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, StatCard, Badge, Button, DataTable } from '@/components/ui';
import { discoverElonMarkets, getMarketData } from '@/lib/api';
import { getCSTDate, getMuskStatus, getTimeRemaining, formatPrice, formatPercent } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/lib/i18n';

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
    [key: string]: unknown;
    prob: number;
    raw?: number;
}

const RATES = { CONSERVATIVE: 8, NORMAL: 10.8, BURST: 15 };

export default function ElonTerminalPage() {
    const { t } = useTranslation();
    const [trackings, setTrackings] = useState<Tracking[]>([]);
    const [activeTracking, setActiveTracking] = useState<Tracking | null>(null);
    const [marketData, setMarketData] = useState<MarketData[]>([]);
    const [tweetCount, setTweetCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [currentTime, setCurrentTime] = useState(new Date());

    const loadData = useCallback(async (tracking: Tracking) => {
        try {
            const data = await getMarketData(tracking.slug);
            setMarketData(data);
            setTweetCount(tracking.tweetCount || 0);
        } catch (error) {
            console.error('Failed to load market data:', error);
        }
    }, []);

    const handlePriceUpdate = useCallback((assetId: string, price: number) => {
        setMarketData(prev => prev.map(m =>
            m.assetId === assetId ? { ...m, yesPrice: price } : m
        ));
    }, []);

    const assetIds = useMemo(() =>
        marketData.filter(m => m.assetId).map(m => m.assetId as string),
        [marketData]
    );

    useWebSocket({ assetIds, onPriceUpdate: handlePriceUpdate, enabled: assetIds.length > 0 });

    useEffect(() => {
        async function init() {
            try {
                const markets = await discoverElonMarkets();
                setTrackings(markets);
                if (markets.length > 0) {
                    setActiveTracking(markets[0]);
                    await loadData(markets[0]);
                    setStatus('ready');
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Init failed:', error);
                setStatus('error');
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [loadData]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!activeTracking) return;
        const timer = setInterval(() => loadData(activeTracking), 5000);
        return () => clearInterval(timer);
    }, [activeTracking, loadData]);

    const { cstHour } = getCSTDate();
    const muskStatus = getMuskStatus(cstHour);
    const timeLeft = activeTracking ? getTimeRemaining(activeTracking.endTime) : { hours: 0, formatted: '--' };
    const activeHours = Math.max(0, timeLeft.hours - (cstHour >= 18 || cstHour < 8 ? 8 : 0));

    const predictions = {
        conservative: tweetCount + Math.round(RATES.CONSERVATIVE * activeHours),
        normal: tweetCount + Math.round(RATES.NORMAL * activeHours),
        burst: tweetCount + Math.round(RATES.BURST * activeHours),
    };

    const predictedRange = marketData.find(
        m => m.minVal <= predictions.normal && (m.maxVal === 9999 || m.maxVal >= predictions.normal)
    );

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

    const columns = [
        {
            key: 'label',
            header: 'Range',
            render: (m: ScoredMarket) => {
                const isCurrent = tweetCount >= m.minVal && tweetCount <= m.maxVal;
                const isPredicted = m.label === predictedRange?.label;
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-mono">{m.label}</span>
                        {isCurrent && <Badge variant="success">Now</Badge>}
                        {isPredicted && <Badge variant="accent">Target</Badge>}
                    </div>
                );
            }
        },
        {
            key: 'yesPrice',
            header: 'Price',
            align: 'right' as const,
            render: (m: ScoredMarket) => (
                <span className="font-mono">{formatPrice(m.yesPrice)}</span>
            )
        },
        {
            key: 'prob',
            header: 'Model',
            align: 'right' as const,
            render: (m: ScoredMarket) => (
                <span className="font-mono">{formatPercent(m.prob)}</span>
            )
        },
        {
            key: 'alpha',
            header: 'Edge',
            align: 'right' as const,
            render: (m: ScoredMarket) => {
                const alpha = (m.prob * 100) - (m.yesPrice * 100);
                return (
                    <span className={`font-mono ${alpha > 5 ? 'price-up' : alpha < -5 ? 'price-down' : ''}`}>
                        {alpha > 0 ? '+' : ''}{alpha.toFixed(1)}%
                    </span>
                );
            }
        },
        {
            key: 'action',
            header: '',
            align: 'right' as const,
            render: (m: ScoredMarket) => (
                <a
                    href={`https://polymarket.com/event/${m.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost text-[10px]"
                >
                    Trade
                </a>
            )
        }
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl mb-1">Elon Terminal</h1>
                    <p className="text-sm text-[var(--text-muted)]">Tweet Volume Forecasting</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={activeTracking?.id || ''}
                        onChange={(e) => handleMarketChange(e.target.value)}
                        className="input text-sm"
                    >
                        {trackings.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    <Badge variant={status === 'ready' ? 'success' : status === 'error' ? 'danger' : 'warning'}>
                        {status === 'ready' ? 'Live' : status === 'error' ? 'Error' : 'Loading'}
                    </Badge>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <StatCard label="Current" value={tweetCount} loading={loading} />
                <StatCard label="Remaining" value={timeLeft.formatted} loading={loading} />
                <StatCard label="Musk Phase" value={muskStatus.status} loading={loading} />
                <StatCard label="Active Hours" value={`${activeHours.toFixed(1)}h`} loading={loading} />
                <StatCard
                    label="CST Time"
                    value={currentTime.toLocaleTimeString('en-US', {
                        timeZone: 'America/Chicago',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    })}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Predictions */}
                <Card variant="elevated" className="lg:col-span-1">
                    <CardHeader title="Forecast" />
                    <div className="space-y-4">
                        <div className="p-4 rounded bg-[var(--bg-base)] text-center">
                            <p className="text-xs text-[var(--text-muted)] mb-1">Predicted Total</p>
                            <p className="text-3xl font-mono font-semibold">{predictions.normal}</p>
                            <Badge variant="accent" className="mt-2">{predictedRange?.label || '--'}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Floor</span>
                                <span className="font-mono">{predictions.conservative}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Expected</span>
                                <span className="font-mono text-[var(--primary)]">{predictions.normal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Ceiling</span>
                                <span className="font-mono text-[var(--warning)]">{predictions.burst}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Market Table */}
                <div className="lg:col-span-3">
                    <Card variant="elevated" noPadding>
                        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <CardHeader title="Markets" subtitle="Price vs Model Probability" className="mb-0" />
                            <Button variant="ghost" size="sm" onClick={() => activeTracking && loadData(activeTracking)}>
                                Refresh
                            </Button>
                        </div>
                        <DataTable
                            columns={columns}
                            data={scoredMarkets.filter(m => m.maxVal >= tweetCount - 10)}
                            keyExtractor={(m, i) => i}
                            loading={loading}
                            emptyMessage="No markets found"
                        />
                    </Card>
                </div>
            </div>
        </div>
    );
}
