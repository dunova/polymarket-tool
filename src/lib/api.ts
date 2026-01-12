// API Client utilities

const API_BASE = '';

export async function fetchGamma(path: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE}/api/gamma${path}`, options);
    if (!response.ok) {
        throw new Error(`Gamma API error: ${response.status}`);
    }
    return response.json();
}

export async function fetchXTracker(path: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE}/api/xtracker${path}`, options);
    if (!response.ok) {
        throw new Error(`XTracker API error: ${response.status}`);
    }
    return response.json();
}

export async function fetchClob(path: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE}/api/clob${path}`, options);
    if (!response.ok) {
        throw new Error(`CLOB API error: ${response.status}`);
    }
    return response.json();
}

// Market discovery for Elon tweets
export async function discoverElonMarkets() {
    try {
        // Fixed: removed extra /api prefix
        const data = await fetchXTracker('/trackings');

        if (!data.success || !data.data) {
            return [];
        }

        // Filter for Elon tweet markets
        const candidates = data.data.filter((t: { title: string }) =>
            t.title?.toLowerCase().includes('elon') &&
            t.title?.toLowerCase().includes('tweets')
        );

        // Parse date ranges and fetch details
        const trackings = await Promise.all(
            candidates.map(async (t: {
                title: string;
                polymarket_link?: string;
                id: string;
                current_count?: number;
                count?: number;
            }) => {
                const title = t.title;
                // Match "Month Day - Month Day" OR "Month Day to Month Day"
                const match = title.match(/(\w+)\s+(\d+)\s*(?:[-–]|to)\s*(\w+)\s+(\d+)/i);
                if (!match) return null;

                const [, m1, d1, m2, d2] = match;
                const slug = `elon-musk-of-tweets-${m1.toLowerCase()}-${d1}-${m2.toLowerCase()}-${d2}`;

                try {
                    const events = await fetchGamma(`/events?slug=${slug}`);
                    if (events && events[0]) {
                        const event = events[0];
                        return {
                            id: t.id,
                            slug,
                            title: event.title || title,
                            startTime: new Date(`${m1} ${d1}, 2026`),
                            endTime: new Date(`${m2} ${d2}, 2026 23:59:59`),
                            // Fixed: Use actual tweet count from xtracker, not volume
                            tweetCount: t.current_count || t.count || 0,
                            rawEvent: event,
                        };
                    }
                } catch {
                    console.warn(`Failed to resolve slug ${slug}`);
                }
                return null;
            })
        );

        return trackings.filter((t): t is NonNullable<typeof t> => t !== null)
            .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    } catch (error) {
        console.error('Discover markets error:', error);
        return [];
    }
}

// Get market data for a specific event
export async function getMarketData(slug: string) {
    try {
        const events = await fetchGamma(`/events?slug=${slug}`);
        if (!events || !events[0]) return [];

        const event = events[0];
        return event.markets.map((m: {
            groupItemTitle?: string;
            question?: string;
            outcomePrices?: string;
            clobTokenIds?: string;
        }) => {
            let yesPrice = 0;
            try {
                const prices = JSON.parse(m.outcomePrices || '[]');
                yesPrice = parseFloat(prices[0] || 0);
            } catch { /* ignore */ }

            const label = m.groupItemTitle || m.question || '';
            // Match various range formats: <20, 20-30, 30+
            const match = label.match(/(?:<|Start)\s*(\d+)|(\d+)\s*(?:-|to)\s*(\d+)|(\d+)\+/i);
            let minVal = 0, maxVal = 9999;

            if (match) {
                if (match[1]) { // <20
                    minVal = 0;
                    maxVal = parseInt(match[1]) - 1;
                } else if (match[4]) { // 30+
                    minVal = parseInt(match[4]);
                    maxVal = 9999;
                } else if (match[2] && match[3]) { // 20-30
                    minVal = parseInt(match[2]);
                    maxVal = parseInt(match[3]);
                }
            }

            const assetId = m.clobTokenIds ? JSON.parse(m.clobTokenIds)[0] : null;

            return { label, minVal, maxVal, yesPrice, slug, assetId };
        }).sort((a: { minVal: number }, b: { minVal: number }) => a.minVal - b.minVal);
    } catch (error) {
        console.error('Get market data error:', error);
        return [];
    }
}
