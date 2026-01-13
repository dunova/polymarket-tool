import { NextResponse } from 'next/server';

const DATA_API = 'https://data-api.polymarket.com';
const NEOBROTHER_ADDR = '0x6297b93ea37ff92a57fd636410f3b71ebf74517e';

// City coordinates for weather lookup
const CITY_COORDS: Record<string, { lat: number; lon: number; tz: string }> = {
    'Buenos Aires': { lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
    'London': { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    'New York': { lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
    'Dallas': { lat: 32.7767, lon: -96.7970, tz: 'America/Chicago' },
    'Atlanta': { lat: 33.7490, lon: -84.3880, tz: 'America/New_York' },
    'Seattle': { lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },
};

// Parse city from trade title
function parseCity(title: string): string | null {
    for (const city of Object.keys(CITY_COORDS)) {
        if (title.toLowerCase().includes(city.toLowerCase())) return city;
    }
    // Handle abbreviated forms
    if (title.includes('NYC') || title.includes('New York City')) return 'New York';
    return null;
}

// Parse target temperature threshold from title
function parseThreshold(title: string): { temp: number; unit: 'C' | 'F'; condition: string } | null {
    // Match patterns like "35°C", "8°C or higher", "40°F or higher"
    const match = title.match(/(\d+)[°]?(C|F)(\s+or\s+(higher|lower|below))?/i);
    if (!match) return null;
    return {
        temp: parseInt(match[1]),
        unit: match[2].toUpperCase() as 'C' | 'F',
        condition: match[4]?.toLowerCase() || 'exact'
    };
}

// Parse target date from title/slug
function parseTargetDate(title: string, slug: string): string | null {
    // Match "January 13" pattern
    const months: Record<string, string> = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };

    const match = title.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)/i);
    if (match) {
        const month = months[match[1].toLowerCase()];
        const day = match[2].padStart(2, '0');
        return `2026-${month}-${day}`; // Assuming current year context
    }
    return null;
}

