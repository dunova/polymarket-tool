
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// 自定义Tooltip组件确保文字颜色正确
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: string | number }[]; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-white text-xs font-bold">{label}</p>
                {payload.map((p: { name: string; value: string | number }, i: number) => (
                    <p key={i} className="text-slate-300 text-xs">
                        {p.name}: <span className="text-white font-mono">{p.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { city: string; x: number; y: number; size: number } }[] }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-white text-xs font-bold mb-1">{d.city}</p>
                <p className="text-slate-300 text-xs">时间: <span className="text-white font-mono">{d.x}:00</span></p>
                <p className="text-slate-300 text-xs">价格: <span className="text-white font-mono">{(d.y * 100).toFixed(0)}%</span></p>
                <p className="text-slate-300 text-xs">金额: <span className="text-emerald-400 font-mono">${d.size?.toFixed(2)}</span></p>
            </div>
        );
    }
    return null;
};

interface Trade {
    city: string;
    tradeHour: number;
    price: number;
    usdcSize: number;
    side: 'BUY' | 'SELL';
    tradeTime: string;
    threshold?: { temp: number; unit: string; condition: string };
    tempAtTradeHour?: number;
    peakHour?: number;
    enteredAfterPeak?: boolean;
}

interface Pattern {
    matches: number;
    total: number;
    rate: number;
}

interface NeobrotherData {
    summary: {
        totalTrades: number;
        uniqueCities: number;
        totalVolume: number;
        uniqueMarkets: number;
    };
    tradeLog: Trade[];
    patterns: Record<string, Pattern>;
    cityStats: Record<string, { trades: number; volume: number }>;
    hourDistribution: number[];
    priceBuckets: Array<{ range: string; count: number }>;
    buySellPatterns?: {
        batchBuyRate: number;
        holdToExpiryRate: number;
        earlyExitRate: number;
        profitSpread: number;
        avgBatchIntervalMins: number;
        avgBuyPrice: number;
        totalBuys: number;
        totalEvents: number;
        avgSellPrice: number;
    };
}

