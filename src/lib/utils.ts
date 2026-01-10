// Utility functions

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

// Simple classnames utility (no external dependency)
export function cn(...inputs: ClassValue[]): string {
    return inputs.flat().filter(Boolean).join(' ');
}

// Throttle function for high-frequency updates
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return function (this: unknown, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Format number as price
export function formatPrice(value: number, decimals = 1): string {
    return (value * 100).toFixed(decimals) + '¢';
}

// Format number as percentage
export function formatPercent(value: number, decimals = 1): string {
    return (value * 100).toFixed(decimals) + '%';
}

// Format large numbers
export function formatNumber(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return value.toString();
}

// Get CST (Chicago) time
export function getCSTDate(): { now: Date; cstHour: number } {
    const now = new Date();
    const cstString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const cstDate = new Date(cstString);
    return {
        now: cstDate,
        cstHour: cstDate.getHours(),
    };
}

// Calculate time remaining
export function getTimeRemaining(endTime: Date): { hours: number; minutes: number; formatted: string } {
    const diff = endTime.getTime() - Date.now();
    const hours = Math.max(0, diff / (1000 * 60 * 60));
    const minutes = Math.max(0, (diff % (1000 * 60 * 60)) / (1000 * 60));

    return {
        hours,
        minutes,
        formatted: `${Math.floor(hours)}h ${Math.floor(minutes)}m`,
    };
}

// Sleep detection for Elon tweet prediction
export function getMuskStatus(cstHour: number): { status: string; cssClass: string; icon: string } {
    if (cstHour >= 2 && cstHour < 8) {
        return { status: 'Deep Sleep', cssClass: 'text-blue-400', icon: '💤' };
    } else if (cstHour >= 8 && cstHour < 11) {
        return { status: 'Waking Up', cssClass: 'text-amber-400', icon: '🌅' };
    } else if (cstHour >= 11 && cstHour < 18) {
        return { status: 'Active', cssClass: 'text-green-400', icon: '☀️' };
    } else {
        return { status: 'Peak Activity', cssClass: 'text-orange-400', icon: '🔥' };
    }
}
