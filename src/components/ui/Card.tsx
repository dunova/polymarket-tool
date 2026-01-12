import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'compact';
    noPadding?: boolean;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: ReactNode;
    action?: ReactNode;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    noPadding?: boolean;
}

export function Card({
    children,
    variant = 'default',
    noPadding = false,
    className = '',
    ...props
}: CardProps) {
    const variantClass = variant === 'elevated' ? 'panel-elevated' : 'panel';
    const paddingClass = noPadding ? '' : 'p-4';

    return (
        <div className={`${variantClass} ${paddingClass} ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, action, className = '', ...props }: CardHeaderProps) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
            <div>
                <h3 className="text-sm text-[var(--text-primary)]">{title}</h3>
                {subtitle && (
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</div>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export function CardContent({ children, noPadding = false, className = '', ...props }: CardContentProps) {
    return (
        <div className={`${noPadding ? '' : 'pt-2'} ${className}`} {...props}>
            {children}
        </div>
    );
}
