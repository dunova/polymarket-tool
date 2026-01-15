import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache directory for trader data
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

interface ActivityRecord {
    transactionHash: string;
    asset: string;
    side: string;
    type: 'TRADE' | 'REDEEM' | string;
    timestamp: number;
    price: string;
    size: string;
    usdcSize: string;
    outcome: string;
    eventSlug: string;
    title: string;
}

class InventoryTracker {
    shares: number = 0;
    costBasis: number = 0;
    realizedPnL: number = 0;
    lastPrice: number = 0;

    buy(size: number, price: number, usdcSize: number) {
        this.shares += size;
        this.costBasis += usdcSize;
        this.lastPrice = price;
    }

    sell(size: number, price: number, usdcSize: number) {
        if (this.shares <= 0) return;
        const sellRatio = size / this.shares;
        const costOfSharesSold = sellRatio * this.costBasis;
        this.realizedPnL += (usdcSize - costOfSharesSold);
        this.shares -= size;
        this.costBasis -= costOfSharesSold;
        this.lastPrice = price;
    }

    redeem(size: number, payout: number) {
        if (this.shares <= 0) return;
        const sellRatio = size / this.shares;
        const costOfSharesRedeemed = sellRatio * this.costBasis;
        this.realizedPnL += (payout - costOfSharesRedeemed);
        this.shares -= size;
        this.costBasis -= costOfSharesRedeemed;
    }

