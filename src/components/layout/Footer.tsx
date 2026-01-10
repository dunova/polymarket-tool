export function Footer() {
    return (
        <footer className="border-t border-[var(--border)] py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <span className="text-lg font-bold text-[var(--primary)]">PM</span>
                        <span className="text-sm">Polymarket Tools</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                        <a
                            href="https://polymarket.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--text-primary)] transition-colors"
                        >
                            Polymarket
                        </a>
                        <a
                            href="https://github.com/dunova/polymarket-tool"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--text-primary)] transition-colors"
                        >
                            GitHub
                        </a>
                    </div>

                    <p className="text-xs text-[var(--text-muted)]">
                        Built with Next.js + TypeScript
                    </p>
                </div>
            </div>
        </footer>
    );
}
