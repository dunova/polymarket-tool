'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getWebSocket, WebSocketMessage } from '@/lib/ws';

interface UseWebSocketOptions {
    assetIds: string[];
    onPriceUpdate?: (assetId: string, price: number) => void;
    enabled?: boolean;
}

export function useWebSocket({ assetIds, onPriceUpdate, enabled = true }: UseWebSocketOptions) {
    const wsRef = useRef(getWebSocket());
    const onPriceUpdateRef = useRef(onPriceUpdate);

    // Keep callback ref updated
    useEffect(() => {
        onPriceUpdateRef.current = onPriceUpdate;
    }, [onPriceUpdate]);

    const handleMessage = useCallback((data: WebSocketMessage) => {
        if (data.event_type === 'price_change' && data.asset_id && data.price) {
            const price = parseFloat(data.price);
            if (!isNaN(price) && onPriceUpdateRef.current) {
                onPriceUpdateRef.current(data.asset_id, price);
            }
        }
    }, []);

    useEffect(() => {
        if (!enabled || assetIds.length === 0) return;

        const ws = wsRef.current;
        ws.connect();

        // Subscribe to assets
        ws.subscribe(assetIds);

        // Listen for messages
        const unsubscribe = ws.onMessage(handleMessage);

        return () => {
            unsubscribe();
            // Don't disconnect - keep connection alive for other components
        };
    }, [assetIds, enabled, handleMessage]);

    return {
        subscribe: (ids: string[]) => wsRef.current.subscribe(ids),
        disconnect: () => wsRef.current.disconnect(),
    };
}
