import { NextResponse } from 'next/server';

// Polymarket Data API for user activity (correct endpoint!)
const DATA_API = 'https://data-api.polymarket.com';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || '';
    const type = searchParams.get('type') || 'activity';
    const limit = searchParams.get('limit') || '50';

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        if (type === 'activity') {
            // Get user activity/trades from data-api
            const response = await fetch(
                `${DATA_API}/activity?user=${address}&limit=${limit}`,
                {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 0 }, // No cache for real-time
                }
            );

            if (!response.ok) {
                throw new Error(`Data API error: ${response.status}`);
            }

            const activity = await response.json();

            // Filter London weather trades
            const londonTrades = activity.filter((a: { title?: string; eventSlug?: string }) => {
                const title = a.title || '';
                const slug = a.eventSlug || '';
                return title.toLowerCase().includes('london') ||
                    slug.includes('london');
            });

            return NextResponse.json({
                address,
                totalActivity: activity.length,
                londonTrades: londonTrades.length,
                trades: londonTrades,
                lastTrade: londonTrades[0] || null,
            });
        }

        if (type === 'profile') {
            // Get full activity for profile analysis
            const response = await fetch(
                `${DATA_API}/activity?user=${address}&limit=100`,
                {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 30 },
                }
            );

            if (!response.ok) {
                throw new Error(`Data API error: ${response.status}`);
            }

            const activity = await response.json();

            // Filter London weather activity
            const londonActivity = activity.filter((a: { title?: string; eventSlug?: string }) => {
                const title = a.title || '';
                const slug = a.eventSlug || '';
                return title.toLowerCase().includes('london') ||
                    slug.includes('london');
            });

            // Analyze trading patterns
            const trades = londonActivity.filter((a: { type?: string }) => a.type === 'TRADE');
            const buyTrades = trades.filter((t: { side?: string }) => t.side === 'BUY');
            const sellTrades = trades.filter((t: { side?: string }) => t.side === 'SELL');

            // Find favorite outcome/temperature
            const outcomeCounts: Record<string, number> = {};
            trades.forEach((t: { outcome?: string; title?: string }) => {
                // Extract temperature from title
                const match = t.title?.match(/(\d+)°C/);
                const temp = match ? `${match[1]}°C` : t.outcome || 'Unknown';
                outcomeCounts[temp] = (outcomeCounts[temp] || 0) + 1;
            });

            const favoriteEntry = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];

            // Get last trade
            const lastTrade = trades[0];

            return NextResponse.json({
                address,
                profile: {
                    totalPositions: activity.length,
                    totalTrades: trades.length,
                    londonTrades: trades.length,
                    londonBuys: buyTrades.length,
                    londonSells: sellTrades.length,
                    favoriteRange: favoriteEntry ? favoriteEntry[0] : null,
                    favoriteRangeCount: favoriteEntry ? favoriteEntry[1] : 0,
                    lastTrade: lastTrade ? {
                        outcome: lastTrade.outcome,
                        side: lastTrade.side,
                        price: lastTrade.price,
                        size: lastTrade.size,
                        timestamp: lastTrade.timestamp ? new Date(lastTrade.timestamp * 1000).toISOString() : null,
                        title: lastTrade.title,
                    } : null,
                    isActive: lastTrade &&
                        (lastTrade.timestamp * 1000) > Date.now() - 86400000, // Active in last 24h
                },
                recentTrades: trades.slice(0, 5).map((t: {
                    outcome?: string;
                    side?: string;
                    price?: number;
                    size?: number;
                    timestamp?: number;
                    title?: string;
                }) => ({
                    outcome: t.outcome,
                    side: t.side,
                    price: t.price,
                    size: t.size,
                    timestamp: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : null,
                    title: t.title,
                })),
            });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('Whale tracker API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch whale data', details: String(error) },
            { status: 500 }
        );
    }
}
