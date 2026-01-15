'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// For real-time whale tracking, we use fast polling since the user channel requires auth
// Polling interval: 500ms for near-millisecond responsiveness

export interface WhaleTrade {
    id: string;
    side: 'BUY' | 'SELL';
    outcome: string;
    price: number;
    size: number;
    timestamp: Date;
    market?: string;
    title?: string;
    assetId?: string;
}

interface UseWhaleTrackerOptions {
    walletAddress: string;
    onTrade?: (trade: WhaleTrade) => void;
    enabled?: boolean;
    pollInterval?: number; // Default 500ms
}

// const GAMMA_API = 'https://gamma-api.polymarket.com';

export function useWhaleTracker({
    walletAddress,
    onTrade,
    enabled = true,
    pollInterval = 500
}: UseWhaleTrackerOptions) {
    const onTradeRef = useRef(onTrade);
    const [isConnected, setIsConnected] = useState(false);
    const [lastTrade, setLastTrade] = useState<WhaleTrade | null>(null);
    const lastTradeIdRef = useRef<string | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Keep callback ref updated
    useEffect(() => {
        onTradeRef.current = onTrade;
    }, [onTrade]);

    const pollTrades = useCallback(async () => {
        if (!enabled || !walletAddress) return;

        try {
            // Use our proxy to avoid CORS
            const response = await fetch(`/api/whale?address=${walletAddress}&type=activity`, {
                cache: 'no-store',
            });

            if (!response.ok) {
                setIsConnected(false);
                return;
            }

            setIsConnected(true);
            const data = await response.json();

            // Check for new trades
            if (data.trades && data.trades.length > 0) {
                const latestTrade = data.trades[0];
                const tradeId = latestTrade.id || `${latestTrade.timestamp}-${latestTrade.outcome}`;

                // Only trigger if this is a new trade
                if (tradeId !== lastTradeIdRef.current) {
                    lastTradeIdRef.current = tradeId;

                    const trade: WhaleTrade = {
                        id: tradeId,
                        side: (latestTrade.side || 'BUY').toUpperCase() as 'BUY' | 'SELL',
                        outcome: latestTrade.outcome || latestTrade.market?.question || 'Unknown',
                        price: parseFloat(latestTrade.price || '0'),
                        size: parseFloat(latestTrade.size || latestTrade.amount || '0'),
                        timestamp: new Date(latestTrade.timestamp || Date.now()),
                        market: latestTrade.market?.question,
                        assetId: latestTrade.asset_id,
                    };

                    console.log('[WhaleTracker] 🐋 New trade detected:', trade);
                    setLastTrade(trade);
                    onTradeRef.current?.(trade);
                }
            }
        } catch (error) {
            console.error('[WhaleTracker] Poll error:', error);
            setIsConnected(false);
        }
    }, [walletAddress, enabled]);

    // Separate effect for connection status management based on 'enabled'
    useEffect(() => {
        if (!enabled && isConnected) {
            const timeout = setTimeout(() => setIsConnected(false), 0);
            return () => clearTimeout(timeout);
        }
    }, [enabled, isConnected]);

    useEffect(() => {
        if (!enabled) return;

        console.log(`[WhaleTracker] Starting fast polling (${pollInterval}ms) for ${walletAddress}`);

        // Initial poll
        const timeout = setTimeout(() => pollTrades(), 0);

        // Set up fast polling
        const timer = setInterval(pollTrades, pollInterval);
        pollIntervalRef.current = timer;

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [pollTrades, pollInterval, enabled, walletAddress]);

    return {
        isConnected,
        lastTrade,
    };
}
