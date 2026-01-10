import { ReactNode, forwardRef, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    glow?: 'none' | 'primary' | 'success' | 'danger';
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

const glowClasses = {
    none: '',
    primary: 'glow-primary',
    success: 'glow-success',
    danger: 'glow-danger',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ children, variant = 'default', padding = 'md', glow = 'none', className = '', ...props }, ref) => {
        const baseClasses = 'glass-card rounded-2xl';
        const variantClasses = variant === 'interactive' ? 'glass-card-hover cursor-pointer' : '';

        return (
            <div
                ref={ref}
                className={`${baseClasses} ${variantClasses} ${paddingClasses[padding]} ${glowClasses[glow]} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className = '', ...props }: CardHeaderProps) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
            <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}
