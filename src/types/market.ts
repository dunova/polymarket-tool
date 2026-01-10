// Polymarket API Types

export interface Market {
    id: string;
    question: string;
    slug: string;
    conditionId: string;
    clobTokenIds: string[];
    outcomes: string[];
    outcomePrices: number[];
    volume: number;
    liquidity: number;
    endDate: string;
    active: boolean;
    closed: boolean;
    groupItemTitle?: string;
}

export interface Event {
    id: string;
    slug: string;
    title: string;
    description: string;
    markets: Market[];
    startDate: string;
    endDate: string;
    image?: string;
}

export interface Tracking {
    id: string;
    slug: string;
    title: string;
    startTime: Date;
    endTime: Date;
    tweetCount?: number;
}

export interface MarketData {
    label: string;
    minVal: number;
    maxVal: number;
    yesPrice: number;
    assetId: string | null;
    slug: string;
}

export interface OrderbookLevel {
    price: number;
    size: number;
}

export interface Orderbook {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    timestamp: number;
}

export interface WebSocketMessage {
    type: 'book' | 'trade' | 'ticker';
    asset_id: string;
    bids?: OrderbookLevel[];
    asks?: OrderbookLevel[];
    price?: number;
    size?: number;
    timestamp: number;
}