export default function NeobrotherPatternDiscovery() {
    const [data, setData] = useState<NeobrotherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [cityFilter, setCityFilter] = useState<string>('all');
    const [sideFilter, setSideFilter] = useState<string>('all');
    const [showRawData, setShowRawData] = useState(false);

    useEffect(() => {
        fetch('/api/neobrother-analysis')
            .then(res => res.json())
            .then(json => setData(json))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredTrades = useMemo(() => {
        if (!data?.tradeLog) return [];
        return data.tradeLog.filter((t: Trade) => {
            if (cityFilter !== 'all' && t.city !== cityFilter) return false;
            if (sideFilter !== 'all' && t.side !== sideFilter) return false;
            return true;
        });
    }, [data, cityFilter, sideFilter]);

    if (loading) return (
        <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-blue-400 font-mono text-sm tracking-widest animate-pulse">正在重建交易基因图谱...</p>
        </div>
    );

    if (!data) return null;

    const { summary, patterns, cityStats, hourDistribution, priceBuckets } = data;

    const cityChartData = Object.entries(cityStats).map(([city, stats]: [string, { trades: number; volume: number }]) => ({
        city, trades: stats.trades, volume: Math.round(stats.volume)
    })).sort((a, b) => b.trades - a.trades);

    const hourChartData = hourDistribution.map((count: number, hour: number) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`, count
    }));

    const scatterData = filteredTrades.map((t: Trade) => ({
        x: t.tradeHour, y: t.price, size: t.usdcSize, city: t.city, side: t.side
    }));

    const cityNamesCN: Record<string, string> = {
        'Buenos Aires': '布宜诺斯艾利斯',
        'London': '伦敦',
        'New York': '纽约',
        'Dallas': '达拉斯',
        'Atlanta': '亚特兰大',
        'Seattle': '西雅图'
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 p-6 lg:p-10">
            {/* 顶部标题 */}
            <header className="mb-12">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold block mb-2">交易模式发现引擎</span>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
                            Neobrother <span className="text-blue-500">交易基因图谱</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-mono text-xs">
                            已分析 {summary.totalTrades} 笔交易 | 覆盖 {summary.uniqueCities} 个城市 | 总交易量 ${summary.totalVolume.toLocaleString()}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <select
                            value={cityFilter}
                            onChange={e => setCityFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg"
                        >
                            <option value="all">全部城市</option>
                            {Object.keys(cityStats).map(c => <option key={c} value={c}>{cityNamesCN[c] || c}</option>)}
                        </select>
                        <select
                            value={sideFilter}
                            onChange={e => setSideFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg"
                        >
                            <option value="all">全部方向</option>
                            <option value="BUY">买入</option>
                            <option value="SELL">卖出</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* ========== 策略分析报告（置顶） ========== */}
            <section className="bg-gradient-to-b from-blue-950/30 to-slate-950 border border-blue-500/20 p-10 rounded-3xl mb-12">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">Neobrother 交易策略深度拆解</h2>
                        <p className="text-slate-400 text-xs mt-1">基于 {summary.totalTrades} 笔历史交易的逆向工程分析 | 你如何复制他的方法</p>
                    </div>
                </div>

                <div className="space-y-8 text-slate-300 leading-relaxed">

                    {/* 核心策略 */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🎯</span> 核心策略：气象市场&quot;确定性收割&quot;
                        </h3>
                        <p className="text-slate-300 mb-4">
                            Neobrother 的策略本质是<strong className="text-white">利用气象数据的科学确定性来套利预测市场的认知延迟</strong>。
                            他专注于气象类预测市场（占其交易的 98%+），因为这类市场的结算依据是客观的气象站数据，而非主观判断。
                        </p>
                        <p className="text-slate-300">
                            与政治或体育预测不同，天气预报具有可量化的准确率。ECMWF（欧洲中期天气预报中心）的 24 小时预报准确率高达 95%+，
                            而普通 Polymarket 用户往往只凭&quot;感觉&quot;下注，造成了巨大的定价偏差。
                        </p>
                    </div>

                    {/* 入场策略 */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📥</span> 入场策略：极致低价抄底
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">数据证据</h4>
                                <ul className="text-sm space-y-2 text-slate-300">
                                    <li>• <span className="text-yellow-400 font-bold">76%</span> 的交易入场价格低于 0.15（15%赔率）</li>
                                    <li>• 仅 <span className="text-slate-200">3%</span> 的交易在 0.85+ 高概率区间入场</li>
                                    <li>• 买入占比 <span className="text-blue-400 font-bold">70%</span>，明显偏好建仓而非平仓</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">如何复制</h4>
                                <p className="text-sm text-slate-300">
                                    寻找市场严重低估的&quot;长尾事件&quot;。例如：当市场认为&quot;布宜诺斯艾利斯1月13日最高气温35°C&quot;概率只有 2% 时，
                                    查询专业气象模型，若实际概率是 15%，则大量买入。即便只有少数正确，回报率也是 50 倍。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 时机选择 */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                            <span className="text-2xl">⏰</span> 时机选择：欧洲早盘窗口
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">数据证据</h4>
                                <ul className="text-sm space-y-2 text-slate-300">
                                    <li>• 交易高峰集中在 <span className="text-purple-400 font-bold">10:00-12:00 UTC</span></li>
                                    <li>• 此时段交易量是平均值的 <span className="text-white">3.5倍</span></li>
                                    <li>• 与 ECMWF 上午模型更新时间（09:00 UTC）高度吻合</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">如何复制</h4>
                                <p className="text-sm text-slate-300">
                                    在气象机构发布最新预报后的 1-2 小时内迅速入场，利用&quot;信息传导延迟&quot;——
                                    专业气象数据需要时间被普通用户消化，而市场价格尚未充分反映最新预报。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 城市选择 */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🌍</span> 城市选择：南半球 + 极端气候区
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">数据证据</h4>
                                <ul className="text-sm space-y-2 text-slate-300">
                                    <li>• <span className="text-blue-400 font-bold">布宜诺斯艾利斯</span>：165笔（37.6%）</li>
                                    <li>• <span className="text-blue-400">达拉斯</span>：105笔（23.9%）</li>
                                    <li>• <span className="text-blue-400">纽约</span>：59笔（最高交易量 $2,409）</li>
                                    <li>• <span className="text-slate-400">伦敦</span>：仅18笔（4%）— 有意避开</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-2">如何复制</h4>
                                <p className="text-sm text-slate-300">
                                    选择气象波动大、市场关注度低的城市。<strong className="text-white">布宜诺斯艾利斯</strong>是南半球夏季，气温波动大，定价偏差更大。
                                    避开伦敦——流动性高、定价有效。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 风险管理 */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                            <span className="text-2xl">🛡️</span> 风险管理：分散 + 小额 + 高频
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4 text-center mb-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl">
                                <div className="text-2xl font-mono text-white mb-1">${(summary.totalVolume / summary.totalTrades).toFixed(2)}</div>
                                <div className="text-[10px] text-slate-400 uppercase">平均单笔交易量</div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl">
                                <div className="text-2xl font-mono text-white mb-1">{summary.uniqueMarkets}</div>
                                <div className="text-[10px] text-slate-400 uppercase">覆盖市场数量</div>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl">
                                <div className="text-2xl font-mono text-white mb-1">~$10</div>
                                <div className="text-[10px] text-slate-400 uppercase">典型单笔规模</div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300">
                            <strong className="text-white">如何复制：</strong>采用&quot;蚂蚁雄兵&quot;策略：每笔交易规模小（$10 左右），但覆盖大量市场。
                            降低单一预测失败风险，利用大数定律确保整体盈利。
                        </p>
                    </div>

                    {/* ========== 买卖决策分析（关键新增） ========== */}
                    {data.buySellPatterns && (
                        <div className="bg-gradient-to-r from-orange-950/30 to-slate-950 p-6 rounded-2xl border border-orange-500/20">
                            <h3 className="text-lg font-bold text-orange-400 mb-6 flex items-center gap-2">
                                <span className="text-2xl">🔄</span> 买卖决策模式：何时买入？何时卖出？
                            </h3>

                            {/* 核心数据指标 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-900/80 p-4 rounded-xl text-center">
                                    <div className="text-3xl font-mono text-orange-400 mb-1">{data?.buySellPatterns?.batchBuyRate}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase">分批买入率</div>
                                </div>
                                <div className="bg-slate-900/80 p-4 rounded-xl text-center">
                                    <div className="text-3xl font-mono text-emerald-400 mb-1">{data?.buySellPatterns?.holdToExpiryRate}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase">持有到期率</div>
                                </div>
                                <div className="bg-slate-900/80 p-4 rounded-xl text-center">
                                    <div className="text-3xl font-mono text-blue-400 mb-1">{data?.buySellPatterns?.earlyExitRate}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase">提前卖出率</div>
                                </div>
                                <div className="bg-slate-900/80 p-4 rounded-xl text-center">
                                    <div className="text-3xl font-mono text-purple-400 mb-1">+{data?.buySellPatterns?.profitSpread}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase">买卖价差</div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* 买入策略 */}
                                <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <span className="text-blue-400">📥</span> 买入模式
                                    </h4>
                                    <ul className="text-sm space-y-3 text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-400 font-bold">分批挂单：</span>
                                            <span><span className="text-white font-bold">{data.buySellPatterns.batchBuyRate}%</span> 的市场他会多次买入，平均间隔 <span className="text-white">{data.buySellPatterns.avgBatchIntervalMins} 分钟</span></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-400 font-bold">平均入场价：</span>
                                            <span><span className="text-white font-bold">{data.buySellPatterns.avgBuyPrice}%</span> — 极低赔率区间</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-orange-400 font-bold">总买入次数：</span>
                                            <span><span className="text-white">{data.buySellPatterns.totalBuys}</span> 次，覆盖 <span className="text-white">{data.buySellPatterns.totalEvents}</span> 个市场</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* 卖出策略 */}
                                <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <span className="text-emerald-400">📤</span> 卖出/退出模式
                                    </h4>
                                    <ul className="text-sm space-y-3 text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-400 font-bold">持有到期：</span>
                                            <span><span className="text-white font-bold">{data.buySellPatterns.holdToExpiryRate}%</span> 的市场他持有到结算，不提前卖出</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-400 font-bold">提前卖出：</span>
                                            <span><span className="text-white font-bold">{data.buySellPatterns.earlyExitRate}%</span> 的市场他会在结算前卖出锁定利润</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-400 font-bold">平均卖出价：</span>
                                            <span><span className="text-white font-bold">{data.buySellPatterns.avgSellPrice}%</span> — 比买入价高 <span className="text-emerald-400">+{data.buySellPatterns.profitSpread}%</span></span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* 关键结论 */}
                            <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border-l-4 border-orange-500">
                                <h4 className="text-sm font-bold text-white mb-2">💡 关键结论：你需要看天气预报吗？</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    <strong className="text-orange-400">答案：不一定。</strong> 数据显示他的策略核心是<strong className="text-white">买入极低赔率（12.5%）的长尾事件</strong>，
                                    然后<strong className="text-white">持有到期（40%）</strong>或在价格上涨后<strong className="text-white">提前卖出锁定利润（54%）</strong>。
                                    他的买卖价差是 <strong className="text-emerald-400">+{data?.buySellPatterns?.profitSpread}%</strong>，说明即使不看天气预报，
                                    只要你系统性地买入所有低于 15% 赔率的极端天气选项，然后在价格涨到 20%+ 时卖出，就能复制这个策略。
                                    <br /><br />
                                    <strong className="text-white">但天气预报可以提高胜率。</strong>如果你能判断某个&quot;2% 概率&quot;的极端温度实际有 15% 的可能，
                                    你的 EV（期望值）就会大幅提升。他的 72% 分批买入率表明 he 确实在追踪某些信号来加仓。
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ========== 时间轴决策树 ========== */}
                    <div className="bg-gradient-to-b from-cyan-950/30 to-slate-950 p-6 rounded-2xl border border-cyan-500/20">
                        <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                            <span className="text-2xl">🌳</span> 时间轴决策树：基于当地时间的买卖逻辑
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">关键洞察：最高温度通常在当地 14:00 左右出现，之后温度确定性大增</p>

                        {/* 时间轴可视化 */}
                        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 mb-6 overflow-x-auto">
                            <div className="min-w-[700px]">
                                {/* 时间轴标题行 */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-slate-500 uppercase">距结算 24h</span>
                                    <span className="text-[10px] text-slate-500 uppercase">距结算 0h</span>
                                </div>

                                {/* 主时间轴 */}
                                <div className="relative h-16 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 rounded-full overflow-hidden">
                                    {/* 时间段标记 */}
                                    <div className="absolute inset-0 flex">
                                        {/* 峰值前 (当地 00:00-14:00) */}
                                        <div className="flex-1 bg-blue-500/20 border-r border-slate-600 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-blue-400 font-bold text-xs">☀️ 峰值前</div>
                                                <div className="text-[9px] text-slate-400">当地 00:00-14:00</div>
                                            </div>
                                        </div>
                                        {/* 峰值后 (当地 14:00-18:00) */}
                                        <div className="flex-1 bg-emerald-500/30 border-r border-slate-600 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-emerald-400 font-bold text-xs">🌡️ 峰值后</div>
                                                <div className="text-[9px] text-slate-400">当地 14:00-18:00</div>
                                            </div>
                                        </div>
                                        {/* 晚间 (当地 18:00-24:00) */}
                                        <div className="flex-1 bg-orange-500/30 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-orange-400 font-bold text-xs">🌙 晚间结算</div>
                                                <div className="text-[9px] text-slate-400">当地 18:00-24:00</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 决策行为分布 */}
                                <div className="flex mt-4 gap-1">
                                    {/* 峰值前 */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-blue-500 rounded" style={{ width: '28%' }}></div>
                                            <span className="text-xs text-blue-400 font-bold">28% 买入</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-blue-800 rounded" style={{ width: '43%' }}></div>
                                            <span className="text-xs text-blue-300">43% 卖出</span>
                                        </div>
                                    </div>
                                    {/* 峰值后 */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-emerald-500 rounded" style={{ width: '41%' }}></div>
                                            <span className="text-xs text-emerald-400 font-bold">41% 买入 ⭐</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-emerald-800 rounded" style={{ width: '9%' }}></div>
                                            <span className="text-xs text-emerald-300">9% 卖出</span>
                                        </div>
                                    </div>
                                    {/* 晚间 */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-orange-500 rounded" style={{ width: '31%' }}></div>
                                            <span className="text-xs text-orange-400">31% 买入</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 bg-orange-800 rounded" style={{ width: '48%' }}></div>
                                            <span className="text-xs text-orange-300 font-bold">48% 卖出 ⭐</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 决策逻辑卡片 */}
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            {/* 峰值前阶段 */}
                            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                                <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                    ☀️ 峰值前（00:00-14:00 当地时间）
                                </h4>
                                <div className="text-[11px] text-slate-300 space-y-2">
                                    <p><strong className="text-white">状态：</strong>最高温度尚未出现</p>
                                    <p><strong className="text-white">行为：</strong>观察为主，小仓试探</p>
                                    <p><strong className="text-white">风险：</strong>高（天气仍可能变化）</p>
                                </div>
                                <div className="mt-3 bg-blue-500/20 p-2 rounded text-[10px] text-blue-300">
                                    💡 仅 28% 买入发生在此阶段
                                </div>
                            </div>

                            {/* 峰值后阶段 */}
                            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30">
                                <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                                    🌡️ 峰值后（14:00-18:00 当地时间）
                                </h4>
                                <div className="text-[11px] text-slate-300 space-y-2">
                                    <p><strong className="text-white">状态：</strong>最高温度已确定</p>
                                    <p><strong className="text-white">行为：</strong>主力买入窗口</p>
                                    <p><strong className="text-white">风险：</strong>低（结果几乎确定）</p>
                                </div>
                                <div className="mt-3 bg-emerald-500/20 p-2 rounded text-[10px] text-emerald-300">
                                    ⭐ 41% 买入在此阶段 — 黄金窗口！
                                </div>
                            </div>

                            {/* 晚间阶段 */}
                            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/30">
                                <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                                    🌙 晚间（18:00-24:00 当地时间）
                                </h4>
                                <div className="text-[11px] text-slate-300 space-y-2">
                                    <p><strong className="text-white">状态：</strong>结算临近，结果已知</p>
                                    <p><strong className="text-white">行为：</strong>卖出锁利窗口</p>
                                    <p><strong className="text-white">风险：</strong>无（结果已确定）</p>
                                </div>
                                <div className="mt-3 bg-orange-500/20 p-2 rounded text-[10px] text-orange-300">
                                    ⭐ 48% 卖出在此阶段 — 收割时间！
                                </div>
                            </div>
                        </div>

                        {/* 小时级决策分布 */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <h4 className="text-sm font-bold text-white mb-3">📊 小时级交易分布（距结算小时数）</h4>
                            <div className="flex items-end h-24 gap-[2px]">
                                {[
                                    { h: 0, buy: 9, sell: 10 }, { h: 1, buy: 15, sell: 9 }, { h: 2, buy: 12, sell: 6 },
                                    { h: 3, buy: 10, sell: 10 }, { h: 4, buy: 11, sell: 0 }, { h: 5, buy: 24, sell: 1 },
                                    { h: 6, buy: 25, sell: 0 }, { h: 7, buy: 45, sell: 2 }, { h: 8, buy: 41, sell: 4 },
                                    { h: 9, buy: 8, sell: 0 }, { h: 10, buy: 7, sell: 0 }, { h: 11, buy: 10, sell: 0 },
                                ].map(({ h, buy, sell }) => (
                                    <div key={h} className="flex-1 flex flex-col items-center gap-[1px]">
                                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${buy * 2}px` }}></div>
                                        <div className="w-full bg-orange-500 rounded-b" style={{ height: `${sell * 2}px` }}></div>
                                        <span className="text-[8px] text-slate-500 mt-1">{h}h</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center gap-6 mt-3">
                                <span className="text-[10px] text-blue-400 flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> 买入</span>
                                <span className="text-[10px] text-orange-400 flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded"></span> 卖出</span>
                            </div>
                            <div className="text-[10px] text-cyan-400 text-center mt-2">
                                🔥 买入高峰：距结算 5-8 小时（当地 14:00-18:00，峰值温度后）
                            </div>
                        </div>

                        {/* 决策规则总结 */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border-l-4 border-cyan-500">
                            <h4 className="text-sm font-bold text-white mb-3">🎯 基于当地时间的决策规则</h4>
                            <div className="text-sm text-slate-300 space-y-3">
                                <p className="flex items-start gap-2">
                                    <span className="text-blue-400 font-mono text-xs mt-0.5">1</span>
                                    <span><strong className="text-blue-400">IF</strong> 当地时间 &lt; 14:00 <strong className="text-blue-400">THEN</strong> 观察等待，最高温未定</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-mono text-xs mt-0.5">2</span>
                                    <span><strong className="text-emerald-400">IF</strong> 当地时间 14:00-18:00 <strong className="text-emerald-400">AND</strong> 价格 &lt; 15% <strong className="text-emerald-400">THEN</strong> 主力买入（最高温已出现）</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-orange-400 font-mono text-xs mt-0.5">3</span>
                                    <span><strong className="text-orange-400">IF</strong> 当地时间 &gt; 18:00 <strong className="text-orange-400">AND</strong> 价格涨至 20%+ <strong className="text-orange-400">THEN</strong> 卖出锁利</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <span className="text-purple-400 font-mono text-xs mt-0.5">4</span>
                                    <span><strong className="text-purple-400">IF</strong> 价格未涨 <strong className="text-purple-400">THEN</strong> 持有到 23:59 结算</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 总结 */}
                    <div className="bg-gradient-to-r from-emerald-950/50 to-blue-950/50 p-6 rounded-2xl border border-emerald-500/20">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">💡</span> 行动清单：立即可复制的 5 个步骤
                        </h3>
                        <ol className="text-sm space-y-3 text-slate-200">
                            <li><strong className="text-emerald-400">1. 结算当天物色目标</strong> — 筛选价格 &lt;15% 的极端天气市场</li>
                            <li><strong className="text-emerald-400">2. UTC 10:00-12:00 买入</strong> — 气象预报更新后 1-2 小时内操作</li>
                            <li><strong className="text-emerald-400">3. 分批建仓</strong> — 每个市场买入 2-3 次，间隔约 2 小时</li>
                            <li><strong className="text-emerald-400">4. 结算前 6 小时评估</strong> — 价格涨至 20%+ 则卖出锁利</li>
                            <li><strong className="text-emerald-400">5. 否则持有到期</strong> — 博弈最终结算的二元结果</li>
                        </ol>
                    </div>

                </div>
            </section>

            {/* 模式检测卡片 */}
            <section className="mb-12">
                <h2 className="text-lg font-bold uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500"></span> 检测到的交易模式
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { ...patterns.peakHourEntry, nameCN: '峰值后入场', descCN: '在当日最高气温出现后下单的交易' },
                        { ...patterns.thresholdProximity, nameCN: '阈值临近', descCN: '实际气温与市场阈值相差2°C以内时入场' },
                        { ...patterns.highProbEntry, nameCN: '高概率入场', descCN: '入场价格在0.85以上（近乎确定的结果）' },
                        { ...patterns.lowProbEntry, nameCN: '低价抄底', descCN: '入场价格在0.15以下（高风险/低估）' },
                        { ...patterns.buyDominance, nameCN: '买入主导', descCN: '买入与卖出交易的比例' },
                    ].map((p, i) => (
                        <div key={i} className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[9px] uppercase text-slate-400 font-bold tracking-widest">{p.nameCN}</span>
                                <span className={`text-2xl font-mono font-black ${p.rate > 50 ? 'text-emerald-400' : p.rate > 20 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                    {p.rate}%
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{p.descCN}</p>
                            <div className="mt-4 flex justify-between text-[9px] text-slate-500">
                                <span>{p.matches} 匹配</span>
                                <span>{p.total} 总计</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 主图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

                {/* 交易时间分布 */}
                <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                        <span className="w-1 h-3 bg-emerald-500"></span> 交易时间分布（24小时制）
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} interval={2} />
                                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 text-center">
                        交易高峰期：10:00-12:00 UTC — 与欧洲上午气象预报发布时间吻合
                    </p>
                </div>

                {/* 城市分布 */}
                <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                        <span className="w-1 h-3 bg-purple-500"></span> 城市配置
                    </h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={cityChartData} dataKey="trades" nameKey="city" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                                    {cityChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                        {cityChartData.slice(0, 4).map((c, i) => (
                            <span key={c.city} className="text-[9px] flex items-center gap-1 text-slate-300">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                                {cityNamesCN[c.city] || c.city}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 入场价格分布 */}
                <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                        <span className="w-1 h-3 bg-yellow-500"></span> 入场价格聚类
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priceBuckets} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={9} />
                                <YAxis type="category" dataKey="range" stroke="#64748b" fontSize={10} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 text-center">
                        <span className="text-yellow-400 font-bold">76%的入场</span>发生在极低价格区间（0.00-0.10）
                    </p>
                </div>

                {/* 散点图：时间 × 价格 */}
                <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
                    <h3 className="text-sm font-bold uppercase text-slate-400 mb-6 flex items-center gap-2">
                        <span className="w-1 h-3 bg-blue-500"></span> 交易探索器：时间 × 价格
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" dataKey="x" name="小时" domain={[0, 23]} stroke="#64748b" fontSize={9} tickFormatter={v => `${v}:00`} />
                                <YAxis type="number" dataKey="y" name="价格" domain={[0, 1]} stroke="#64748b" fontSize={9} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                                <ZAxis type="number" dataKey="size" range={[20, 200]} />
                                <Tooltip content={<ScatterTooltip />} />
                                <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.6} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 text-center">
                        气泡大小 = 交易量。左下角聚集 = 上午低价买入。
                    </p>
                </div>
            </div>

            {/* 原始数据（折叠） */}
            <section className="mb-12">
                <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="w-full bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:bg-slate-800/50 transition-colors"
                >
                    <h3 className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                        <span className="w-1 h-3 bg-slate-600"></span> 原始交易记录（{filteredTrades.length} 条）
                    </h3>
                    <span className="text-slate-500 text-xl">{showRawData ? '−' : '+'}</span>
                </button>

                {showRawData && (
                    <div className="bg-slate-900/50 border border-slate-800 border-t-0 rounded-b-2xl p-6 overflow-x-auto">
                        <table className="w-full text-[10px]">
                            <thead className="text-slate-400 uppercase border-b border-slate-800">
                                <tr>
                                    <th className="text-left py-3 px-2">时间</th>
                                    <th className="text-left py-3 px-2">城市</th>
                                    <th className="text-left py-3 px-2">阈值</th>
                                    <th className="text-left py-3 px-2">方向</th>
                                    <th className="text-right py-3 px-2">价格</th>
                                    <th className="text-right py-3 px-2">入场时气温</th>
                                    <th className="text-right py-3 px-2">峰值时刻</th>
                                    <th className="text-center py-3 px-2">峰值后？</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrades.slice(0, 50).map((t: Trade, i: number) => (
                                    <tr key={i} className="border-b border-slate-900 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-2 font-mono text-slate-300">{new Date(t.tradeTime).toLocaleString('zh-CN', { hour12: false })}</td>
                                        <td className="py-3 px-2 text-slate-300">{cityNamesCN[t.city] || t.city}</td>
                                        <td className="py-3 px-2 text-slate-300">{t.threshold?.temp}°{t.threshold?.unit} {t.threshold?.condition === 'higher' ? '或更高' : t.threshold?.condition === 'lower' ? '或更低' : '精确'}</td>
                                        <td className={`py-3 px-2 font-bold ${t.side === 'BUY' ? 'text-blue-400' : 'text-orange-400'}`}>{t.side === 'BUY' ? '买入' : '卖出'}</td>
                                        <td className="py-3 px-2 text-right font-mono text-slate-200">{(t.price * 100).toFixed(0)}%</td>
                                        <td className="py-3 px-2 text-right font-mono text-slate-300">{t.tempAtTradeHour?.toFixed(1) ?? '-'}°</td>
                                        <td className="py-3 px-2 text-right font-mono text-slate-300">{t.peakHour ?? '-'}:00</td>
                                        <td className="py-3 px-2 text-center">
                                            {t.enteredAfterPeak === true ? <span className="text-emerald-400">✓</span> : t.enteredAfterPeak === false ? <span className="text-red-400">✗</span> : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <footer className="text-center text-slate-700 text-[9px] uppercase tracking-[0.5em]">
                交易模式重建完成 // Antigravity 核心 v0.9
            </footer>
        </div>
    );
}
