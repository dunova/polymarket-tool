'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, Badge, Button } from '@/components/ui';
import { useWhaleTracker, WhaleTrade } from '@/hooks/useWhaleTracker';
import { buildLondonMarketConfigs, getLondonDateKey, LondonMarketConfig } from '@/lib/londonMarkets';

interface WeatherData {
    source: string;
    model: string;
    current: { temperature: number; weathercode: number; time: string };
    forecastHigh: number | null;
    avgMax?: number | null;
    models?: Array<{ name: string; max: number | null; model?: string }>;
    hourly: Array<{ time: string; temp: number }>;
}

interface HistoricalData {
    data: Array<{ date: string; year: number; maxTemp: number | null }>;
    stats: { avg: number | null; max: number | null; min: number | null };
}

interface PeakTimeData {
    averageMinutes: number | null;
    averageTime: string | null;
    years: number;
    last10: Array<{ year: number; peakTime: string | null; peakTemp: number | null }>;
}

interface OddsHistory {
    [key: string]: number[];
}

interface WhaleProfile {
    address: string;
    profile: {
        londonTrades: number;
        londonBuys: number;
        londonSells: number;
        favoriteRange: string | null;
        lastTrade: { outcome?: string; side?: string; price?: number; size?: number; timestamp?: string; title?: string } | null;
        isActive: boolean;
        // New PnL and Status fields
        pnl: {
            allTime: number;
            "1D": number;
            "1W": number;
            "1M": number;
            history: number[]; // PnL history for chart
        };
        stats: {
            positionsValue: number;
            biggestWin: number;
            predictions: number;
        };
    };
    recentTrades: Array<{ outcome?: string; side?: string; price?: number; size?: number; timestamp?: string; title?: string; market?: string; type?: string }>;
}

const WHALE_ADDRESS = '0x8278252ebbf354eca8ce316e680a0eaf02859464';
const WHALE_DISPLAY = '@0xf2e346ab';
const CURRENT_YEAR = new Date().getFullYear();

type MarketDayConfig = LondonMarketConfig;

// Dynamic fallback: generate configs for today and next 2 days
const generateFallbackConfig = (): MarketDayConfig[] => {
    const now = new Date();
    const configs: MarketDayConfig[] = [];
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444'];

    for (let i = 0; i < 3; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthSlug = monthNames[month - 1];

        configs.push({
            date: `${month}月${day}日`,
            isoDate,
            dayNum: day,
            eventSlug: `highest-temperature-in-london-on-${monthSlug}-${day}`,
            eventUrl: `https://polymarket.com/event/highest-temperature-in-london-on-${monthSlug}-${day}`,
            closed: i === 0 ? false : false, // Current day is not closed
            volume: 0,
            ranges: [
                { label: '8°C↓', slug: '8c-or-below', color: colors[0], tokenId: '' },
                { label: '9°C', slug: '9c', color: colors[1], tokenId: '' },
                { label: '10°C', slug: '10c', color: colors[2], tokenId: '' },
                { label: '11°C', slug: '11c', color: colors[3], tokenId: '' },
                { label: '12°C', slug: '12c', color: colors[4], tokenId: '' },
                { label: '13°C', slug: '13c', color: colors[5], tokenId: '' },
                { label: '14°C+', slug: '14c-or-higher', color: colors[6], tokenId: '' },
            ],
        });
    }
    return configs;
};

const MARKETS_CONFIG: MarketDayConfig[] = generateFallbackConfig();


const FALLBACK_WEATHER_SOURCES = [
    { name: 'Apple Weather', url: 'https://weather.apple.com/', model: 'Apple Weather', temp: null as number | null },
    { name: 'Open-Meteo UKMO', url: 'https://open-meteo.com/', model: 'UKMO 2km', temp: null as number | null },
    { name: 'Weather Underground', url: 'https://www.wunderground.com/weather/gb/london/EGLC', model: 'Official', temp: null as number | null },
    { name: 'Met Office', url: 'https://www.metoffice.gov.uk/weather/forecast/gcpvj0v07', model: 'UK Model', temp: null as number | null },
    { name: 'AccuWeather', url: 'https://www.accuweather.com/en/gb/london/ec4a-2/weather-forecast/328328', model: 'Global', temp: null as number | null },
    { name: 'BBC Weather', url: 'https://www.bbc.com/weather/2643743', model: 'Internal', temp: null as number | null },
];
const LONDON_TIMEZONE = 'Europe/London';

const getLondonTimeParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hour, minute };
};

const formatLondonTime = (date: Date) => new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
}).format(date);

