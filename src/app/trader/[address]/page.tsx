'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid } from 'recharts';

interface TraderData {
    address: string;
    shortAddress: string;
    profile: {
        username: string;
        bio: string;
        profileImage: string;
        joined: string;
        views: number;
        biggestWin: number;
        predictions: number;
        positionsValue: number;
        allTimePnL: number;
        twitterUsername: string;
    };
    basicStats: {
        totalTrades: number;
        totalVolume: string;
        totalPnL: string;
        totalBuys: number;
        totalSells: number;
        buyToSellRatio: string;
        totalEvents: number;
    };
    marketFocus: {
        types: Record<string, number>;
        topMarket: string;
        topMarketPct: string;
    };
    priceDistribution: {
        buckets: Record<string, number>;
        avgBuyPrice: string;
        avgSellPrice: string;
        profitSpread: string;
    };
    buySellPatterns: {
        batchBuyRate: string;
        holdToExpiryRate: string;
        earlyExitRate: string;
        avgBuyPrice: string;
        avgSellPrice: string;
        profitSpread: string;
    };
    timelineAnalysis: {
        phases: {
            before_peak: { buys: number; sells: number };
            after_peak: { buys: number; sells: number };
            evening: { buys: number; sells: number };
        };
        hourDistribution: { hour: number; buys: number; sells: number }[];
    };
    cityDistribution: { city: string; trades: number; volume: number }[];
    strategy: {
        type: string;
        description: string;
        decisionRules: string[];
    };
    recentTrades: {
        time: string;
        market: string;
        title: string;
        side: string;
        price: number;
        size: number;
        timestamp: number;
        outcome: string;
    }[];
    pnlHistory?: { time: number; value: number; date: string }[];
    entryExitMap?: { entry: number; exit: number; profit: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: string | number; color?: string; fill?: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-white font-bold text-sm">{label}</p>
                {payload.map((entry, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function TraderAnalysisPage() {
    const params = useParams();
    const address = params.address as string;
    const [data, setData] = useState<TraderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRawData, setShowRawData] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/trader-analysis?address=${address}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const json = await res.json();
                setData(json);
            } catch (e) {
                setError('无法获取交易员数据');
            } finally {
                setLoading(false);
            }
        }
        if (address) fetchData();
    }, [address]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center pt-14">
                <div className="text-center">
                    <div className="text-6xl mb-6 animate-pulse">🔬</div>
                    <div className="text-xl font-bold text-blue-400">正在分析交易基因图谱...</div>
                    <div className="text-sm text-slate-500 mt-2 font-mono">{address}</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center pt-14">
                <div className="text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <div className="text-xl text-red-400">{error || '数据加载失败'}</div>
                </div>
            </div>
        );
    }

    const marketData = Object.entries(data.marketFocus.types)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name: name.toUpperCase(), value }));

    // Price buckets with gradient colors
    const priceData = Object.entries(data.priceDistribution.buckets).map(([name, value], i) => ({
        name,
        value,
        fill: `hsl(${150 - (i * 7)}, 70%, 50%)` // Dynamic color from Green (low price) to Red (high price)
    }));

    const totalPhaseTradesB = data.timelineAnalysis.phases.before_peak.buys +
        data.timelineAnalysis.phases.after_peak.buys +
        data.timelineAnalysis.phases.evening.buys;
    const totalPhaseTradesS = data.timelineAnalysis.phases.before_peak.sells +
        data.timelineAnalysis.phases.after_peak.sells +
        data.timelineAnalysis.phases.evening.sells;

    const marketInsights = {
        weather: {
            title: "🌡️ 天气套利分析框架",
            tips: [
                "14:00 (当地) 是交易的生死线，观察该时刻前后的仓位变化。",
                "核心逻辑：在峰值未定前的低价期（<15%）建仓，博弈正态分布的尾部偏差。",
                "关键指标：城市时区偏移与 UTC 交易时间的同步率。"
            ]
        },
        crypto: {
            title: "₿ BTC 区间统计框架",
            tips: [
                "策略识别：概率收割 (Probability Harvesting) - 买入极端偏离区间的 No。",
                "核心逻辑：利用市场定价对极端事件的过度恐惧，赚取赔率偏差。",
                "关键指标：隐含概率 vs 理论概率 (CDF 模型) 的分歧度。"
            ]
        },
        'elon/tweet': {
            title: "🐦 推文计数博弈框架",
            tips: [
                "策略识别：矩阵覆盖 (Range Pinning) - 同时押注多个计数区间。",
                "核心逻辑：寻找价格之和 < 1 的区间组合，构建概率套利矩阵。",
                "关键指标：结算窗口（UTC 00:00）前的抢跑行为分析。"
            ]
        }
    };

    const currentInsight = marketInsights[data.marketFocus.topMarket as keyof typeof marketInsights];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 p-6 lg:p-10 pt-20 selection:bg-blue-500/30">
            {/* Header */}
            <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <span className="text-[10px] text-blue-500 uppercase tracking-[0.4em] font-black block mb-3 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                            Polymarket Intelligence / 策略逆向工程
                        </span>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">
                            {data.profile.username !== 'Unknown' ? data.profile.username : data.shortAddress} <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">战略图谱</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-4">
                            <p className="text-slate-500 font-mono text-xs bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
                                {data.address}
                            </p>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Intelligence</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Profile Overview - Compact Single Row (Polymarket Style) */}
            <section className="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-8 shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Left: Avatar + Identity */}
                    <div className="flex items-center gap-4 lg:min-w-[280px]">
                        <div className="w-14 h-14 rounded-full border-2 border-blue-500/50 p-0.5 bg-slate-900 overflow-hidden flex-shrink-0">
                            {data.profile.profileImage ? (
                                <img src={data.profile.profileImage} alt="profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xl font-black">
                                    {data.profile.username[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-white">{data.profile.username}</h2>
                                {data.profile.twitterUsername && (
                                    <a href={`https://x.com/${data.profile.twitterUsername}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                    </a>
                                )}
                                <button className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors text-xs">🎁</button>
                                <a href={`https://polymarket.com/profile/${data.address}`} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 transition-colors text-xs">↗️</a>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Joined {data.profile.joined} · {data.profile.views >= 1000 ? `${(data.profile.views / 1000).toFixed(1)}k` : data.profile.views} views</p>
                        </div>
                    </div>

                    {/* Middle: Stats Row */}
                    <div className="flex items-center gap-6 lg:gap-10 border-l border-slate-700/50 pl-6">
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Positions Value</div>
                            <div className="text-lg font-black text-white font-mono">${data.profile.positionsValue.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Biggest Win</div>
                            <div className="text-lg font-black text-white font-mono">${typeof data.profile.biggestWin === 'number' ? data.profile.biggestWin.toLocaleString() : data.profile.biggestWin}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Predictions</div>
                            <div className="text-lg font-black text-white font-mono">{data.profile.predictions.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Right: PnL + Sparkline */}
                    <div className="flex-1 flex items-center gap-4 border-l border-slate-700/50 pl-6 min-w-0">
                        <div className="flex-shrink-0">
                            <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                <span>▲</span> Profit/Loss
                            </div>
                            <div className="text-2xl font-black text-white font-mono tabular-nums">
                                ${typeof data.profile.allTimePnL === 'number' ? data.profile.allTimePnL.toLocaleString() : data.profile.allTimePnL}
                            </div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">All-Time</p>
                        </div>
                        <div className="flex-1 h-16 min-w-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <XAxis dataKey="time" type="number" hide domain={['auto', 'auto']} />
                                    <YAxis dataKey="value" type="number" hide domain={['auto', 'auto']} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900/90 border border-white/10 p-2 rounded-lg backdrop-blur-md shadow-xl">
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{d.date}</p>
                                                        <p className="text-sm font-black text-emerald-400">${d.value?.toLocaleString()}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter
                                        data={data.pnlHistory || []}
                                        line={{ stroke: '#10b981', strokeWidth: 2, strokeLinecap: 'round' }}
                                        shape={<g></g>}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex bg-slate-800/50 p-0.5 rounded gap-0.5 flex-shrink-0">
                            {['1D', '1W', '1M', 'ALL'].map(p => (
                                <button key={p} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${p === 'ALL' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Strategy & Insights */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Strategy Master Card */}
                    <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-blue-500/15 transition-colors" />

                        <div className="relative">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-tighter rounded-md border border-blue-500/30">
                                    Final Conclusion
                                </span>
                            </div>
                            <h2 className="text-2xl lg:text-3xl font-black text-white mb-4">🎯 {data.strategy.type}</h2>
                            <p className="text-slate-400 leading-relaxed text-lg max-w-3xl">{data.strategy.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
                                <div className="space-y-1">
                                    <div className={`text-3xl font-black font-mono tracking-tighter ${parseFloat(data.basicStats.totalPnL || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {parseFloat(data.basicStats.totalPnL || '0') >= 0 ? '+' : ''}${data.basicStats.totalPnL || '0'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">总利润 (PnL)</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-black font-mono tracking-tighter text-blue-400">${data.basicStats.totalVolume}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">总交易量</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-black font-mono tracking-tighter text-emerald-400">{data.priceDistribution.avgBuyPrice}%</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">平均买入价</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-3xl font-black font-mono tracking-tighter text-orange-400">{data.priceDistribution.avgSellPrice}%</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">平均卖出价</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Framework Specific Insights */}
                    {currentInsight && (
                        <section className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 tint-blue">
                                {currentInsight.title}
                            </h3>
                            <div className="grid md:grid-cols-3 gap-6">
                                {currentInsight.tips.map((tip, i) => (
                                    <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-colors">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 mb-3 border border-blue-500/30">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                            {tip}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Entry vs Exit Profit Flow */}
                    <section className="bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-xl font-black text-white tracking-tight">🚀 盈亏流转图谱 <span className="text-slate-600 font-mono text-xs ml-3 tracking-normal">(Entry vs Exit)</span></h2>
                            <div className="flex gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Profit</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Loss</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-80 w-full cursor-crosshair">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        type="number"
                                        dataKey="entry"
                                        name="Entry"
                                        unit="%"
                                        domain={[0, 100]}
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="exit"
                                        name="Exit"
                                        unit="%"
                                        domain={[0, 100]}
                                        stroke="#475569"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Position Insight</div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between gap-8 text-xs">
                                                                <span className="text-slate-400">Entry Level:</span>
                                                                <span className="text-white font-mono font-bold">{d.entry.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="flex justify-between gap-8 text-xs">
                                                                <span className="text-slate-400">Exit Level:</span>
                                                                <span className="text-white font-mono font-bold">{d.exit.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="flex justify-between gap-8 text-xs pt-1 border-t border-white/5">
                                                                <span className="text-slate-400">Net Return:</span>
                                                                <span className={`font-mono font-bold ${d.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {d.profit > 0 ? '+' : ''}{d.profit.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter name="Profitable" data={data.entryExitMap?.filter((d: { profit: number }) => d.profit > 0) || []} fill="#10b981" fillOpacity={0.6} stroke="#10b981" />
                                    <Scatter name="Loss" data={data.entryExitMap?.filter((d: { profit: number }) => d.profit <= 0) || []} fill="#ef4444" fillOpacity={0.6} stroke="#ef4444" />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                </div>

                {/* Right Column: Patterns & Data */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Market DNA Card */}
                    <section className="bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Market DNA / 偏好分布</h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={marketData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} stroke="none" paddingAngle={4}>
                                        {marketData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 space-y-3">
                            {marketData.map((m, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-tight">{m.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">{m.value} Trades</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Timeline Flow */}
                    <section className="bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Trade Rhythm / 交易节奏</h3>
                        <div className="h-48 mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.timelineAnalysis.hourDistribution}>
                                    <XAxis dataKey="hour" hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="buys" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="sells" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Hold Expiry</div>
                                <div className="text-xl font-black text-white">{data.buySellPatterns.holdToExpiryRate}%</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Batch Buy Rate</div>
                                <div className="text-xl font-black text-white">{data.buySellPatterns.batchBuyRate}%</div>
                            </div>
                        </div>
                    </section>

                    {/* Decision rules tree-style */}
                    <section className="bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">Logic Tree / 策略树</h3>
                        <div className="space-y-6 relative">
                            {data.strategy.decisionRules.map((rule, i) => (
                                <div key={i} className="flex gap-4 group relative">
                                    <div className="flex flex-col items-center">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] text-blue-400 font-black relative z-10 transition-transform group-hover:scale-110 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                            {i + 1}
                                        </div>
                                        {i < data.strategy.decisionRules.length - 1 && (
                                            <div className="w-px h-full bg-gradient-to-b from-blue-500/40 to-transparent my-1" />
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-300 font-medium leading-relaxed pb-4 group-hover:text-blue-300 transition-colors">
                                        {rule}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>
            </div>

            {/* City Distribution (Wide) */}
            {data.cityDistribution.length > 0 && (
                <section className="mt-8 bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-8">City Affinity / 城市偏好</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {data.cityDistribution.map((city) => (
                            <div key={city.city} className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group">
                                <div className="text-sm text-white font-black mb-1 group-hover:text-emerald-400 transition-colors">{city.city}</div>
                                <div className="text-[10px] text-slate-500 font-bold font-mono tracking-tight">{city.trades} Trades / ${city.volume.toFixed(0)}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Raw Trades - Sleek Drawer */}
            <section className="mt-8">
                <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="group bg-slate-900/60 px-6 py-4 rounded-3xl border border-white/5 text-sm font-bold text-slate-500 hover:text-white hover:border-white/10 transition-all flex items-center gap-3 backdrop-blur-md"
                >
                    <span className={`transition-transform duration-300 ${showRawData ? 'rotate-180' : ''}`}>▼</span>
                    <span>{showRawData ? 'Hide Audit Log' : 'View Full Transaction Audit Log'}</span>
                </button>

                {showRawData && (
                    <div className="mt-4 bg-slate-900/80 rounded-3xl border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="py-4 px-6">Market Instrument</th>
                                        <th className="py-4 px-6 text-center">Operation</th>
                                        <th className="py-4 px-6 text-center">Execution Price</th>
                                        <th className="py-4 px-6 text-right">Volume (USDC)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {data.recentTrades.map((trade, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-6 text-xs text-white font-medium max-w-[400px] truncate">{trade.title}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${trade.side === 'BUY' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                                    {trade.side === 'BUY' ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center text-xs font-mono text-slate-300">{(trade.price * 100).toFixed(1)}%</td>
                                            <td className="py-4 px-6 text-right text-xs font-mono text-white font-bold">${trade.size.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <footer className="mt-16 text-center">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">Polymarket Reverse Engineering Terminal / V2.1.0-ULTRA</p>
            </footer>
        </div>
    );
}