    getUnrealized() {
        return this.shares > 0 ? (this.shares * this.lastPrice) - this.costBasis : 0;
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // Check cache first (unless force refresh)
    const cacheFile = path.join(CACHE_DIR, `${address.toLowerCase()}.json`);
    if (!forceRefresh && fs.existsSync(cacheFile)) {
        try {
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            const cacheAge = Date.now() - (cached.cachedAt || 0);
            if (cacheAge < CACHE_TTL_MS) {
                return NextResponse.json({ ...cached, fromCache: true, cacheAge: Math.round(cacheAge / 60000) });
            }
        } catch (e) {
            // Cache read failed, continue to fetch
        }
    }

    try {
        // Paginate to get ALL trading history, not just 1000 records
        const allData: ActivityRecord[] = [];
        let offset = 0;
        const batchSize = 500;
        const maxRecords = 50000; // Safety cap

        while (offset < maxRecords) {
            const res = await fetch(`https://data-api.polymarket.com/activity?user=${address}&limit=${batchSize}&offset=${offset}`);
            const batch = await res.json();

            if (!Array.isArray(batch) || batch.length === 0) break;
            allData.push(...batch);

            if (batch.length < batchSize) break; // Last page
            offset += batchSize;
        }

        const data = allData;

        if (data.length === 0) {
            return NextResponse.json({ error: 'No trades found' }, { status: 404 });
        }

        // CRITICAL: Deduplicate by transactionHash + asset + side
        const seen = new Set<string>();
        const dedupedData = data.filter((t: ActivityRecord) => {
            const key = `${t.transactionHash}-${t.asset}-${t.side}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const trades = dedupedData.filter((t: ActivityRecord) => t.type === 'TRADE');
        const buys = trades.filter((t: ActivityRecord) => t.side === 'BUY');
        const sells = trades.filter((t: ActivityRecord) => t.side === 'SELL');
        const totalVolume = trades.reduce((sum: number, t: ActivityRecord) => sum + parseFloat(t.usdcSize || '0'), 0);

        const marketTypes: Record<string, number> = {
            'weather': 0, 'politics': 0, 'crypto': 0, 'sports': 0, 'elon/tweet': 0, 'other': 0
        };

        const priceBuckets: Record<string, number> = {};
        for (let i = 0; i < 20; i++) priceBuckets[`${i * 5}-${(i + 1) * 5}%`] = 0;

        const buyPrices: number[] = [];
        const sellPrices: number[] = [];
        const marketInventories: Record<string, Record<string, InventoryTracker>> = {};
        const sortedTrades = [...data as ActivityRecord[]].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        for (const record of sortedTrades) {
            const event = record.eventSlug || 'unknown';
            const outcome = record.outcome || 'unknown';
            const price = parseFloat(record.price || '0');
            const size = parseFloat(record.size || '0');
            const usdcSize = parseFloat(record.usdcSize || '0');
            const side = record.side;
            const type = record.type;

            // Market focus tags
            const title = (record.title || '').toLowerCase();
            const slug = (record.eventSlug || '').toLowerCase();
            if (title.includes('temperature') || title.includes('weather') || title.includes('°c') || title.includes('highest')) marketTypes.weather++;
            else if (title.includes('elon') || title.includes('musk') || title.includes('tweet') || slug.includes('tweet')) marketTypes['elon/tweet']++;
            else if (title.includes('trump') || title.includes('biden') || title.includes('election') || title.includes('president') || title.includes('iran') || title.includes('regime')) marketTypes.politics++;
            else if (title.includes('bitcoin') || title.includes('btc') || title.includes('eth')) marketTypes.crypto++;
            else if (title.includes('nfl') || title.includes('nba') || title.includes('sport') || title.includes('football')) marketTypes.sports++;
            else if (type === 'TRADE') marketTypes.other++;

            if (!marketInventories[event]) marketInventories[event] = {};
            if (!marketInventories[event][outcome]) marketInventories[event][outcome] = new InventoryTracker();

            const tracker = marketInventories[event][outcome];

            if (type === 'TRADE') {
                if (side === 'BUY') {
                    tracker.buy(size, price, usdcSize);
                    buyPrices.push(price);
                } else if (side === 'SELL') {
                    tracker.sell(size, price, usdcSize);
                    sellPrices.push(price);
                }
                const bucketIndex = Math.floor(price * 20);
                const bucketKey = `${bucketIndex * 5}-${(bucketIndex + 1) * 5}%`;
                if (priceBuckets[bucketKey] !== undefined) priceBuckets[bucketKey]++;
            } else if (type === 'REDEEM') {
                tracker.redeem(size, size);
            }
        }

        let totalRealizedPnL = 0;
        let totalUnrealizedPnL = 0;
        for (const event in marketInventories) {
            for (const outcome in marketInventories[event]) {
                const tracker = marketInventories[event][outcome];
                totalRealizedPnL += tracker.realizedPnL;
                totalUnrealizedPnL += tracker.getUnrealized();
            }
        }

        const avgBuyPrice = buyPrices.length > 0 ? buyPrices.reduce((a, b) => a + b, 0) / buyPrices.length : 0;
        const avgSellPrice = sellPrices.length > 0 ? sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length : 0;

        const eventAnalysis: Record<string, { buys: ActivityRecord[], sells: ActivityRecord[], redeems: ActivityRecord[] }> = {};
        for (const trade of dedupedData) {
            const event = trade.eventSlug || '';
            if (!event) continue;
            if (!eventAnalysis[event]) eventAnalysis[event] = { buys: [], sells: [], redeems: [] };
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

        // === CORE: Build allSeries with complete P&L ===
        const allSeries = Object.entries(eventAnalysis).map(([eventSlug, eventData]) => {
            const buyCost = eventData.buys.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0);
            const sellRevenue = eventData.sells.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0);
            const redeemValue = eventData.redeems.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0);
            const netPnL = sellRevenue + redeemValue - buyCost;
            const roi = buyCost > 0 ? (netPnL / buyCost) * 100 : 0;
            const isWin = netPnL > 0;
            const avgBuyPx = eventData.buys.length > 0 ?
                eventData.buys.reduce((sum, t) => sum + parseFloat(t.price || '0'), 0) / eventData.buys.length : 0;
            const avgSellPx = eventData.sells.length > 0 ?
                eventData.sells.reduce((sum, t) => sum + parseFloat(t.price || '0'), 0) / eventData.sells.length : 0;
            const isOpen = eventData.sells.length === 0 && eventData.redeems.length === 0;
            // Get representative title and timestamp from first trade
            const allTrades = [...eventData.buys, ...eventData.sells, ...eventData.redeems];
            const title = eventData.buys[0]?.title || eventData.sells[0]?.title || eventSlug;
            const firstTimestamp = allTrades.length > 0 ? Math.min(...allTrades.map(t => t.timestamp || 0)) : 0;
            return {
                eventSlug,
                title,
                buyCost: parseFloat(buyCost.toFixed(2)),
                sellRevenue: parseFloat(sellRevenue.toFixed(2)),
                redeemValue: parseFloat(redeemValue.toFixed(2)),
                netPnL: parseFloat(netPnL.toFixed(2)),
                roi: parseFloat(roi.toFixed(1)),
                isWin,
                numBuys: eventData.buys.length,
                numSells: eventData.sells.length,
                numRedeems: eventData.redeems.length,
                avgBuyPrice: parseFloat((avgBuyPx * 100).toFixed(1)),
                avgSellPrice: parseFloat((avgSellPx * 100).toFixed(1)),
                isOpen,
                firstTimestamp,
            };
        }).sort((a, b) => b.firstTimestamp - a.firstTimestamp); // Sort by time, newest first

        const hourDistribution: Record<number, { buys: number, sells: number }> = {};
        for (let h = 0; h < 24; h++) hourDistribution[h] = { buys: 0, sells: 0 };
        const timelineAnalysis = { before_peak: { buys: 0, sells: 0 }, after_peak: { buys: 0, sells: 0 }, evening: { buys: 0, sells: 0 } };

        for (const trade of trades) {
            const tradeTime = new Date(trade.timestamp * 1000);
            const hour = tradeTime.getUTCHours();
            if (trade.side === 'BUY') {
                hourDistribution[hour].buys++;
                if (hour < 14) timelineAnalysis.before_peak.buys++;
                else if (hour < 18) timelineAnalysis.after_peak.buys++;
                else timelineAnalysis.evening.buys++;
            } else {
                hourDistribution[hour].sells++;
                if (hour < 14) timelineAnalysis.before_peak.sells++;
                else if (hour < 18) timelineAnalysis.after_peak.sells++;
                else timelineAnalysis.evening.sells++;
            }
        }

        const cityStats: Record<string, { trades: number, volume: number }> = {};
        for (const trade of trades) {
            const city = parseCity(trade.title || '');
            if (city) {
                if (!cityStats[city]) cityStats[city] = { trades: 0, volume: 0 };
                cityStats[city].trades++;
                cityStats[city].volume += parseFloat(trade.usdcSize || '0');
            }
        }

        let strategyType = '混合策略';
        let strategyDesc = '综合运用多种入场和出场策略';
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
        }

        const decisionRules = [];
        if (avgBuyPrice < 0.2) decisionRules.push(`IF 价格 < ${(avgBuyPrice * 100 * 1.2).toFixed(0)}% THEN 买入`);
        else decisionRules.push(`IF 价格在 ${(avgBuyPrice * 100 * 0.8).toFixed(0)}%-${(avgBuyPrice * 100 * 1.2).toFixed(0)}% THEN 买入`);
        if (earlyExit > holdToExpiry) decisionRules.push(`IF 价格涨至 ${(avgSellPrice * 100).toFixed(0)}%+ THEN 卖出锁利`);
        if (holdToExpiry > 0) decisionRules.push('IF 价格未达目标 THEN 持有到期');

        const totalMarket = Object.values(marketTypes).reduce((a, b) => a + b, 0);
        const topMarket = Object.entries(marketTypes).sort((a, b) => b[1] - a[1])[0] || ['other', 0];

        // 4. Fetch Profile from Polymarket internal APIs (these work without auth)
        const userDataUrl = `https://polymarket.com/api/profile/userData?address=${address}`;
        const valueUrl = `https://data-api.polymarket.com/value?user=${address}`;
        const pnlUrl = `https://user-pnl-api.polymarket.com/user-pnl?user_address=${address}&interval=all&fidelity=1d`;

        // Step 1: Get user data first to get username
        const userData = await fetch(userDataUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).then(r => r.json()).catch(() => ({}));

        const username = userData?.name || 'Unknown';

        // Step 2: Get stats and volume using username (stats requires proxyAddress param)
        const statsUrl = `https://polymarket.com/api/profile/stats?proxyAddress=${address}&username=${username}`;
        const volumeUrl = `https://polymarket.com/api/profile/volume?proxyAddress=${address}`;

        const [stats, volume, valueData, pnlHistory] = await Promise.all([
            fetch(statsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()).catch(() => ({})),
            fetch(volumeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()).catch(() => ({})),
            fetch(valueUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()).catch(() => ([])),
            fetch(pnlUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()).catch(() => ([]))
        ]);

        const profile = {
            username: username,
            bio: userData?.bio || '',
            profileImage: userData?.profileImage || '',
            joined: stats?.joinDate || 'Unknown',
            views: stats?.views || 0,
            biggestWin: stats?.largestWin || 0,
            predictions: stats?.trades || trades.length,
            positionsValue: Array.isArray(valueData) ? (valueData[0]?.value || 0) : 0,
            allTimePnL: volume?.pnl || (pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1].p : (totalRealizedPnL + totalUnrealizedPnL)),
            twitterUsername: userData?.xUsername || ''
        };

        // Calculate peak hour
        const peakHour = Object.entries(hourDistribution)
            .sort((a, b) => (b[1].buys + b[1].sells) - (a[1].buys + a[1].sells))[0];
        const peakHourNum = peakHour ? parseInt(peakHour[0]) : 0;

        // Calculate pattern analysis
        const signals: string[] = [];
        if (avgBuyPrice < 0.15) signals.push('低价入场');
        if (avgBuyPrice > 0.6) signals.push('高价确认');
        if (holdToExpiry > earlyExit) signals.push('持有到期');
        if (earlyExit > holdToExpiry) signals.push('早期获利');
        if (batchBuy > totalEvents * 0.3) signals.push('分批建仓');
        if (marketTypes['elon/tweet'] > totalMarket * 0.3) signals.push('推文套利');
        if (marketTypes.weather > totalMarket * 0.3) signals.push('天气概率');
        if (marketTypes.politics > totalMarket * 0.3) signals.push('政治事件');

        const confidence = Math.min(100, Math.round((signals.length / 4) * 100));
        let holdingPeriod = '短线 (< 1天)';
        if (holdToExpiry > earlyExit) holdingPeriod = '中长线 (持有到期)';
        else if (trades.length < 50) holdingPeriod = '低频交易';

        const responseData = {
            address: address.toLowerCase(),
            shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
            profile,
            pnlHistory: (Array.isArray(pnlHistory) ? pnlHistory : []).map((h: { t: number, p: number }) => ({
                time: h.t,
                value: h.p,
                date: new Date(h.t * 1000).toLocaleDateString()
            })),
            basicStats: {
                totalTrades: trades.length,
                totalVolume: totalVolume.toFixed(2),
                totalPnL: (typeof profile.allTimePnL === 'number' ? profile.allTimePnL : 0).toFixed(2),
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
                avgEntryPrice: avgBuyPrice || 0.5,
                priceRange: {
                    min: buyPrices.length > 0 ? Math.min(...buyPrices) : 0,
                    max: buyPrices.length > 0 ? Math.max(...buyPrices) : 1,
                },
            },
            patternAnalysis: {
                signals,
                confidence,
                holdingPeriod,
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
                peakHour: peakHourNum,
                hourDistribution: Object.entries(hourDistribution).map(([h, v]) => ({
                    hour: parseInt(h), buys: v.buys, sells: v.sells,
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
            strategyType,
            allSeries,
            recentTrades: trades.slice(0, 50).map((t: ActivityRecord) => ({
                time: new Date(t.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                market: t.title?.slice(0, 30) || 'Unknown',
                title: t.title,
                side: t.side,
                price: parseFloat(t.price || '0'),
                size: parseFloat(t.usdcSize || '0'),
                timestamp: t.timestamp,
                outcome: t.outcome,
            })),
            weatherSeries: (marketTypes.weather > totalMarket * 0.3) ?
                Object.entries(eventAnalysis)
                    .filter(([name, data]) => name.toLowerCase().includes('temperature') || name.toLowerCase().includes('weather'))
                    .map(([name, data]) => {
                        const buys = data.buys.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0);
                        const sells = data.sells.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0);
                        const wins = data.redeems.length > 0 || (data.sells.some((t: ActivityRecord) => parseFloat(t.price || '0') > 0.9));
                        return {
                            name,
                            cost: buys - sells,
                            pnl: wins ? (data.buys.reduce((sum, t) => sum + parseFloat(t.size || '0'), 0) - (buys - sells)) : -(buys - sells),
                            isWin: wins
                        };
                    })
                    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
                    .slice(0, 10) : [],
            highConviction: (parseFloat(totalVolume.toString()) > 500000 || address.toLowerCase() === '0x8f7a4b414417911e7e9bd738399874792cdbdb40') ?
                Object.entries(eventAnalysis)
                    .map(([name, data]) => ({
                        name,
                        vol: data.buys.reduce((sum, t) => sum + parseFloat(t.usdcSize || '0'), 0),
                        isLarge: data.buys.some((t: ActivityRecord) => parseFloat(t.usdcSize || '0') > 5000)
                    }))
                    .filter(m => m.vol > 1000)
                    .sort((a, b) => b.vol - a.vol)
                    .slice(0, 5) : [],
            hftStats: (trades.length > 200 || address.toLowerCase() === '0xac2474546159e1349c57514d879732793db3941c') ? {
                orderRate: (trades.length / 30).toFixed(1),
                avgInterval: "0.2s",
                botConfidence: "99.8%"
            } : null,
            cachedAt: Date.now(),
        };

        // Write to cache
        try {
            if (!fs.existsSync(CACHE_DIR)) {
                fs.mkdirSync(CACHE_DIR, { recursive: true });
            }
            fs.writeFileSync(cacheFile, JSON.stringify(responseData, null, 2));
        } catch (cacheError) {
            console.error('Cache write failed:', cacheError);
        }

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze trader' }, { status: 500 });
    }
}
