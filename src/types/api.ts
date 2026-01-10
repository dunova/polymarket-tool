// API Response Types

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}

export interface GammaEventResponse {
    id: string;
    slug: string;
    title: string;
    description: string;
    markets: GammaMarket[];
}

export interface GammaMarket {
    id: string;
    question: string;
    slug: string;
    conditionId: string;
    clobTokenIds: string;
    groupItemTitle?: string;
    outcomePrices: string;
    outcomes: string;
    volume: string;
    liquidity: string;
    endDate: string;
    active: boolean;
    closed: boolean;
}

export interface XTrackerResponse {
    success: boolean;
    data: {
        id: string;
        count: number;
        last_tweet_at?: string;
        stats?: {
            daily?: number[];
        };
    };
}

export interface XTrackerListResponse {
    success: boolean;
    data: XTrackerItem[];
}

export interface XTrackerItem {
    id: string;
    title: string;
    description?: string;
    polymarket_link?: string;
}
