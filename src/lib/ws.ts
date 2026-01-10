// WebSocket client for real-time Polymarket data

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

type MessageHandler = (data: WebSocketMessage) => void;

export interface WebSocketMessage {
    event_type: string;
    asset_id?: string;
    market?: string;
    price?: string;
    side?: string;
    size?: string;
    timestamp?: number;
}

export class PolymarketWebSocket {
    private ws: WebSocket | null = null;
    private subscriptions: Set<string> = new Set();
    private messageHandlers: Set<MessageHandler> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                // Resubscribe to all assets
                this.subscriptions.forEach(assetId => {
                    this.sendSubscribe(assetId);
                });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessage;
                    this.messageHandlers.forEach(handler => handler(data));
                } catch (e) {
                    console.warn('Failed to parse WS message:', e);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    private sendSubscribe(assetId: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const msg = {
                type: 'subscribe',
                channel: 'market',
                assets_ids: [assetId],
            };
            this.ws.send(JSON.stringify(msg));
        }
    }

    subscribe(assetIds: string[]) {
        assetIds.forEach(id => {
            if (!this.subscriptions.has(id)) {
                this.subscriptions.add(id);
                this.sendSubscribe(id);
            }
        });
    }

    unsubscribe(assetId: string) {
        this.subscriptions.delete(assetId);
        if (this.ws?.readyState === WebSocket.OPEN) {
            const msg = {
                type: 'unsubscribe',
                channel: 'market',
                assets_ids: [assetId],
            };
            this.ws.send(JSON.stringify(msg));
        }
    }

    onMessage(handler: MessageHandler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
            console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.messageHandlers.clear();
    }
}

// Singleton instance
let wsInstance: PolymarketWebSocket | null = null;

export function getWebSocket(): PolymarketWebSocket {
    if (!wsInstance) {
        wsInstance = new PolymarketWebSocket();
    }
    return wsInstance;
}
