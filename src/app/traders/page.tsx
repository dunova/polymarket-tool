'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const traders = [
    {
        name: 'Neobrother',
        address: '0x6297b93ea37ff92a57fd636410f3b71ebf74517e',
        href: '/neobrother',
        strategy: '低价抄底 + 高频卖出',
        focus: '天气市场 98%+',
        stats: { winRate: '~70%', avgProfit: '+7.7%', holdRate: '40%' }
    },
    {
        name: '0xaa7a',
        address: '0xaa7a74b8c754e8aacc1ac2dedb699af0a3224d23',
        href: '/trader/0xaa7a74b8c754e8aacc1ac2dedb699af0a3224d23',
        strategy: '中价建仓 + 持有到期',
        focus: '天气市场 94%',
        stats: { winRate: '~60%', avgProfit: '+35.8%', holdRate: '74%' }
    },
    {
        name: 'SB911 🔥',
        address: '0xca6e9879b0a83eb471f974e159f2483c08b546f2',
        href: '/trader/0xca6e9879b0a83eb471f974e159f2483c08b546f2',
        strategy: '推文套利 + 地缘押注',
        focus: 'Elon推文 94%',
        stats: { winRate: '—', avgProfit: '+$100k', holdRate: '—' }
    },
    {
        name: '🐋 鲸鱼追踪器',
        address: 'whale-tracker',
        href: '/whale',
        strategy: '实时追踪大额交易者',
        focus: '全市场监控',
        stats: { winRate: '—', avgProfit: '—', holdRate: '—' }
    },
];

export default function TradersPage() {
    const router = useRouter();
    const [showInput, setShowInput] = useState(false);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!address.trim()) {
            setError('请输入钱包地址');
            return;
        }

        // Validate address format
        if (!address.startsWith('0x') || address.length !== 42) {
            setError('无效的钱包地址格式');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Check if data exists
            const res = await fetch(`/api/trader-analysis?address=${address}`);
            if (!res.ok) {
                throw new Error('无法获取交易数据');
            }

            // Navigate to analysis page
            router.push(`/trader/${address}`);
        } catch (e) {
            setError('无法分析该地址，请确认地址正确');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 p-6 lg:p-10 pt-20">
            <header className="mb-12">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold block mb-2">交易员策略逆向工程</span>
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
                    交易员<span className="text-blue-500">分析中心</span>
                </h1>
                <p className="text-slate-400 mt-2 font-mono text-xs">
                    选择一个交易员查看详细策略分析，或添加新地址
                </p>
            </header>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {traders.map((trader) => (
                    <Link
                        key={trader.address}
                        href={trader.href}
                        className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all hover:scale-[1.02] group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                {trader.name}
                            </h2>
                            <span className="text-xs text-slate-500 font-mono">
                                {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
                            </span>
                        </div>

                        <p className="text-sm text-slate-400 mb-4">{trader.strategy}</p>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] uppercase tracking-wider">
                                {trader.focus}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-slate-800/50 p-2 rounded-lg">
                                <div className="text-sm font-mono text-emerald-400">{trader.stats.avgProfit}</div>
                                <div className="text-[9px] text-slate-500 uppercase">利润空间</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded-lg">
                                <div className="text-sm font-mono text-blue-400">{trader.stats.holdRate}</div>
                                <div className="text-[9px] text-slate-500 uppercase">持有到期</div>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded-lg">
                                <div className="text-sm font-mono text-purple-400">{trader.stats.winRate}</div>
                                <div className="text-[9px] text-slate-500 uppercase">胜率</div>
                            </div>
                        </div>

                        <div className="mt-4 text-center text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            点击查看详细分析 →
                        </div>
                    </Link>
                ))}

                {/* Add New Trader Card */}
                <div
                    className={`border p-6 rounded-2xl flex flex-col items-center justify-center text-center min-h-[200px] transition-all cursor-pointer ${showInput
                        ? 'bg-gradient-to-b from-blue-950/50 to-slate-950 border-blue-500/50'
                        : 'bg-slate-900/30 border-dashed border-slate-700 hover:border-blue-500/30'
                        }`}
                    onClick={() => !showInput && setShowInput(true)}
                >
                    {!showInput ? (
                        <>
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl text-slate-500">+</span>
                            </div>
                            <h3 className="text-slate-400 font-bold mb-2">添加新交易员</h3>
                            <p className="text-xs text-slate-500">
                                点击输入钱包地址<br />即可生成策略分析
                            </p>
                        </>
                    ) : (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-white mb-4">🔬 生成交易员分析</h3>

                            <input
                                type="text"
                                placeholder="输入钱包地址 (0x...)"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            />

                            {error && (
                                <p className="text-red-400 text-xs mt-2">{error}</p>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin">⏳</span> 分析中...
                                        </span>
                                    ) : (
                                        '生成分析'
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowInput(false); setError(''); setAddress(''); }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    取消
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-500 mt-4">
                                提示：可以从 Polymarket 用户页面复制钱包地址
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <section className="mt-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">策略对比</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-slate-400 text-left border-b border-slate-800">
                            <tr>
                                <th className="py-3 px-4">交易员</th>
                                <th className="py-3 px-4">核心策略</th>
                                <th className="py-3 px-4">入场价</th>
                                <th className="py-3 px-4">卖出价</th>
                                <th className="py-3 px-4">利润</th>
                                <th className="py-3 px-4">持有到期</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            <tr className="border-b border-slate-800/50">
                                <td className="py-3 px-4 font-bold">Neobrother</td>
                                <td className="py-3 px-4">低价抄底 + 高频</td>
                                <td className="py-3 px-4 font-mono text-yellow-400">12.5%</td>
                                <td className="py-3 px-4 font-mono text-emerald-400">20.2%</td>
                                <td className="py-3 px-4 font-mono text-emerald-400">+7.7%</td>
                                <td className="py-3 px-4 font-mono">40%</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4 font-bold">0xaa7a</td>
                                <td className="py-3 px-4">中价建仓 + 持有</td>
                                <td className="py-3 px-4 font-mono text-yellow-400">24.4%</td>
                                <td className="py-3 px-4 font-mono text-emerald-400">60.2%</td>
                                <td className="py-3 px-4 font-mono text-emerald-400">+35.8%</td>
                                <td className="py-3 px-4 font-mono">74%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
