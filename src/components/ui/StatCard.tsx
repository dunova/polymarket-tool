import { HTMLAttributes, ReactNode } from 'react';

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon?: ReactNode;
    loading?: boolean;
}

export function StatCard({
    label,
    value,
    change,
    trend,
    icon,
    loading = false,
    className = '',
    ...props
}: StatCardProps) {
    if (loading) {
        return (
            <div className={`stat-card ${className}`} {...props}>
                <div className="skeleton h-3 w-16 mb-3" />
                <div className="skeleton h-6 w-24" />
            </div>
        );
    }

    const getChangeColor = () => {
        if (trend === 'up') return 'text-[var(--success)]';
        if (trend === 'down') return 'text-[var(--danger)]';
        return 'text-[var(--text-muted)]';
    };

    const getChangePrefix = () => {
        if (trend === 'up') return '▲';
        if (trend === 'down') return '▼';
        return '';
    };

    return (
        <div className={`stat-card ${className}`} {...props}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="stat-label">{label}</p>
                    <p className="stat-value">{value}</p>
                    {change !== undefined && (
                        <p className={`stat-change ${getChangeColor()}`}>
                            {getChangePrefix()} {change > 0 ? '+' : ''}{change.toFixed(2)}%
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="text-[var(--text-muted)]">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
