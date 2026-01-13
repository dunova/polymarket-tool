'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid } from 'recharts';

interface TraderData {
    address: string;
    shortAddress: string;
    basicStats: {
        totalTrades: number;
        totalVolume: string;
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
    recentTrades: any[];
    entryExitMap?: { entry: number; exit: number; profit: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-white font-bold text-sm">{label}</p>
                {payload.map((entry: any, index: number) => (
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

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 p-6 lg:p-10 pt-20">
            {/* Header */}
            <header className="mb-8">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold block mb-2">交易员策略逆向工程</span>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                    {data.shortAddress} <span className="text-blue-500">策略分析</span>
                </h1>
                <p className="text-slate-400 mt-2 font-mono text-xs">{data.address}</p>
            </header>

            {/* Strategy Summary */}
            <section className="mb-12 bg-gradient-to-r from-blue-950/50 to-purple-950/50 p-6 rounded-2xl border border-blue-500/20">
                <h2 className="text-xl font-bold text-white mb-4">🎯 {data.strategy.type}</h2>
                <p className="text-slate-300 mb-4">{data.strategy.description}</p>

                <div className="grid md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-mono text-blue-400">${data.basicStats.totalVolume}</div>
                        <div className="text-xs text-slate-500">总交易量</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-mono text-emerald-400">{data.priceDistribution.avgBuyPrice}%</div>
                        <div className="text-xs text-slate-500">平均入场价</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-mono text-orange-400">{data.priceDistribution.avgSellPrice}%</div>
                        <div className="text-xs text-slate-500">平均卖出价</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-mono text-purple-400">+{data.priceDistribution.profitSpread}%</div>
                        <div className="text-xs text-slate-500">利润空间</div>
                    </div>
                </div>
            </section>

            {/* Decision Rules */}
            <section className="mb-12 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-lg font-bold text-cyan-400 mb-4">🌳 决策规则</h2>
                <div className="space-y-3">
                    {data.strategy.decisionRules.map((rule, i) => (
                        <p key={i} className="text-sm text-slate-300 flex items-start gap-3">
                            <span className="text-cyan-400 font-mono">{i + 1}</span>
                            <span>{rule}</span>
                        </p>
                    ))}
                </div>
            </section>

            {/* Buy/Sell Patterns */}
            <section className="mb-12">
                <h2 className="text-lg font-bold text-white mb-6">📊 买卖决策模式</h2>
                <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30 text-center">
                        <div className="text-3xl font-mono text-blue-400">{data.buySellPatterns.batchBuyRate}%</div>
                        <div className="text-xs text-slate-400 mt-1">分批买入率</div>
                    </div>
                    <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/30 text-center">
                        <div className="text-3xl font-mono text-orange-400">{data.buySellPatterns.holdToExpiryRate}%</div>
                        <div className="text-xs text-slate-400 mt-1">持有到期率</div>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-center">
                        <div className="text-3xl font-mono text-emerald-400">{data.buySellPatterns.earlyExitRate}%</div>
                        <div className="text-xs text-slate-400 mt-1">提前卖出率</div>
                    </div>
                    <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 text-center">
                        <div className="text-3xl font-mono text-purple-400">{data.basicStats.buyToSellRatio}:1</div>
                        <div className="text-xs text-slate-400 mt-1">买卖比</div>
                    </div>
                </div>
            </section>

            {/* Timeline Analysis */}
            <section className="mb-12 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-lg font-bold text-cyan-400 mb-2">⏰ 交易时间分布</h2>
                <p className="text-xs text-slate-500 mb-6">
                    {data.marketFocus.topMarket === 'weather'
                        ? '天气市场：峰值温度通常在当地14:00出现，之后确定性大增'
                        : data.marketFocus.topMarket === 'other' && data.recentTrades.some(t => t.title?.toLowerCase().includes('elon') || t.title?.toLowerCase().includes('tweet'))
                            ? 'Elon推文市场：周期结算前是主要交易窗口'
                            : '按UTC小时统计的交易分布'}
                </p>

                {/* Universal Phase Timeline */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                        <h3 className="text-sm font-bold text-blue-400 mb-2">
                            {data.marketFocus.topMarket === 'weather' ? '☀️ 观察期' : '📊 前期'}
                        </h3>
                        <div className="text-xs text-slate-400">
                            {data.marketFocus.topMarket === 'weather'
                                ? '当地 00:00-14:00 / 峰值未定'
                                : '距结算 >48h'}
                        </div>
                        <div className="mt-3 flex justify-between text-sm">
                            <span className="text-blue-300">{totalPhaseTradesB > 0 ? ((data.timelineAnalysis.phases.before_peak.buys / totalPhaseTradesB) * 100).toFixed(0) : 0}% 买入</span>
                            <span className="text-orange-300">{totalPhaseTradesS > 0 ? ((data.timelineAnalysis.phases.before_peak.sells / totalPhaseTradesS) * 100).toFixed(0) : 0}% 卖出</span>
                        </div>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                        <h3 className="text-sm font-bold text-emerald-400 mb-2">
                            {data.marketFocus.topMarket === 'weather' ? '🌡️ 黄金窗口' : '🎯 主力期'}
                        </h3>
                        <div className="text-xs text-slate-400">
                            {data.marketFocus.topMarket === 'weather'
                                ? '当地 14:00-18:00 / 峰值已定'
                                : '距结算 24-48h'}
                        </div>
                        <div className="mt-3 flex justify-between text-sm">
                            <span className="text-blue-300">{totalPhaseTradesB > 0 ? ((data.timelineAnalysis.phases.after_peak.buys / totalPhaseTradesB) * 100).toFixed(0) : 0}% 买入</span>
                            <span className="text-orange-300">{totalPhaseTradesS > 0 ? ((data.timelineAnalysis.phases.after_peak.sells / totalPhaseTradesS) * 100).toFixed(0) : 0}% 卖出</span>
                        </div>
                    </div>
                    <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/30">
                        <h3 className="text-sm font-bold text-orange-400 mb-2">
                            {data.marketFocus.topMarket === 'weather' ? '🌙 收割期' : '⚡ 结算前'}
                        </h3>
                        <div className="text-xs text-slate-400">
                            {data.marketFocus.topMarket === 'weather'
                                ? '当地 18:00-24:00 / 结算临近'
                                : '距结算 <24h'}
                        </div>
                        <div className="mt-3 flex justify-between text-sm">
                            <span className="text-blue-300">{totalPhaseTradesB > 0 ? ((data.timelineAnalysis.phases.evening.buys / totalPhaseTradesB) * 100).toFixed(0) : 0}% 买入</span>
                            <span className="text-orange-300">{totalPhaseTradesS > 0 ? ((data.timelineAnalysis.phases.evening.sells / totalPhaseTradesS) * 100).toFixed(0) : 0}% 卖出</span>
                        </div>
                    </div>
                </div>

                {/* Hour Distribution Chart */}
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.timelineAnalysis.hourDistribution}>
                            <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickFormatter={(v) => `${v}h`} />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="buys" fill="#3b82f6" name="买入" />
                            <Bar dataKey="sells" fill="#f97316" name="卖出" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-slate-500 mt-2">
                    {data.marketFocus.topMarket === 'weather'
                        ? '提示：X轴为UTC时间，天气市场需转换为当地时间分析'
                        : '提示：X轴为UTC时间（小时）'}
                </div>
            </section>


            {/* Charts Row */}
            <section className="mb-12 grid md:grid-cols-2 gap-6">
                {/* Market Focus Pie */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">市场聚焦</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={marketData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label>
                                    {marketData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center text-sm text-slate-400 mt-2">
                        主要市场: <span className="text-white font-bold">{data.marketFocus.topMarket.toUpperCase()}</span> ({data.marketFocus.topMarketPct}%)
                    </div>
                </div>

                {/* Price Distribution */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">入场价格阶梯分布 (5% 间隔)</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priceData}>
                                <XAxis dataKey="name" stroke="#475569" fontSize={9} interval={1} />
                                <YAxis stroke="#475569" fontSize={10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value">
                                    {priceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* Entry vs Exit Profit Flow */}
            <section className="mb-12 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white">🚀 盈亏流转图谱 (Entry vs Exit)</h2>
                    <div className="text-xs text-slate-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>盈利
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mr-1"></span>亏损
                    </div>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                type="number"
                                dataKey="entry"
                                name="平均入场价"
                                unit="%"
                                domain={[0, 100]}
                                stroke="#94a3b8"
                                fontSize={10}
                                label={{ value: '平均入场价 (%)', position: 'bottom', offset: 0, fill: '#64748b', fontSize: 10 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="exit"
                                name="卖出价"
                                unit="%"
                                domain={[0, 100]}
                                stroke="#94a3b8"
                                fontSize={10}
                                label={{ value: '卖出价 (%)', angle: -90, position: 'left', offset: 0, fill: '#64748b', fontSize: 10 }}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                                <p className="text-slate-300 text-xs mb-1">交易详情</p>
                                                <p className="text-emerald-400 text-sm">入场: {data.entry.toFixed(1)}%</p>
                                                <p className="text-orange-400 text-sm">卖出: {data.exit.toFixed(1)}%</p>
                                                <p className={`text-sm font-bold ${data.profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    盈亏: {data.profit > 0 ? '+' : ''}{data.profit.toFixed(1)}%
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            {/* Reference Line for Break-even */}
                            <Scatter name="Profitable" data={data.entryExitMap?.filter((d: any) => d.profit > 0) || []} fill="#10b981" />
                            <Scatter name="Loss" data={data.entryExitMap?.filter((d: any) => d.profit <= 0) || []} fill="#ef4444" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-slate-500 mt-2">
                    位于对角线左上方的点代表<span className="text-emerald-500">盈利交易</span> (卖出价 &gt; 入场价)
                </div>
            </section>

            {/* City Distribution */}
            {data.cityDistribution.length > 0 && (
                <section className="mb-12 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">城市分布</h3>
                    <div className="grid md:grid-cols-4 gap-3">
                        {data.cityDistribution.slice(0, 8).map((city) => (
                            <div key={city.city} className="bg-slate-800/50 p-3 rounded-lg text-center">
                                <div className="text-sm text-white font-bold">{city.city}</div>
                                <div className="text-xs text-slate-400">{city.trades} 笔 / ${city.volume.toFixed(0)}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Raw Trades */}
            <section className="mb-12">
                <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="text-sm text-slate-400 hover:text-white transition-colors mb-4"
                >
                    {showRawData ? '▼ 收起原始数据' : '▶ 展开原始数据 (最近50笔)'}
                </button>

                {showRawData && (
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-800/50 text-slate-400">
                                <tr>
                                    <th className="py-2 px-3 text-left">市场</th>
                                    <th className="py-2 px-3">方向</th>
                                    <th className="py-2 px-3">价格</th>
                                    <th className="py-2 px-3">金额</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentTrades.map((trade, i) => (
                                    <tr key={i} className="border-t border-slate-800/50">
                                        <td className="py-2 px-3 text-slate-300 max-w-[300px] truncate">{trade.title}</td>
                                        <td className={`py-2 px-3 text-center ${trade.side === 'BUY' ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {trade.side === 'BUY' ? '买入' : '卖出'}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono">{(trade.price * 100).toFixed(1)}%</td>
                                        <td className="py-2 px-3 text-center font-mono">${trade.size.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
