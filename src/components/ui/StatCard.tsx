import { HTMLAttributes, ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, change, changeLabel, icon, trend, className = '', ...props }: StatCardProps) {
    const getTrendColor = () => {
        if (trend === 'up') return 'text-[var(--success)]';
        if (trend === 'down') return 'text-[var(--danger)]';
        return 'text-[var(--text-muted)]';
    };

    const getTrendIcon = () => {
        if (trend === 'up') return '↑';
        if (trend === 'down') return '↓';
        return '→';
    };

    return (
        <Card className={className} {...props}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="stat-label mb-1">{label}</p>
                    <p className="stat-value">{value}</p>
                    {change !== undefined && (
                        <p className={`text-sm mt-1 ${getTrendColor()}`}>
                            {getTrendIcon()} {change > 0 ? '+' : ''}{change}%
                            {changeLabel && <span className="text-[var(--text-muted)] ml-1">{changeLabel}</span>}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="p-2 rounded-lg bg-[var(--surface)] text-[var(--primary)]">
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}
