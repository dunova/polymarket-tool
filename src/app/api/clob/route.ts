import { NextRequest, NextResponse } from 'next/server';

const CLOB_API_BASE = 'https://clob.polymarket.com';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/api/clob');
        const targetPath = pathParts[1] || '';

        const searchParams = url.searchParams.toString();
        const targetUrl = `${CLOB_API_BASE}${targetPath}${searchParams ? '?' + searchParams : ''}`;

        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Polymarket-Tool/1.0',
            },
            next: { revalidate: 1 }, // Cache for 1 second (orderbook is real-time)
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `CLOB API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('CLOB API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from CLOB API' },
            { status: 500 }
        );
    }
}
