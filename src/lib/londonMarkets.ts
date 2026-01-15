const LONDON_TIMEZONE = 'Europe/London';

export interface LondonMarketRange {
    label: string;
    slug: string;
    color: string;
    tokenId: string;
}

export interface LondonMarketConfig {
    date: string;
    isoDate: string;
    dayNum: number;
    eventSlug: string;
    eventUrl: string;
    closed: boolean;
    volume: number;
    ranges: LondonMarketRange[];
}

interface LondonMarketEvent {
    slug?: string;
    title?: string;
    closed?: boolean;
    active?: boolean;
    startDate?: string;
    endDate?: string;
    creationDate?: string;
    volume?: number | string;
    markets?: Array<{
        groupItemTitle?: string;
        question?: string;
        slug?: string;
        clobTokenIds?: string;
        volume?: number | string;
    }>;
}

export const getLondonDateKey = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value || '1970';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    return `${year}-${month}-${day}`;
};

const getLondonDateLabel = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON_TIMEZONE,
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    return `${parseInt(month, 10)}月${parseInt(day, 10)}日`;
};

const getEventDate = (event: LondonMarketEvent): Date | null => {
    const dateSource = event.endDate || event.startDate || event.creationDate;
    if (!dateSource) return null;
    const date = new Date(dateSource);
    return Number.isNaN(date.getTime()) ? null : date;
};

const parseVolume = (value?: number | string): number => {
    if (value === undefined || value === null) return 0;
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseTokenId = (clobTokenIds?: string) => {
    if (!clobTokenIds) return '';
    try {
        const parsed = JSON.parse(clobTokenIds);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
    } catch {
        return '';
    }
};

const extractRangeLabel = (question?: string) => {
    if (!question) return 'Unknown';
    const match = question.match(/be (.*)\?/i);
    return match?.[1]?.trim() || 'Unknown';
};

export const buildLondonMarketConfigs = (events: LondonMarketEvent[], now: Date, maxDays = 3): LondonMarketConfig[] => {
    const todayKey = getLondonDateKey(now);
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444'];

    const configs = events
        .map((event) => {
            if (!event.slug) return null;
            const eventDate = getEventDate(event);
            if (!eventDate) return null;
            const isoDate = getLondonDateKey(eventDate);
            const dateLabel = getLondonDateLabel(eventDate);
            const dayNum = parseInt(isoDate.split('-')[2] || '0', 10);

            const ranges = (event.markets || []).map((market, index) => ({
                label: market.groupItemTitle || extractRangeLabel(market.question),
                slug: market.slug?.split('-').pop() || '',
                color: colors[index % colors.length],
                tokenId: parseTokenId(market.clobTokenIds),
            }));

            const volume = event.volume !== undefined
                ? parseVolume(event.volume)
                : (event.markets || []).reduce((sum, market) => sum + parseVolume(market.volume), 0);

            return {
                date: dateLabel,
                isoDate,
                dayNum,
                eventSlug: event.slug,
                eventUrl: `https://polymarket.com/event/${event.slug}`,
                closed: Boolean(event.closed),
                volume,
                ranges,
            };
        })
        .filter((value): value is LondonMarketConfig => value !== null)
        .filter((config) => config.isoDate >= todayKey)
        .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    const unique = new Map<string, LondonMarketConfig>();
    configs.forEach((config) => {
        if (!unique.has(config.eventSlug)) {
            unique.set(config.eventSlug, config);
        }
    });

    return Array.from(unique.values()).slice(0, maxDays);
};
