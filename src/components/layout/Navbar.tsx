'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/elon', label: 'Elon Terminal', icon: '🐦' },
    { href: '/btc', label: 'BTC Strategy', icon: '₿' },
    { href: '/trader', label: 'Trader Analyzer', icon: '🔍' },
    { href: '/monitor', label: 'Market Monitor', icon: '📊' },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="fixed top-4 left-4 right-4 z-50">
            <div className="glass-card px-6 py-3 flex items-center justify-between max-w-7xl mx-auto">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-lg font-bold text-slate-900">
                        PM
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                        Polymarket Tools
                    </span>
                </Link>

                {/* Navigation */}
                <div className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                                        ? 'bg-[var(--primary)] text-slate-900'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                                    }
                `}
                            >
                                <span className="mr-1.5">{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                    <span className="text-xs text-[var(--text-muted)]">Live</span>
                </div>
            </div>
        </nav>
    );
}
