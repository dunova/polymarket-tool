import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'accent' | 'outline';
    children: React.ReactNode;
}

export function Badge({
    variant = 'default',
    children,
    className = '',
    ...props
}: BadgeProps) {
    const variantClass = `badge-${variant}`;

    return (
        <span className={`badge ${variantClass} ${className}`} {...props}>
            {children}
        </span>
    );
}
