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
            // Get hourly forecast for today
            const response = await fetch(
                `${OPEN_METEO_BASE}?latitude=${LONDON_LAT}&longitude=${LONDON_LON}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode&current_weather=true&timezone=Europe/London&forecast_days=2`,
                { next: { revalidate: 300 } } // Cache for 5 minutes
            );

            if (!response.ok) {
                throw new Error(`Open-Meteo API error: ${response.status}`);
            }

            const data = await response.json();

            // Calculate max temperature from hourly data for today
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const hourlyTimes = data.hourly?.time || [];
            const hourlyTemps = data.hourly?.temperature_2m || [];

            let todayMaxTemp = null;
            let todayHourlyData: Array<{ time: string; temp: number }> = [];

            hourlyTimes.forEach((time: string, i: number) => {
                if (time.startsWith(todayStr)) {
                    const temp = hourlyTemps[i];
                    todayHourlyData.push({ time, temp });
                    if (todayMaxTemp === null || temp > todayMaxTemp) {
                        todayMaxTemp = temp;
                    }
                }
            });

            return NextResponse.json({
                source: 'open-meteo',
                model: 'UKMO/UKV',
                current: data.current_weather,
                forecastHigh: todayMaxTemp,
                hourly: todayHourlyData,
                raw: data,
            });
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
                ? Math.round(validPeaks.reduce((sum, r) => sum + (r.peakMinutes as number), 0) / validPeaks.length)
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

        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
