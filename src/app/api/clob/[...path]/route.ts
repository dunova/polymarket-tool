import { NextRequest, NextResponse } from 'next/server';

const CLOB_API_BASE = 'https://clob.polymarket.com';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const targetPath = '/' + path.join('/');

        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();
        const targetUrl = `${CLOB_API_BASE}${targetPath}${searchParams ? '?' + searchParams : ''}`;

        console.log('CLOB proxy:', targetUrl);

        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Polymarket-Tool/1.0',
            },
            cache: 'no-store',
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
