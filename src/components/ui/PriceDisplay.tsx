'use client';

import { useEffect, useRef, useState } from 'react';

interface PriceDisplayProps {
    value: number;
    precision?: number;
    prefix?: string;
    suffix?: string;
    showChange?: boolean;
    previousValue?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function PriceDisplay({
    value,
    precision = 2,
    prefix = '',
    suffix = '',
    showChange = false,
    previousValue,
    size = 'md',
    className = '',
}: PriceDisplayProps) {
    const [flashClass, setFlashClass] = useState('');
    const prevValueRef = useRef<number>(value);

    useEffect(() => {
        if (value !== prevValueRef.current) {
            const isUp = value > prevValueRef.current;
            setFlashClass(isUp ? 'flash-up' : 'flash-down');
            const timer = setTimeout(() => setFlashClass(''), 500);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    const change = previousValue !== undefined ? value - previousValue : 0;
    const changePercent = previousValue && previousValue !== 0
        ? ((value - previousValue) / previousValue) * 100
        : 0;

    const trendClass = change > 0 ? 'price-up' : change < 0 ? 'price-down' : 'price-neutral';

    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
    };

    return (
        <span className={`price ${sizeClasses[size]} ${flashClass} ${className}`}>
            {prefix}{value.toFixed(precision)}{suffix}
            {showChange && change !== 0 && (
                <span className={`ml-2 text-xs ${trendClass}`}>
                    {change > 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
                </span>
            )}
        </span>
    );
}
