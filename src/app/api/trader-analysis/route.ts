import { NextRequest, NextResponse } from 'next/server';

// City timezone offsets
const CITY_TZ: Record<string, number> = {
    'Buenos Aires': -3, 'London': 0, 'New York': -5,
    'Dallas': -6, 'Atlanta': -5, 'Seattle': -8,
    'Chicago': -6, 'Los Angeles': -8, 'Miami': -5,
};

function parseCity(title: string): string | null {
    for (const city of Object.keys(CITY_TZ)) {
        if (title.toLowerCase().includes(city.toLowerCase())) return city;
    }
    if (title.toLowerCase().includes('nyc')) return 'New York';
    return null;
}

function parseTargetDate(title: string): Date | null {
    const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const match = title.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)/);
    if (match) {
        return new Date(2026, months[match[1]], parseInt(match[2]));
    }
    return null;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        // Fetch trades
        const res = await fetch(`https://data-api.polymarket.com/activity?user=${address}&limit=1000`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'No trades found' }, { status: 404 });
        }

        // === Basic Stats ===
        const trades = data.filter((t: any) => t.type === 'TRADE');
        const buys = trades.filter((t: any) => t.side === 'BUY');
        const sells = trades.filter((t: any) => t.side === 'SELL');
        const totalVolume = trades.reduce((sum: number, t: any) => sum + parseFloat(t.usdcSize || 0), 0);

        // === Market Focus ===
        const marketTypes: Record<string, number> = {
            'weather': 0,
            'politics': 0,
            'crypto': 0,
            'sports': 0,
            'elon/tweet': 0,
            'other': 0
        };

        for (const trade of data) {
            const title = (trade.title || '').toLowerCase();
            const slug = (trade.eventSlug || '').toLowerCase();

            if (title.includes('temperature') || title.includes('weather') || title.includes('°c') || title.includes('highest')) {
                marketTypes.weather++;
            } else if (title.includes('elon') || title.includes('musk') || title.includes('tweet') || slug.includes('tweet')) {
                marketTypes['elon/tweet']++;
            } else if (title.includes('trump') || title.includes('biden') || title.includes('election') || title.includes('president') || title.includes('iran') || title.includes('regime')) {
                marketTypes.politics++;
            } else if (title.includes('bitcoin') || title.includes('btc') || title.includes('eth')) {
                marketTypes.crypto++;
            } else if (title.includes('nfl') || title.includes('nba') || title.includes('sport') || title.includes('football')) {
                marketTypes.sports++;
            } else {
                marketTypes.other++;
            }
        }
        const totalMarket = Object.values(marketTypes).reduce((a, b) => a + b, 0);
        const topMarket = Object.entries(marketTypes).sort((a, b) => b[1] - a[1])[0];

        // === Price Distribution (5% Buckets) ===
        const priceBuckets: Record<string, number> = {};
        for (let i = 0; i < 20; i++) {
            priceBuckets[`${i * 5}-${(i + 1) * 5}%`] = 0;
        }

        const buyPrices: number[] = [];
        const sellPrices: number[] = [];
        const entryExitMap: { entry: number, exit: number, profit: number }[] = [];

        // Track potential matched trades (simple heuristic)
        const openPositions: Record<string, { size: number, cost: number, count: number }> = {};

        // Process for Scatter Plot: Sort Chronologically (Oldest -> Newest)
        const sortedTrades = [...trades].sort((a: any, b: any) => a.timestamp - b.timestamp);

        for (const trade of sortedTrades) {
            const price = parseFloat(trade.price || 0);
            if (trade.side === 'BUY') {
                // Track for scatter
                const key = trade.slug || trade.title;
                if (!openPositions[key]) openPositions[key] = { size: 0, cost: 0, count: 0 };
                openPositions[key].size += parseFloat(trade.size || 0);
                openPositions[key].cost += parseFloat(trade.usdcSize || 0);
                openPositions[key].count++;

            } else {
                // Try match for scatter
                const key = trade.slug || trade.title;
                if (openPositions[key] && openPositions[key].size > 0) {
                    const avgEntryPrice = openPositions[key].cost / openPositions[key].size;

                    // Only add if reasonable match
                    if (avgEntryPrice > 0 && avgEntryPrice < 1) {
                        entryExitMap.push({
                            entry: avgEntryPrice * 100,
                            exit: price * 100,
                            profit: (price - avgEntryPrice) * 100
                        });

                        // Reduce position (fifo approximation)
                        const sellSize = parseFloat(trade.size || 0);
                        const ratio = Math.max(0, 1 - (sellSize / openPositions[key].size));
                        openPositions[key].size *= ratio;
                        openPositions[key].cost *= ratio;
                    }
                }
            }
        }

        // Original loop for buckets/stats (can use unsorted or sorted, doesn't matter for buckets)
        for (const trade of trades) {
            const price = parseFloat(trade.price || 0);
            if (trade.side === 'BUY') {
                buyPrices.push(price);
            } else {
                sellPrices.push(price);
            }

            // Price buckets logic
            const bucketIndex = Math.floor(price * 20); // 0.05 * 20 = 1
            const bucketKey = `${bucketIndex * 5}-${(bucketIndex + 1) * 5}%`;
            if (priceBuckets[bucketKey] !== undefined) {
                priceBuckets[bucketKey]++;
            }
        }

        const avgBuyPrice = buyPrices.length > 0 ? buyPrices.reduce((a, b) => a + b, 0) / buyPrices.length : 0;
        const avgSellPrice = sellPrices.length > 0 ? sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length : 0;

        // === Event Analysis (Buy/Sell Patterns) ===
        const eventAnalysis: Record<string, { buys: any[], sells: any[], redeems: any[], title: string }> = {};
        for (const trade of data) {
            const event = trade.eventSlug || '';
            if (!event) continue;
            if (!eventAnalysis[event]) {
                eventAnalysis[event] = { buys: [], sells: [], redeems: [], title: trade.title || '' };
            }
            if (trade.type === 'TRADE') {
                if (trade.side === 'BUY') eventAnalysis[event].buys.push(trade);
                else eventAnalysis[event].sells.push(trade);
            } else if (trade.type === 'REDEEM') {
                eventAnalysis[event].redeems.push(trade);
            }
        }

        const totalEvents = Object.keys(eventAnalysis).length;
        const holdToExpiry = Object.values(eventAnalysis).filter(e => e.redeems.length > 0 && e.sells.length === 0).length;
        const earlyExit = Object.values(eventAnalysis).filter(e => e.sells.length > 0).length;
        const batchBuy = Object.values(eventAnalysis).filter(e => e.buys.length > 1).length;

        // === Time Analysis ===
        const hourDistribution: Record<number, { buys: number, sells: number }> = {};
        for (let h = 0; h < 24; h++) hourDistribution[h] = { buys: 0, sells: 0 };

        const timelineAnalysis = {
            before_peak: { buys: 0, sells: 0 },
            after_peak: { buys: 0, sells: 0 },
            evening: { buys: 0, sells: 0 },
        };

        for (const trade of trades) {
            const tradeTime = new Date(trade.timestamp * 1000);
            const hour = tradeTime.getUTCHours();

            // For weather/local analysis
            // Simple heuristic mapping for visualization
            const localHour = hour; // Default UTC

            if (trade.side === 'BUY') {
                hourDistribution[hour].buys++;
                if (localHour < 14) timelineAnalysis.before_peak.buys++;
                else if (localHour < 18) timelineAnalysis.after_peak.buys++;
                else timelineAnalysis.evening.buys++;
            } else {
                hourDistribution[hour].sells++;
                if (localHour < 14) timelineAnalysis.before_peak.sells++;
                else if (localHour < 18) timelineAnalysis.after_peak.sells++;
                else timelineAnalysis.evening.sells++;
            }
        }

        // === City Distribution ===
        const cityStats: Record<string, { trades: number, volume: number }> = {};
        for (const trade of trades) {
            const city = parseCity(trade.title || '');
            if (city) {
                if (!cityStats[city]) cityStats[city] = { trades: 0, volume: 0 };
                cityStats[city].trades++;
                cityStats[city].volume += parseFloat(trade.usdcSize || 0);
            }
        }

        // === Generate Strategy Type ===
        let strategyType = '';
        let strategyDesc = '';
        if (avgBuyPrice < 0.15 && earlyExit > holdToExpiry) {
            strategyType = '低价抄底 + 高频卖出';
            strategyDesc = '在极低价位入场，价格小幅上涨后快速卖出锁利';
        } else if (avgBuyPrice < 0.15 && holdToExpiry > earlyExit) {
            strategyType = '低价抄底 + 持有到期';
            strategyDesc = '在极低价位入场，持有到结算博弈高收益';
        } else if (avgBuyPrice >= 0.15 && avgBuyPrice < 0.4 && holdToExpiry > earlyExit) {
            strategyType = '中价建仓 + 持有到期';
            strategyDesc = '在中等价位建仓确认趋势，持有到结算获取稳健收益';
        } else if (avgBuyPrice >= 0.4) {
            strategyType = '高价确认 + 强趋势跟随';
            strategyDesc = '在高价位确认后入场，跟随强趋势获取确定性收益';
        } else {
            strategyType = '混合策略';
            strategyDesc = '综合运用多种入场和出场策略';
        }

        // === Decision Rules ===
        const decisionRules = [];
        if (avgBuyPrice < 0.2) {
            decisionRules.push(`IF 价格 < ${(avgBuyPrice * 100 * 1.2).toFixed(0)}% THEN 买入`);
        } else {
            decisionRules.push(`IF 价格在 ${(avgBuyPrice * 100 * 0.8).toFixed(0)}%-${(avgBuyPrice * 100 * 1.2).toFixed(0)}% THEN 买入`);
        }
        if (earlyExit > holdToExpiry) {
            decisionRules.push(`IF 价格涨至 ${(avgSellPrice * 100).toFixed(0)}%+ THEN 卖出锁利`);
        }
        if (holdToExpiry > 0) {
            decisionRules.push('IF 价格未达目标 THEN 持有到期');
        }

        return NextResponse.json({
            address: address.toLowerCase(),
            shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,

            basicStats: {
                totalTrades: trades.length,
                totalVolume: totalVolume.toFixed(2),
                totalBuys: buys.length,
                totalSells: sells.length,
                buyToSellRatio: (buys.length / Math.max(1, sells.length)).toFixed(1),
                totalEvents,
            },

            marketFocus: {
                types: marketTypes,
                topMarket: topMarket[0],
                topMarketPct: ((topMarket[1] / Math.max(1, totalMarket)) * 100).toFixed(1),
            },

            priceDistribution: {
                buckets: priceBuckets,
                avgBuyPrice: (avgBuyPrice * 100).toFixed(1),
                avgSellPrice: (avgSellPrice * 100).toFixed(1),
                profitSpread: ((avgSellPrice - avgBuyPrice) * 100).toFixed(1),
            },

            buySellPatterns: {
                batchBuyRate: ((batchBuy / Math.max(1, totalEvents)) * 100).toFixed(1),
                holdToExpiryRate: ((holdToExpiry / Math.max(1, totalEvents)) * 100).toFixed(1),
                earlyExitRate: ((earlyExit / Math.max(1, totalEvents)) * 100).toFixed(1),
                avgBuyPrice: (avgBuyPrice * 100).toFixed(1),
                avgSellPrice: (avgSellPrice * 100).toFixed(1),
                profitSpread: ((avgSellPrice - avgBuyPrice) * 100).toFixed(1),
            },

            timelineAnalysis: {
                phases: timelineAnalysis,
                hourDistribution: Object.entries(hourDistribution).map(([h, v]) => ({
                    hour: parseInt(h),
                    buys: v.buys,
                    sells: v.sells,
                })),
            },

            cityDistribution: Object.entries(cityStats)
                .map(([city, stats]) => ({ city, ...stats }))
                .sort((a, b) => b.trades - a.trades),

            strategy: {
                type: strategyType,
                description: strategyDesc,
                decisionRules,
            },

            recentTrades: trades.slice(0, 50).map((t: any) => ({
                title: t.title,
                side: t.side,
                price: parseFloat(t.price || 0),
                size: parseFloat(t.usdcSize || 0),
                timestamp: t.timestamp,
                outcome: t.outcome,
            })),
            entryExitMap,
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze trader' }, { status: 500 });
    }
}
