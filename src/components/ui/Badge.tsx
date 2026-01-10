import { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple';
    size?: 'sm' | 'md';
}

const variantClasses = {
    default: 'bg-[var(--surface)] text-[var(--text-secondary)]',
    success: 'bg-[var(--success-muted)] text-[var(--success)]',
    danger: 'bg-[var(--danger-muted)] text-[var(--danger)]',
    warning: 'bg-amber-500/15 text-amber-400',
    info: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '', ...props }: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
}
