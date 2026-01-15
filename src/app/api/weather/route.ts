import { NextResponse } from 'next/server';

// London coordinates (City of London)
const LONDON_LAT = 51.5074;
const LONDON_LON = -0.1278;

// Open-Meteo API (free, no key required)
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

interface HourlyData {
    time: string;
    temp: number;
}

const extractPeakTime = (times: string[], temps: number[]) => {
    let peakTemp: number | null = null;
    let peakTime: string | null = null;
    let peakMinutes: number | null = null;

    times.forEach((time, index) => {
        const temp = temps[index];
        if (temp === null || temp === undefined) return;
        if (peakTemp === null || temp > peakTemp) {
            peakTemp = temp;
            const timePart = time.split('T')[1] || '';
            const [hourStr, minuteStr] = timePart.split(':');
            if (hourStr && minuteStr) {
                const hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                peakMinutes = hour * 60 + minute;
                peakTime = formatMinutes(peakMinutes);
            }
        }
    });

    return { peakTemp, peakTime, peakMinutes };
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'forecast';
    const date = searchParams.get('date'); // YYYY-MM-DD format

    try {
        if (type === 'forecast') {
            const todayStr = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');
            const targetDate = date || todayStr;
            const isFutureOrToday = targetDate >= todayStr;

            if (isFutureOrToday) {
                // Determine how many days to forecast (up to 14)
                const today = new Date(todayStr);
                const target = new Date(targetDate);
                const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const forecastDays = Math.max(1, Math.min(14, diffDays));

                // Get hourly forecast with multiple models
                const models = 'ukmo_seamless,icon_seamless,gfs_seamless,ecmwf_ifs';
                const response = await fetch(
                    `${OPEN_METEO_BASE}?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&hourly=temperature_2m&current_weather=true&timezone=Europe/London&forecast_days=${forecastDays}&models=${models}`,
                    { next: { revalidate: 300 } } // Cache for 5 minutes
                );

                if (!response.ok) {
                    throw new Error(`Open-Meteo API error: ${response.status}`);
                }

                const data = await response.json();

                const modelData: Record<string, { max: number | null, hourly: HourlyData[] }> = {};
                const modelKeys = ['temperature_2m', ...models.split(',').map(m => `temperature_2m_${m}`)];
                const displayNames: Record<string, string> = {
                    'temperature_2m': 'Best Match',
                    'temperature_2m_ukmo_seamless': 'Met Office',
                    'temperature_2m_icon_seamless': 'DWD ICON',
                    'temperature_2m_gfs_seamless': 'NCEP GFS',
                    'temperature_2m_ecmwf_ifs': 'ECMWF'
                };

                modelKeys.forEach(key => {
                    const temps = data.hourly?.[key] || [];
                    const times = data.hourly?.time || [];
                    let max = -Infinity;
                    const hourly: HourlyData[] = [];

                    times.forEach((time: string, i: number) => {
                        if (time.startsWith(targetDate)) {
                            const t = temps[i];
                            if (t !== undefined && t !== null) {
                                hourly.push({ time, temp: t });
                                if (t > max) max = t;
                            }
                        }
                    });

                    modelData[key] = {
                        max: max === -Infinity ? null : max,
                        hourly
                    };
                });

                // Calculate average across models
                const validMaxes = Object.values(modelData).map(m => m.max).filter((m): m is number => m !== null);
                const avgMax = validMaxes.length > 0 ? validMaxes.reduce((a, b) => a + b, 0) / validMaxes.length : null;

                // Use the average or the first valid model as "Best Match" if the API didn't provide a naked temperature_2m
                const bestMatchKey = 'temperature_2m';
                if (!modelData[bestMatchKey] || modelData[bestMatchKey].hourly.length === 0) {
                    const firstModel = Object.values(modelData).find(m => m.hourly.length > 0);
                    if (firstModel) {
                        modelData[bestMatchKey] = firstModel;
                    }
                }

                return NextResponse.json({
                    source: 'open-meteo-multimodel',
                    date: targetDate,
                    current: data.current_weather,
                    forecastHigh: modelData['temperature_2m'].max, // Keep compatibility
                    avgMax,
                    models: Object.entries(modelData).map(([key, val]) => ({
                        name: displayNames[key] || key,
                        max: val.max,
                        hourly: val.hourly
                    })),
                    hourly: modelData['temperature_2m'].hourly, // Keep compatibility
                    raw: data,
                });
            } else {
                // Get historical hourly data for a specific date
                const response = await fetch(
                    `https://archive-api.open-meteo.com/v1/archive?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&start_date=${targetDate}&end_date=${targetDate}&hourly=temperature_2m&timezone=Europe/London`,
                    { next: { revalidate: 86400 } } // Cache for 24 hours
                );

                if (!response.ok) {
                    throw new Error(`Open-Meteo Archive API error: ${response.status}`);
                }

                const data = await response.json();
                const hourlyTimes = data.hourly?.time || [];
                const hourlyTemps = data.hourly?.temperature_2m || [];

                let maxTemp: number | null = null;
                const hourlyData: HourlyData[] = [];

                hourlyTimes.forEach((time: string, i: number) => {
                    const temp = hourlyTemps[i];
                    hourlyData.push({ time, temp });
                    if (maxTemp === null || temp > maxTemp) {
                        maxTemp = temp;
                    }
                });

                return NextResponse.json({
                    source: 'open-meteo-archive',
                    date: targetDate,
                    forecastHigh: maxTemp,
                    hourly: hourlyData,
                    raw: data,
                });
            }
        }

        if (type === 'historical') {
            // Get historical data for a specific date
            if (!date) {
                return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
            }

            const response = await fetch(
                `https://archive-api.open-meteo.com/v1/archive?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean&timezone=Europe/London`,
                { next: { revalidate: 86400 } } // Cache for 24 hours
            );

            if (!response.ok) {
                throw new Error(`Open-Meteo Archive API error: ${response.status}`);
            }

            const data = await response.json();

            return NextResponse.json({
                source: 'open-meteo-archive',
                date,
                maxTemp: data.daily?.temperature_2m_max?.[0],
                minTemp: data.daily?.temperature_2m_min?.[0],
                meanTemp: data.daily?.temperature_2m_mean?.[0],
                raw: data,
            });
        }

        if (type === 'historical-range') {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const [, month, day] = targetDate.split('-');
            const years = [];
            const currentYear = new Date().getFullYear();

            for (let y = currentYear - 10; y < currentYear; y++) {
                const dateStr = `${y}-${month}-${day}`;
                years.push(dateStr);
            }

            const results = await Promise.all(
                years.map(async (d) => {
                    try {
                        const res = await fetch(
                            `https://archive-api.open-meteo.com/v1/archive?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&start_date=${d}&end_date=${d}&daily=temperature_2m_max&timezone=Europe/London`,
                            { next: { revalidate: 86400 } }
                        );
                        const data = await res.json();
                        return {
                            date: d,
                            year: parseInt(d.split('-')[0]),
                            maxTemp: data.daily?.temperature_2m_max?.[0] ?? null,
                        };
                    } catch {
                        return { date: d, year: parseInt(d.split('-')[0]), maxTemp: null };
                    }
                })
            );

            const validTemps = results.filter(r => r.maxTemp !== null).map(r => r.maxTemp as number);
            const avg = validTemps.length > 0 ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length : null;
            const max = validTemps.length > 0 ? Math.max(...validTemps) : null;
            const min = validTemps.length > 0 ? Math.min(...validTemps) : null;

            return NextResponse.json({
                source: 'open-meteo-archive',
                period: `${month}-${day} (10 years)`,
                data: results,
                stats: { avg, max, min },
            });
        }

        if (type === 'historical-peak-time') {
            if (!date) {
                return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
            }

            const [, month, day] = date.split('-');
            const currentYear = new Date().getFullYear();
            const years = [];

            for (let y = currentYear - 30; y < currentYear; y++) {
                years.push(y);
            }

            const results = await Promise.all(
                years.map(async (year) => {
                    const dateStr = `${year}-${month}-${day}`;
                    try {
                        const res = await fetch(
                            `https://archive-api.open-meteo.com/v1/archive?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m&timezone=Europe/London`,
                            { next: { revalidate: 86400 } }
                        );
                        const data = await res.json();
                        const hourlyTimes = data.hourly?.time || [];
                        const hourlyTemps = data.hourly?.temperature_2m || [];
                        const { peakTemp, peakTime, peakMinutes } = extractPeakTime(hourlyTimes, hourlyTemps);
                        return { year, peakTime, peakTemp, peakMinutes };
                    } catch {
                        return { year, peakTime: null, peakTemp: null, peakMinutes: null };
                    }
                })
            );

            const validPeaks = results.filter(r => r.peakMinutes !== null);
            const averageMinutes = validPeaks.length > 0
                ? Math.round(validPeaks.reduce((sum: number, r) => sum + (r.peakMinutes || 0), 0) / validPeaks.length)
                : null;
            const averageTime = averageMinutes !== null ? formatMinutes(averageMinutes) : null;
            const last10 = results
                .filter(r => r.year >= currentYear - 10)
                .map(({ year, peakTime, peakTemp }) => ({ year, peakTime, peakTemp }));

            return NextResponse.json({
                source: 'open-meteo-archive',
                date,
                years: validPeaks.length,
                averageMinutes,
                averageTime,
                last10,
            });
        }

        if (type === 'markets') {
            try {
                // Fetch from multiple sources to ensure we catch all current markets
                // IMPORTANT: Use order=createdAt&ascending=false to get the latest (2026) markets first
                const [seriesRes, searchRes, janRes] = await Promise.allSettled([
                    fetch('https://gamma-api.polymarket.com/events?series_id=10006&limit=50&order=createdAt&ascending=false', { cache: 'no-store' }),
                    fetch('https://gamma-api.polymarket.com/events?limit=50&series_id=10006&closed=false&order=createdAt&ascending=false', { cache: 'no-store' }),
                    fetch('https://gamma-api.polymarket.com/events?limit=20&series_id=10006&order=endDate&ascending=false', { cache: 'no-store' })
                ]);

                const seriesData = seriesRes.status === 'fulfilled' && seriesRes.value.ok ? await seriesRes.value.json() : [];
                const searchData = searchRes.status === 'fulfilled' && searchRes.value.ok ? await searchRes.value.json() : [];
                const janData = janRes.status === 'fulfilled' && janRes.value.ok ? await janRes.value.json() : [];

                // Combine and deduplicate by ID
                const combined = [
                    ...(Array.isArray(seriesData) ? seriesData : []),
                    ...(Array.isArray(searchData) ? searchData : []),
                    ...(Array.isArray(janData) ? janData : [])
                ];

                const uniqueMap = new Map();
                combined.forEach(event => {
                    if (event && event.id && !uniqueMap.has(event.id)) {
                        const slug = (event.slug || '').toLowerCase();
                        const title = (event.title || '').toLowerCase();
                        // safety filter: ensure it's actually London temperature
                        if (slug.includes('highest-temperature-in-london') || title.includes('highest temperature in london')) {
                            uniqueMap.set(event.id, event);
                        }
                    }
                });

                return NextResponse.json(Array.from(uniqueMap.values()));
            } catch (err) {
                console.error('Market fetch error:', err);
                return NextResponse.json([]);
            }
        }

        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
