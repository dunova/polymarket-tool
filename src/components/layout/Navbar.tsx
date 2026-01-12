'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation, LanguageToggle } from '@/lib/i18n';

export function Navbar() {
    const pathname = usePathname();
    const { t } = useTranslation();
    const [time, setTime] = useState('--:--:--');

    const navItems = [
        { href: '/', label: t.nav.dashboard },
        { href: '/elon', label: t.nav.elon },
        { href: '/btc', label: t.nav.btc },
        { href: '/trader', label: t.nav.traders },
        { href: '/monitor', label: t.nav.markets },
        { href: '/london', label: t.nav.london },
        { href: '/whale', label: '鲸鱼分析' },
    ];

    useEffect(() => {
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <div className="h-full px-4 flex items-center justify-between max-w-[1800px] mx-auto">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <span className="font-[var(--font-hud)] text-sm tracking-wider text-[var(--text-primary)]">
                        POLYMARKET
                    </span>
                </Link>

                {/* Navigation Tabs */}
                <div className="hidden md:flex items-center">
                    <div className="tabs">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`tab ${isActive ? 'active' : ''}`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <LanguageToggle />

                    {/* Time */}
                    <div className="hidden sm:flex items-center gap-2 text-[var(--text-muted)] text-xs font-[var(--font-mono)]">
                        <span>{time}</span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--success-muted)]">
                        <span className="status-dot online" />
                        <span className="text-[10px] font-semibold tracking-wide uppercase text-[var(--success)]">
                            {t.common.live}
                        </span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
