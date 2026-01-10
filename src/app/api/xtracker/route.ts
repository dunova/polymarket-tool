import { NextRequest, NextResponse } from 'next/server';

const XTRACKER_API_BASE = 'https://xtracker.polymarket.com';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/api/xtracker');
        const targetPath = pathParts[1] || '';

        const searchParams = url.searchParams.toString();
        const targetUrl = `${XTRACKER_API_BASE}${targetPath}${searchParams ? '?' + searchParams : ''}`;

        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Polymarket-Tool/1.0',
            },
            next: { revalidate: 5 }, // Cache for 5 seconds (tweet counts update frequently)
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `XTracker API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('XTracker API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from XTracker API' },
            { status: 500 }
        );
    }
}
