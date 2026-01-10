import { NextRequest, NextResponse } from 'next/server';

const XTRACKER_API_BASE = 'https://xtracker.polymarket.com';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const targetPath = '/' + path.join('/');

        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const targetUrl = `${XTRACKER_API_BASE}${targetPath}${searchParams ? '?' + searchParams : ''}`;

        console.log('XTracker proxy:', targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Polymarket-Tool/1.0',
            },
            cache: 'no-store', // Real-time data
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