// Fetch historical hourly weather for a date/city
async function fetchWeatherForDate(city: string, date: string): Promise<any> {
    const coord = CITY_COORDS[city];
    if (!coord) return null;

    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lon}&hourly=temperature_2m&start_date=${date}&end_date=${date}&timezone=${encodeURIComponent(coord.tz)}`
        );
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        // Step 1: Fetch all trades (up to 1000)
        const tradesRes = await fetch(`${DATA_API}/activity?user=${NEOBROTHER_ADDR}&limit=1000`);
        if (!tradesRes.ok) throw new Error('Failed to fetch trades');
        const allTrades = await tradesRes.json();

        // Step 2: Parse and enrich each trade
        const enrichedTrades: any[] = [];
        const marketCache: Record<string, any> = {}; // Cache weather by date+city

        for (const trade of allTrades) {
            const city = parseCity(trade.title || '');
            const threshold = parseThreshold(trade.title || '');
            const targetDate = parseTargetDate(trade.title || '', trade.slug || '');

            if (!city || !threshold || !targetDate) continue; // Skip non-weather trades

            const tradeTime = new Date(trade.timestamp * 1000);
            const tradeHour = tradeTime.getUTCHours();

            // Fetch weather (cached)
            const cacheKey = `${city}-${targetDate}`;
            if (!marketCache[cacheKey]) {
                marketCache[cacheKey] = await fetchWeatherForDate(city, targetDate);
            }
            const weather = marketCache[cacheKey];

            let peakHour = null;
            let peakTemp = null;
            let tempAtTradeHour = null;

            if (weather?.hourly?.temperature_2m) {
                const temps = weather.hourly.temperature_2m;
                peakTemp = Math.max(...temps);
                peakHour = temps.indexOf(peakTemp);
                tempAtTradeHour = temps[tradeHour] ?? null;
            }

            enrichedTrades.push({
                id: trade.transactionHash,
                timestamp: trade.timestamp,
                tradeTime: tradeTime.toISOString(),
                tradeHour,
                city,
                targetDate,
                threshold,
                side: trade.side,
                price: parseFloat(trade.price),
                usdcSize: parseFloat(trade.usdcSize),
                outcome: trade.outcome,
                eventSlug: trade.eventSlug,
                peakHour,
                peakTemp,
                tempAtTradeHour,
                enteredAfterPeak: peakHour !== null ? tradeHour > peakHour : null,
                tempProximity: tempAtTradeHour !== null && threshold ? Math.abs(tempAtTradeHour - threshold.temp) : null,
            });
        }

        // Step 3: Compute pattern statistics
        const patterns = {
            peakHourEntry: {
                name: 'Peak-Hour Entry',
                description: 'Trades placed AFTER the hour of daily max temperature',
                total: enrichedTrades.filter(t => t.enteredAfterPeak !== null).length,
                matches: enrichedTrades.filter(t => t.enteredAfterPeak === true).length,
                rate: 0
            },
            thresholdProximity: {
                name: 'Threshold Proximity',
                description: 'Trades where actual temp is within 2°C of market threshold',
                total: enrichedTrades.filter(t => t.tempProximity !== null).length,
                matches: enrichedTrades.filter(t => t.tempProximity !== null && t.tempProximity <= 2).length,
                rate: 0
            },
            highProbEntry: {
                name: 'High-Probability Entry',
                description: 'Trades at price 0.85+ (near certain outcome)',
                total: enrichedTrades.length,
                matches: enrichedTrades.filter(t => t.price >= 0.85).length,
                rate: 0
            },
            lowProbEntry: {
                name: 'Low-Probability Entry',
                description: 'Trades at price 0.15- (high risk / mispriced)',
                total: enrichedTrades.length,
                matches: enrichedTrades.filter(t => t.price <= 0.15).length,
                rate: 0
            },
            buyDominance: {
                name: 'Buy Dominance',
                description: 'Ratio of BUY vs SELL trades',
                total: enrichedTrades.length,
                matches: enrichedTrades.filter(t => t.side === 'BUY').length,
                rate: 0
            }
        };

        // Calculate rates
        for (const key of Object.keys(patterns) as (keyof typeof patterns)[]) {
            const p = patterns[key];
            p.rate = p.total > 0 ? Math.round((p.matches / p.total) * 100) : 0;
        }

        // City breakdown
        const cityStats: Record<string, { trades: number; volume: number }> = {};
        for (const t of enrichedTrades) {
            if (!cityStats[t.city]) cityStats[t.city] = { trades: 0, volume: 0 };
            cityStats[t.city].trades++;
            cityStats[t.city].volume += t.usdcSize;
        }

        // Hour distribution
        const hourDistribution: number[] = new Array(24).fill(0);
        for (const t of enrichedTrades) {
            hourDistribution[t.tradeHour]++;
        }

        // Price distribution
        const priceBuckets = [
            { range: '0.00-0.10', count: 0 },
            { range: '0.10-0.20', count: 0 },
            { range: '0.20-0.80', count: 0 },
            { range: '0.80-0.90', count: 0 },
            { range: '0.90-1.00', count: 0 },
        ];
        for (const t of enrichedTrades) {
            if (t.price < 0.1) priceBuckets[0].count++;
            else if (t.price < 0.2) priceBuckets[1].count++;
            else if (t.price < 0.8) priceBuckets[2].count++;
            else if (t.price < 0.9) priceBuckets[3].count++;
            else priceBuckets[4].count++;
        }

        // ========== BUY-SELL DECISION PATTERNS ==========
        // Group all trades by event
        const eventAnalysis: Record<string, { buys: any[]; sells: any[]; redeems: any[] }> = {};

        for (const trade of allTrades) {
            const event = trade.eventSlug;
            if (!event) continue;

            if (!eventAnalysis[event]) {
                eventAnalysis[event] = { buys: [], sells: [], redeems: [] };
            }

            if (trade.type === 'TRADE') {
                const tradeData = {
                    time: trade.timestamp,
                    price: parseFloat(trade.price),
                    size: parseFloat(trade.usdcSize || trade.size),
                    outcome: trade.outcome
                };
                if (trade.side === 'BUY') {
                    eventAnalysis[event].buys.push(tradeData);
                } else {
                    eventAnalysis[event].sells.push(tradeData);
                }
            } else if (trade.type === 'REDEEM') {
                eventAnalysis[event].redeems.push({
                    time: trade.timestamp,
                    size: parseFloat(trade.size)
                });
            }
        }

        // Calculate decision patterns
        let holdToExpiry = 0;
        let earlyExit = 0;
        let pureBuy = 0;
        let batchBuyEvents = 0;
        const batchIntervals: number[] = [];
        const allBuyPrices: number[] = [];
        const allSellPrices: number[] = [];

        for (const [event, data] of Object.entries(eventAnalysis)) {
            const { buys, sells, redeems } = data;

            // Collect prices
            buys.forEach(b => allBuyPrices.push(b.price));
            sells.forEach(s => allSellPrices.push(s.price));

            // Batch buy detection
            if (buys.length > 1) {
                batchBuyEvents++;
                // Calculate intervals between buys
                const sortedBuys = [...buys].sort((a, b) => a.time - b.time);
                for (let i = 1; i < sortedBuys.length; i++) {
                    const intervalMins = (sortedBuys[i].time - sortedBuys[i - 1].time) / 60;
                    batchIntervals.push(intervalMins);
                }
            }

            // Exit strategy detection
            if (redeems.length > 0 && sells.length === 0) {
                holdToExpiry++;
            } else if (sells.length > 0) {
                earlyExit++;
            } else if (buys.length > 0 && sells.length === 0 && redeems.length === 0) {
                pureBuy++; // Still holding
            }
        }

        const totalEvents = Object.keys(eventAnalysis).length;
        const avgBuyPrice = allBuyPrices.length > 0 ? allBuyPrices.reduce((a, b) => a + b, 0) / allBuyPrices.length : 0;
        const avgSellPrice = allSellPrices.length > 0 ? allSellPrices.reduce((a, b) => a + b, 0) / allSellPrices.length : 0;
        const avgBatchInterval = batchIntervals.length > 0 ? batchIntervals.reduce((a, b) => a + b, 0) / batchIntervals.length : 0;

        const buySellPatterns = {
            totalEvents,
            batchBuyEvents,
            batchBuyRate: totalEvents > 0 ? Math.round((batchBuyEvents / totalEvents) * 100) : 0,
            holdToExpiry,
            holdToExpiryRate: totalEvents > 0 ? Math.round((holdToExpiry / totalEvents) * 100) : 0,
            earlyExit,
            earlyExitRate: totalEvents > 0 ? Math.round((earlyExit / totalEvents) * 100) : 0,
            pureBuy,
            avgBuyPrice: Math.round(avgBuyPrice * 1000) / 10, // as percentage
            avgSellPrice: Math.round(avgSellPrice * 1000) / 10,
            profitSpread: Math.round((avgSellPrice - avgBuyPrice) * 1000) / 10,
            avgBatchIntervalMins: Math.round(avgBatchInterval),
            totalBuys: allBuyPrices.length,
            totalSells: allSellPrices.length,
            buyToSellRatio: allSellPrices.length > 0 ? Math.round(allBuyPrices.length / allSellPrices.length * 10) / 10 : 0,
        };

        return NextResponse.json({
            summary: {
                totalTrades: enrichedTrades.length,
                totalVolume: enrichedTrades.reduce((s, t) => s + t.usdcSize, 0),
                uniqueMarkets: new Set(enrichedTrades.map(t => t.eventSlug)).size,
                uniqueCities: Object.keys(cityStats).length,
            },
            patterns,
            buySellPatterns,
            cityStats,
            hourDistribution,
            priceBuckets,
            tradeLog: enrichedTrades.slice(0, 200),
        });

    } catch (error) {
        console.error('Neobrother analysis error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
