import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: ReactNode;
}

const variantClasses = {
    primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-slate-900 font-semibold',
    secondary: 'bg-transparent border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--text-muted)] text-[var(--text-primary)]',
    success: 'bg-[var(--success)] hover:opacity-90 text-white',
    danger: 'bg-[var(--danger)] hover:opacity-90 text-white',
    ghost: 'bg-transparent hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant = 'primary', size = 'md', loading = false, icon, className = '', disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-200 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
                {...props}
            >
                {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : icon}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