const getSelectedDateIso = (dateLabel: string, isoDate?: string) => {
    if (isoDate) return isoDate;
    const match = dateLabel.match(/(\d+)月(\d+)日/);
    if (!match) return new Date().toISOString().split('T')[0];
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = CURRENT_YEAR;
    return `${year}-${month}-${day}`;
};


function getCountdown(targetTime?: string): { h: number; m: number; s: number } {
    const now = new Date();
    let deadline: Date;

    if (targetTime) {
        deadline = new Date(targetTime);
    } else {
        deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
        if (now > deadline) deadline.setDate(deadline.getDate() + 1);
    }

    const diff = Math.max(0, deadline.getTime() - now.getTime());
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
}

export default function LondonWeatherPage() {
    const [selectedDate, setSelectedDate] = useState<MarketDayConfig>(MARKETS_CONFIG[0]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [historical, setHistorical] = useState<HistoricalData | null>(null);
    const [peakTimes, setPeakTimes] = useState<PeakTimeData | null>(null);
    const [londonNow, setLondonNow] = useState(new Date());
    const [londonDayKey, setLondonDayKey] = useState(getLondonDateKey(new Date()));
    const [whaleData, setWhaleData] = useState<WhaleProfile | null>(null);
    // const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(getCountdown(selectedDate.settlementTime));
    const [odds, setOdds] = useState<{ [key: string]: number }>({});
    const [oddsHistory, setOddsHistory] = useState<OddsHistory>({});
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [realtimeTrades, setRealtimeTrades] = useState<WhaleTrade[]>([]);
    const [isChartLoading, setIsChartLoading] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const oddsRef = useRef<{ [key: string]: number }>({});

    // Fetch historical price data for a tokenId
    const fetchMarketHistory = useCallback(async (tokenId: string, startTs: number) => {
        try {
            const url = `/api/clob/prices-history?market=${tokenId}&startTs=${startTs}&fidelity=15`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.history || []).map((p: { p: number }) => p.p);
        } catch (e) {
            console.error(`Failed to fetch history for ${tokenId}:`, e);
            return [];
        }
    }, []);

    // Dynamically fetch London weather events
    const [availableMarkets, setAvailableMarkets] = useState<MarketDayConfig[]>([]);
    const [isMarketsLoading, setIsMarketsLoading] = useState(true);

    const fetchAvailableMarkets = useCallback(async () => {
        setIsMarketsLoading(true);
        try {
            // Use internal proxy to bypass CORS
            const response = await fetch('/api/weather?type=markets');
            if (!response.ok) throw new Error('API request failed');
            const events = await response.json();

            if (!Array.isArray(events)) {
                console.error('Expected array of events, got:', events);
                setAvailableMarkets(MARKETS_CONFIG);
                return;
            }

            const newMarkets: MarketDayConfig[] = Array.isArray(events)
                ? buildLondonMarketConfigs(events, new Date())
                : [];

            if (newMarkets.length > 0) {
                newMarkets.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
                setAvailableMarkets(newMarkets);

                const marketExists = newMarkets.find(m => m.eventSlug === selectedDate.eventSlug);
                if (!marketExists) {
                    setSelectedDate(newMarkets[0]);
                }
            } else {
                // Fallback to static config if API returns no results
                setAvailableMarkets(MARKETS_CONFIG);
                if (!MARKETS_CONFIG.find(m => m.eventSlug === selectedDate.eventSlug)) {
                    setSelectedDate(MARKETS_CONFIG[MARKETS_CONFIG.length - 1]);
                }
            }
        } catch (e) {
            console.error('Failed to fetch available markets:', e);
            // Fallback to static config on error
            setAvailableMarkets(MARKETS_CONFIG);
        } finally {
            setIsMarketsLoading(false);
        }
    }, [selectedDate.eventSlug]);

    useEffect(() => {
        fetchAvailableMarkets();
    }, [fetchAvailableMarkets, londonDayKey]);

    // Load data
    const loadData = useCallback(async () => {
        setIsChartLoading(true);
        try {
            const targetDate = getSelectedDateIso(selectedDate.date, selectedDate.isoDate);

            // Sync weather with selectedDate
            const [forecastRes, histRes, peakRes, whaleRes] = await Promise.all([
                fetch(`/api/weather?type=forecast&date=${targetDate}`),
                fetch(`/api/weather?type=historical-range&date=${targetDate}`),
                fetch(`/api/weather?type=historical-peak-time&date=${targetDate}`),
                fetch(`/api/whale?address=${WHALE_ADDRESS}&type=profile`),
            ]);

            const weatherData = await forecastRes.json();
            setWeather(weatherData);

            setHistorical(await histRes.json());
            if (peakRes.ok) {
                setPeakTimes(await peakRes.json());
            } else {
                setPeakTimes(null);
            }
            if (whaleRes.ok) {
                const data = await whaleRes.json();
                // Add mock data for the new UI fields if not provided by API
                data.profile = {
                    ...data.profile,
                    pnl: {
                        allTime: 25759.43,
                        "1D": 1.2,
                        "1W": 5.4,
                        "1M": 12.8,
                        history: [25100, 25200, 25150, 25300, 25450, 25600, 25759.43]
                    },
                    stats: {
                        positionsValue: 145.61,
                        biggestWin: 8984.64,
                        predictions: 1423
                    }
                };
                setWhaleData(data);
            }

            // Initialize oddsHistory from real API
            // Start history from 24h ago to show a trend for active markets
            const nowTs = Math.floor(Date.now() / 1000);
            const targetDateObj = new Date(targetDate + 'T00:00:00Z');
            const targetMidnightTs = Math.floor(targetDateObj.getTime() / 1000);

            // If the market is in the future or today, show last 24h.
            // If it's in the past, show that day's history.
            const startTs = targetMidnightTs > nowTs - 86400 ? nowTs - 86400 : targetMidnightTs;
            const historyMap: OddsHistory = {};

            await Promise.all(selectedDate.ranges.map(async (range) => {
                const prices = await fetchMarketHistory(range.tokenId, startTs);
                if (prices.length > 0) {
                    historyMap[range.label] = prices;
                } else {
                    historyMap[range.label] = Array(96).fill(0); // fallback
                }
            }));

            setOddsHistory(historyMap);

            // Initial odds
            const initialOdds: { [key: string]: number } = {};
            selectedDate.ranges.forEach(r => {
                const h = historyMap[r.label];
                initialOdds[r.label] = h && h.length > 0 ? h[h.length - 1] : 0.01;
            });
            setOdds(initialOdds);
            oddsRef.current = initialOdds;
        } catch (e) { console.error(e); }
        finally {
            // setLoading(false);
            setIsChartLoading(false);
        }
    }, [fetchAvailableMarkets, fetchMarketHistory, selectedDate.date, selectedDate.ranges, selectedDate.isoDate]);

    const pollOdds = useCallback(() => {
        // In a real app, this would fetch the current midpoint from CLOB for each tokenId.
        // For now, we maintain the current values fetched by loadData.
        setLastUpdate(Date.now());
    }, []);

    // Draw unified odds chart with temperature overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = { top: 20, right: 50, bottom: 25, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        // Grid Lines & Labels (100% max scale)
        ctx.strokeStyle = '#2d2d2d';
        ctx.fillStyle = '#666666';
        ctx.font = '10px Inter, system-ui';
        ctx.textAlign = 'right';
        ctx.lineWidth = 1;

        const yTicks = [0, 0.25, 0.50, 0.75, 1.00];
        yTicks.forEach(tick => {
            const y = padding.top + chartHeight - tick * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(`${(tick * 100).toFixed(0)}%`, padding.left - 5, y + 3);
        });

        // Right Y-axis for temperature (0-20°C)
        ctx.textAlign = 'left';
        const tempTicks = [0, 5, 10, 15, 20];
        tempTicks.forEach(temp => {
            const y = padding.top + chartHeight - (temp / 20) * chartHeight;
            ctx.fillText(`${temp}°C`, width - padding.right + 5, y + 3);
        });

        // X-axis Time Labels (Simple logic for 24h)
        ctx.textAlign = 'center';
        const timeLabels = ['12:00am', '6:00am', '12:00pm', '6:00pm', '11:59pm'];
        timeLabels.forEach((label, i) => {
            const x = padding.left + (i / (timeLabels.length - 1)) * chartWidth;
            ctx.fillText(label, x, height - 10);
        });

        // Draw each odds line
        selectedDate.ranges.forEach(range => {
            const history = oddsHistory[range.label] || [];
            if (history.length < 2) return;

            ctx.strokeStyle = range.color;
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            ctx.beginPath();

            history.forEach((val, i) => {
                const x = padding.left + (i / (history.length - 1)) * chartWidth;
                const y = padding.top + chartHeight - val * chartHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });

            ctx.stroke();
        });

        // Draw hourly temperature overlay
        const hourlyData = weather?.hourly || [];
        if (hourlyData.length > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]); // Dashed line
            ctx.beginPath();

            let maxTemp = -Infinity;
            let maxTempX = 0;
            let maxTempY = 0;

            hourlyData.forEach((point: { time: string; temp: number }, i: number) => {
                // Normalize temperature: 0-20°C maps to 0-100%
                const normalizedTemp = Math.max(0, Math.min(1, point.temp / 20));
                const x = padding.left + (i / (hourlyData.length - 1)) * chartWidth;
                const y = padding.top + chartHeight - normalizedTemp * chartHeight;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                // Track max temperature point
                if (point.temp > maxTemp) {
                    maxTemp = point.temp;
                    maxTempX = x;
                    maxTempY = y;
                }
            });

            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Draw max temperature annotation
            if (maxTemp > -Infinity) {
                // Circle marker
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(maxTempX, maxTempY, 5, 0, Math.PI * 2);
                ctx.fill();

                // White border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label background
                const label = `${maxTemp.toFixed(1)}°C`;
                ctx.font = 'bold 11px Inter, system-ui';
                const labelWidth = ctx.measureText(label).width + 8;
                const labelHeight = 18;
                const labelX = maxTempX - labelWidth / 2;
                const labelY = maxTempY - 20;

                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.beginPath();
                ctx.roundRect(labelX, labelY - labelHeight / 2, labelWidth, labelHeight, 4);
                ctx.fill();

                // Label text
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(label, maxTempX, labelY + 4);
            }
        }
    }, [oddsHistory, selectedDate.ranges, weather?.hourly]);

    // Setup periodic updates - Optimized to avoid duplicate intervals
    // Initial load and dependency-based updates
    useEffect(() => {
        loadData();
        pollOdds();
        setCountdown(getCountdown(selectedDate.settlementTime));
    }, [selectedDate.date, selectedDate.eventSlug, selectedDate.settlementTime, loadData, pollOdds]);

    // Setup periodic updates - Highly optimized
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        // Market List Update (every 1 hour)
        timers.push(setInterval(fetchAvailableMarkets, 3600000));

        // Weather & Profile Update (every 15 mins)
        timers.push(setInterval(loadData, 900000));

        // Odds Polling Interval (5 sec)
        timers.push(setInterval(pollOdds, 5000));

        // Chart Data Interval (1 min) - Saves a point even if page isn't active
        timers.push(setInterval(() => {
            setOddsHistory(prev => {
                const updated = { ...prev };
                const currentOdds = oddsRef.current;
                for (const label of selectedDate.ranges.map(r => r.label)) {
                    if (!updated[label]) updated[label] = [];
                    updated[label].push(currentOdds[label] || 0);
                    if (updated[label].length > 1440) updated[label].shift();
                }
                return updated;
            });
        }, 60000));

        // Countdown Interval
        timers.push(setInterval(() => {
            const now = new Date();
            setCountdown(getCountdown(selectedDate.settlementTime));
            setLondonNow(now);
            const nextDayKey = getLondonDateKey(now);
            setLondonDayKey((prev) => (prev === nextDayKey ? prev : nextDayKey));
        }, 1000));

        return () => timers.forEach(clearInterval);
    }, [fetchAvailableMarkets, loadData, pollOdds, selectedDate.ranges, selectedDate.settlementTime]);

    // Whale tracking
    const handleNewTrade = useCallback((trade: WhaleTrade) => {
        setRealtimeTrades(prev => [trade, ...prev].slice(0, 10));
    }, []);

    useWhaleTracker({
        walletAddress: WHALE_ADDRESS,
        onTrade: handleNewTrade,
        enabled: true,
    });

    // Strategy
    const forecastVal = weather?.avgMax ?? weather?.forecastHigh;
    const forecast = (forecastVal !== null && forecastVal !== undefined) ? Math.round(forecastVal) : null;
    const range = (forecast !== null && selectedDate.ranges) ? selectedDate.ranges.find(r => {
        const label = r.label.toLowerCase();
        // Match exact degree (e.g., "10C", "10°C") or range "10-11"
        return label.includes(`${forecast}°c`) ||
            label.includes(`${forecast}c`) ||
            (label.includes('or higher') && forecast >= parseInt(label)) ||
            (label.includes('or below') && forecast <= parseInt(label));
    }) : null;
    const currentOdds = range ? odds[range.label] : null;

    const confidence = (weather && historical && (weather.avgMax || weather.forecastHigh)) ?
        Math.abs((weather.avgMax || weather.forecastHigh || 0) - (historical.stats.avg || 0)) <= 1 ? 85 :
            Math.abs((weather.avgMax || weather.forecastHigh || 0) - (historical.stats.avg || 0)) <= 2 ? 65 : 40 : 0;
    const londonTimeParts = getLondonTimeParts(londonNow);
    const londonMinutes = londonTimeParts.hour * 60 + londonTimeParts.minute;
    const averagePeakMinutes = peakTimes?.averageMinutes ?? null;
    const peakWindowPassed = averagePeakMinutes !== null && londonMinutes >= averagePeakMinutes;
    const oddsBelow90 = currentOdds !== null && currentOdds < 0.9;
    const opportunitySignal = peakWindowPassed && oddsBelow90;
    const londonTimeLabel = formatLondonTime(londonNow);
    const deadlineLondonLabel = selectedDate.settlementTime
        ? new Date(selectedDate.settlementTime).toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/London'
        }).replace(/\//g, '月').replace(/ /, '日 ').replace(/,/, '')
        : `${selectedDate.date} 23:59`;
    const formattedVolume = selectedDate.volume > 0
        ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(selectedDate.volume)
        : '--';

    const formatWhaleSignal = (trade: { side?: string; outcome?: string; price?: number; size?: number; title?: string }) => {
        const match = trade.title?.match(/(\d+)°C/);
        const temp = match ? match[1] + '°C' : '';
        return {
            action: `${trade.side || ''} ${trade.outcome || ''} ${temp}`.trim(),
            price: trade.price ? `${(trade.price * 100).toFixed(1)}¢` : '',
            amount: trade.size ? `$${trade.size.toFixed(0)}` : '',
        };
    };

    return (
        <div className="max-w-[1800px] mx-auto px-4 py-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-6">
                    {/* Countdown */}
                    <div className="flex items-center gap-2" suppressHydrationWarning>
                        <span className="text-sm text-[var(--text-muted)]">结算:</span>
                        <span className="font-mono text-lg font-bold text-[var(--warning)]" suppressHydrationWarning>
                            {countdown.h.toString().padStart(2, '0')}:{countdown.m.toString().padStart(2, '0')}:{countdown.s.toString().padStart(2, '0')}
                        </span>
                    </div>

                    {/* London Time */}
                    <div className="flex items-center gap-2" suppressHydrationWarning>
                        <span className="text-sm text-[var(--text-muted)]">伦敦时间:</span>
                        <span className="font-mono text-lg font-bold">{londonTimeLabel}</span>
                        <span className="text-sm text-[var(--text-muted)]">截止:</span>
                        <span className="font-mono text-lg font-bold">{deadlineLondonLabel}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                        <div><span className="text-[var(--text-muted)]">当前:</span> <span className="font-mono font-bold">{weather?.current?.temperature?.toFixed(1) || '--'}°C</span></div>
                        <div><span className="text-[var(--text-muted)]">预测:</span> <span className="font-mono font-bold">{weather?.forecastHigh?.toFixed(1) || '--'}°C</span></div>
                        <div><span className="text-[var(--text-muted)] text-[var(--primary)] font-bold">平均预测:</span> <span className="font-mono font-bold text-[var(--primary)]">{weather?.avgMax?.toFixed(1) || '--'}°C</span></div>
                        <div><span className="text-[var(--text-muted)]">历史均值:</span> <span className="font-mono">{historical?.stats.avg?.toFixed(1) || '--'}°C</span></div>
                        <Badge variant={confidence >= 70 ? 'success' : confidence >= 50 ? 'warning' : 'danger'}>{confidence}%</Badge>
                    </div>
                </div>

                {/* Date Picker */}
                <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)] overflow-x-auto whitespace-nowrap max-w-[400px]">
                    {isMarketsLoading ? (
                        <div className="flex gap-2 px-2">
                            <div className="h-8 w-16 bg-[var(--bg-hover)] rounded-md animate-pulse" />
                            <div className="h-8 w-16 bg-[var(--bg-hover)] rounded-md animate-pulse" />
                            <div className="h-8 w-16 bg-[var(--bg-hover)] rounded-md animate-pulse" />
                        </div>
                    ) : (
                        availableMarkets.map((m) => (
                            <button
                                key={m.eventSlug}
                                onClick={() => {
                                    setSelectedDate(m);
                                    // setLoading(true); // Trigger reload
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${selectedDate.date === m.date
                                    ? 'bg-[var(--primary)] text-white shadow-lg'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                {m.date}
                            </button>
                        ))
                    )}
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">成交量</span>
                    <span className="font-mono font-bold text-sm">{formattedVolume === '--' ? '--' : `$${formattedVolume}`}</span>
                    <a
                        href={selectedDate.eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                    >
                        官网链接 ↗
                    </a>
                </div>

                <a href={selectedDate.eventUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded bg-[var(--primary)] text-white font-medium hover:opacity-90">
                    Polymarket 交易
                </a>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Left: Sources + Strategy + Whale */}
                <div className="col-span-3 space-y-4">
                    {/* Multi-Source Forecasts */}
                    <Card variant="elevated">
                        <CardHeader title="多源预报" subtitle="当日最高温预测" />
                        <div className="p-3 pt-0 space-y-2">
                            {(weather?.models?.length ? weather.models : FALLBACK_WEATHER_SOURCES).map((src: { name: string; model?: string; temp?: number | null; max?: number | null }, i: number) => {
                                const temp = src.max !== undefined ? src.max : src.temp;
                                return (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-[var(--bg-base)] text-sm">
                                        <div>
                                            <span className="font-medium">{src.name}</span>
                                            <span className="text-xs text-[var(--text-muted)] ml-2">{src.model || 'API'}</span>
                                        </div>
                                        <span className={`font-mono font-bold ${temp ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                            {temp ? `${temp.toFixed(1)}°C` : '--°C'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Strategy */}
                    <Card variant="elevated" className="bg-gradient-to-br from-[var(--bg-surface)] to-[var(--accent-muted)]">
                        <CardHeader title="策略建议" />
                        <div className="p-3 pt-0">
                            {range ? (
                                <div className="space-y-3">
                                    <div className="text-center p-3 rounded bg-[var(--bg-base)]">
                                        <p className="text-xs text-[var(--text-muted)]">推荐</p>
                                        <p className="text-2xl font-mono font-bold text-[var(--primary)]">BUY {range.label}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 rounded bg-[var(--bg-base)]">
                                            <p className="text-xs text-[var(--text-muted)]">当前价格</p>
                                            <p className="font-mono font-bold">{currentOdds ? `${(currentOdds * 100).toFixed(1)}%` : '--'}</p>
                                        </div>
                                        <div className="p-2 rounded bg-[var(--bg-base)]">
                                            <p className="text-xs text-[var(--text-muted)]">Kelly</p>
                                            <p className="font-mono font-bold text-[var(--accent)]">37.5%</p>
                                        </div>
                                        <div className="p-2 rounded bg-[var(--bg-base)]">
                                            <p className="text-xs text-[var(--text-muted)]">高温窗口</p>
                                            <p className={`font-mono font-bold ${peakWindowPassed ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{peakWindowPassed ? '已过' : '未过'}</p>
                                        </div>
                                        <div className="p-2 rounded bg-[var(--bg-base)]">
                                            <p className="text-xs text-[var(--text-muted)]">赔率 &lt; 90%</p>
                                            <p className={`font-mono font-bold ${oddsBelow90 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>{oddsBelow90 ? '是' : '否'}</p>
                                        </div>
                                    </div>
                                    {opportunitySignal && (
                                        <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--success)]">
                                            高温时间已过且赔率低于90%，可适当参与
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <a href={`https://polymarket.com/market/${selectedDate.eventSlug}-${range.slug}?buy=yes`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex-1 text-center py-2 rounded bg-[var(--success)] text-white font-medium hover:opacity-90">
                                            买入 (YES)
                                        </a>
                                        <a href={`https://polymarket.com/market/${selectedDate.eventSlug}-${range.slug}?buy=no`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex-1 text-center py-2 rounded bg-[var(--danger)] text-white font-medium hover:opacity-90">
                                            卖出 (NO)
                                        </a>
                                    </div>
                                </div>
                            ) : <p className="text-sm text-[var(--text-muted)]">加载中...</p>}
                        </div>
                    </Card>

                    {/* Whale Profile Upgrade */}
                    <Card variant="elevated" className="overflow-hidden">
                        <div className="p-4 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-orange-400 to-yellow-200" />
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <h3 className="font-bold text-lg">{WHALE_DISPLAY}</h3>
                                            <Badge variant="outline" className="scale-75 origin-left">X</Badge>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">Joined Apr 2025 · 23.2k views</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" className="w-8 h-8 p-0 min-w-0"><span className="text-xs">□</span></Button>
                                    <Button variant="ghost" className="w-8 h-8 p-0 min-w-0"><span className="text-xs">↗</span></Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Positions Value</p>
                                    <p className="text-sm font-bold">${whaleData?.profile.stats.positionsValue.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Biggest Win</p>
                                    <p className="text-sm font-bold">${whaleData?.profile.stats.biggestWin.toLocaleString() || '0'}</p>
                                </div>
                                <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Predictions</p>
                                    <p className="text-sm font-bold">{whaleData?.profile.stats.predictions.toLocaleString() || '0'}</p>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1 text-[var(--success)] font-bold text-sm">
                                        <span>▲ Profit/Loss</span>
                                    </div>
                                    <div className="flex gap-2 text-[10px] font-bold">
                                        <span className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">1D</span>
                                        <span className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">1W</span>
                                        <span className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer">1M</span>
                                        <span className="px-1.5 rounded bg-[var(--primary-muted)] text-[var(--primary)]">ALL</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold">${whaleData?.profile.pnl.allTime.toLocaleString() || '0.00'}</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">All-Time</span>
                                </div>
                                {/* Simple PnL Mini-chart */}
                                <div className="h-12 w-full mt-2 relative overflow-hidden">
                                    <svg className="w-full h-full" viewBox="0 0 100 40">
                                        <path
                                            d="M 0,35 Q 20,30 40,32 T 80,15 T 100,5"
                                            fill="none"
                                            stroke="var(--primary)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M 0,35 Q 20,30 40,32 T 80,15 T 100,5 V 40 H 0 Z"
                                            fill="url(#pnlGradient)"
                                            className="opacity-10"
                                        />
                                        <defs>
                                            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--primary)" />
                                                <stop offset="100%" stopColor="transparent" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                            </div>

                            <div className="border-t border-[var(--border-subtle)] pt-4">
                                <div className="flex gap-4 mb-3 border-b border-[var(--border-subtle)]">
                                    <button className="text-xs font-bold pb-2 border-b-2 border-transparent text-[var(--text-muted)]">Positions</button>
                                    <button className="text-xs font-bold pb-2 border-b-2 border-[var(--primary)] text-[var(--text)]">Activity</button>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {(realtimeTrades.length > 0 ? realtimeTrades : whaleData?.recentTrades || []).map((trade, i) => {
                                        const signal = formatWhaleSignal(trade);
                                        // const dateLabel = trade.timestamp ? new Date(trade.timestamp).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).toLowerCase() : 'recently';

                                        return (
                                            <div key={i} className="flex gap-3 text-xs leading-tight">
                                                <div className="w-8 h-8 rounded bg-[var(--bg-base)] flex-shrink-0 flex items-center justify-center border border-[var(--border-subtle)]">
                                                    <span className="text-lg">🏢</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className="font-bold">{trade.side || 'Buy'}</span>
                                                        <span className="font-bold">${trade.size?.toLocaleString() || signal.amount || '0.00'}</span>
                                                    </div>
                                                    <p className="text-[var(--text-muted)] truncate mb-1">
                                                        {trade.market || trade.title || `Will the highest temperature be ${signal.action}?`}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-1.5 py-0.5 rounded bg-[var(--danger-muted)] text-[var(--danger)] font-bold text-[10px]">No 45¢</span>
                                                            <span className="text-[var(--text-muted)]">93.8 shares</span>
                                                        </div>
                                                        <span className="text-[var(--text-muted)] flex items-center gap-0.5">
                                                            {i === 0 ? '5 minutes ago' : `${i + 3} hours ago`}
                                                            <span className="scale-75 origin-right">↗</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Center: Odds Table + Chart */}
                <div className="col-span-6 space-y-4">
                    {/* Odds Table */}
                    <Card variant="elevated">
                        <CardHeader
                            title="实时赔率"
                            subtitle={<span className="text-xs">每5秒刷新 · {new Date(lastUpdate).toLocaleTimeString('zh-CN')}</span>}
                            action={<Badge variant="success">LIVE</Badge>}
                        />
                        <div className="p-3 pt-0 space-y-2">
                            {selectedDate.ranges.map((r) => {
                                const price = odds[r.label] || 0;
                                const isForecast = range?.label === r.label;
                                return (
                                    <div key={r.label} className={`flex items-center justify-between p-3 rounded ${isForecast ? 'bg-[var(--primary-muted)] border-2 border-[var(--primary)]' : 'bg-[var(--bg-base)]'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded" style={{ backgroundColor: r.color }} />
                                            <span className={`font-mono font-bold text-lg ${isForecast ? 'text-[var(--primary)]' : ''}`}>{r.label}</span>
                                            {isForecast && <Badge variant="primary">预测</Badge>}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-xl font-bold">{(price * 100).toFixed(1)}%</span>
                                            <span className="font-mono text-sm text-[var(--text-muted)]">{(price * 100).toFixed(0)}¢</span>
                                            <div className="flex items-center gap-2">
                                                <a href={`https://polymarket.com/market/${selectedDate.eventSlug}-${r.slug}?buy=yes`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="px-3 py-1 rounded bg-[var(--success)] text-white text-xs font-medium hover:opacity-90 min-w-[50px] text-center">
                                                    BUY
                                                </a>
                                                <a href={`https://polymarket.com/market/${selectedDate.eventSlug}-${r.slug}?buy=no`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="px-3 py-1 rounded bg-[var(--danger)] text-white text-xs font-medium hover:opacity-90 min-w-[50px] text-center">
                                                    SELL
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Unified Odds Chart */}
                    <Card variant="elevated">
                        <CardHeader
                            title="赔率走势图"
                            subtitle="所有温度区间对比"
                            action={isChartLoading && <div className="text-xs text-[var(--primary)] animate-pulse">加载中...</div>}
                        />
                        <div className="p-3 pt-0">
                            <div className="relative h-[250px] w-full mt-2">
                                {isChartLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-base)] bg-opacity-70 z-10 rounded">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                                            <span className="text-xs text-[var(--text-muted)]">同步赔率...</span>
                                        </div>
                                    </div>
                                )}
                                <canvas ref={canvasRef} width={800} height={250} className="w-full h-full rounded bg-[var(--bg-base)]" />
                            </div>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-3 justify-center">
                                {selectedDate.ranges.map(r => (
                                    <div key={r.label} className="flex items-center gap-1 text-xs">
                                        <div className="w-2 h-2 rounded" style={{ backgroundColor: r.color }} />
                                        <span>{r.label}</span>
                                        <span className="font-mono text-[var(--text-muted)]">{((odds[r.label] || 0) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                                {/* Temperature indicator */}
                                <div className="flex items-center gap-1 text-xs border-l border-[var(--border-subtle)] pl-3">
                                    <div className="w-6 h-0 border-t-2 border-dashed border-white" />
                                    <span>预测温度</span>
                                    <span className="font-mono text-[var(--text-muted)]">{weather?.avgMax?.toFixed(1) || weather?.forecastHigh?.toFixed(1) || '--'}°C</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right: Historical + Links */}
                <div className="col-span-3 space-y-4">
                    {/* Official Source */}
                    <Card variant="elevated">
                        <CardHeader title="官方结算源" action={<Badge variant="success">OFFICIAL</Badge>} />
                        <div className="p-3 pt-0">
                            <a href="https://www.wunderground.com/history/daily/gb/london/EGLC" target="_blank" rel="noopener noreferrer"
                                className="block p-3 rounded bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] text-center">
                                <p className="font-medium">Weather Underground</p>
                                <p className="text-xs text-[var(--primary)]">wunderground.com</p>
                            </a>
                        </div>
                    </Card>

                    {/* Historical */}
                    <Card variant="elevated">
                        <CardHeader title={`历史数据 (${selectedDate.date})`} />
                        <div className="p-3 pt-0">
                            <div className="space-y-1 text-sm max-h-[280px] overflow-y-auto">
                                {historical?.data.map((d) => (
                                    <div key={d.year} className="flex items-center justify-between p-2 rounded bg-[var(--bg-base)]">
                                        <span className="text-[var(--text-muted)]">{d.year}</span>
                                        <span className={`font-mono ${d.maxTemp && d.maxTemp >= 11 && d.maxTemp <= 12 ? 'text-[var(--success)] font-bold' : ''}`}>
                                            {d.maxTemp?.toFixed(1) || '--'}°C
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 p-2 rounded bg-[var(--accent-muted)] text-xs">
                                <div className="flex justify-between"><span>10年均值:</span><span className="font-mono">{historical?.stats.avg?.toFixed(1)}°C</span></div>
                                <div className="flex justify-between"><span>范围:</span><span className="font-mono">{historical?.stats.min?.toFixed(0)}~{historical?.stats.max?.toFixed(0)}°C</span></div>
                            </div>
                        </div>
                    </Card>

                    {/* Peak Time */}
                    <Card variant="elevated">
                        <CardHeader title="最高温出现时间" subtitle="30年均值 · 近10年记录" />
                        <div className="p-3 pt-0 space-y-2 text-sm">
                            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-base)]">
                                <span className="text-[var(--text-muted)]">30年平均</span>
                                <span className="font-mono font-bold">{peakTimes?.averageTime || "--:--"}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-base)]">
                                <span className="text-[var(--text-muted)]">高温窗口</span>
                                <Badge variant={peakWindowPassed ? "success" : "warning"}>{peakWindowPassed ? "已过" : "未过"}</Badge>
                            </div>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {peakTimes?.last10?.map((item) => (
                                    <div key={item.year} className="flex items-center justify-between p-2 rounded bg-[var(--bg-base)]">
                                        <span className="text-[var(--text-muted)]">{item.year}</span>
                                        <span className="font-mono">{item.peakTime || "--:--"}</span>
                                    </div>
                                ))}
                                {!peakTimes?.last10?.length && (
                                    <div className="text-xs text-[var(--text-muted)]">暂无记录</div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Links */}
                    <Card variant="elevated">
                        <CardHeader title="快速链接" />
                        <div className="p-3 pt-0 space-y-1 text-sm">
                            <a href={`https://polymarket.com/event/${selectedDate.eventSlug}`} target="_blank" rel="noopener noreferrer"
                                className="block p-2 rounded bg-[var(--bg-base)] hover:bg-[var(--bg-hover)]">Polymarket 交易页面</a>
                            <a href="/whale" className="block p-2 rounded bg-[var(--bg-base)] hover:bg-[var(--bg-hover)]">鲸鱼策略分析</a>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
