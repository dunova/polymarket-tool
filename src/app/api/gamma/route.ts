import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
    try {
        // Get the path after /api/gamma/
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/api/gamma');
        const targetPath = pathParts[1] || '';

        // Forward query params
        const searchParams = url.searchParams.toString();
        const targetUrl = `${GAMMA_API_BASE}${targetPath}${searchParams ? '?' + searchParams : ''}`;

        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Polymarket-Tool/1.0',
            },
            next: { revalidate: 10 }, // Cache for 10 seconds
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Gamma API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Gamma API proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Gamma API' },
            { status: 500 }
        );
    }
}
