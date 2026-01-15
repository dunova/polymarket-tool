'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface SeriesData {
    eventSlug: string;
    title: string;
    buyCost: number;
    sellRevenue: number;
    redeemValue: number;
    netPnL: number;
    roi: number;
    isWin: boolean;
    numBuys: number;
    numSells: number;
    numRedeems: number;
    avgBuyPrice: number;
    avgSellPrice: number;
    isOpen: boolean;  // True if no sells and no redeems
    firstTimestamp: number; // Unix timestamp of first trade
}

interface TraderData {
    address: string;
    shortAddress: string;
    profile: {
        username: string;
        allTimePnL: number;
    };
    basicStats: {
        totalTrades: number;
        totalVolume: string;
        totalPnL: string;
        totalEvents: number;
    };
    allSeries: SeriesData[];
    fromCache?: boolean;
    cacheAge?: number; // in minutes
    cachedAt?: number;
}

type SortKey = 'netPnL' | 'buyCost' | 'roi' | 'numBuys' | 'firstTimestamp';
type SortDir = 'asc' | 'desc';

export default function TerminalPage() {
    const params = useParams();
    const address = params.address as string;
    const [data, setData] = useState<TraderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('netPnL');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const fetchData = useCallback((refresh = false) => {
        if (refresh) {
            setLoading(true);
            setRefreshing(true);
        }
        fetch(`/api/trader-analysis?address=${address}${refresh ? '&refresh=true' : ''}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); setRefreshing(false); })
            .catch(() => { setLoading(false); setRefreshing(false); });
    }, [address]);

    useEffect(() => {
        if (!address) return;
        const timeout = setTimeout(() => fetchData(), 0);
        return () => clearTimeout(timeout);
    }, [address, fetchData]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    if (!data || !data.allSeries) return <div className="min-h-screen bg-black text-white flex items-center justify-center">No data</div>;

    const sortedSeries = [...data.allSeries].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    const wins = data.allSeries.filter(s => s.isWin).length;
    const losses = data.allSeries.length - wins;
    const totalPnL = data.allSeries.reduce((sum, s) => sum + s.netPnL, 0);

    return (
        <div className="min-h-screen bg-black text-white p-4 font-mono">
            {/* Header */}
            <div className="mb-4 border-b border-gray-700 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold">{data.profile?.username || data.shortAddress}</h1>
                        <p className="text-gray-500 text-sm">{data.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {data.fromCache && (
                            <span className="text-xs text-gray-500">缓存: {data.cacheAge}min</span>
                        )}
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs"
                        >
                            {refreshing ? '刷新中...' : '🔄 刷新数据'}
                        </button>
                    </div>
                </div>
                <div className="flex gap-8 mt-2 text-sm flex-wrap">
                    <span>系列数: <strong>{data.allSeries.length}</strong></span>
                    <span>胜: <strong className="text-green-400">{wins}</strong></span>
                    <span>负: <strong className="text-red-400">{losses}</strong></span>
                    <span>胜率: <strong>{((wins / data.allSeries.length) * 100).toFixed(1)}%</strong></span>
                    <span>官方盈亏: <strong className={parseFloat(data.basicStats?.totalPnL || '0') >= 0 ? 'text-green-400' : 'text-red-400'}>${parseFloat(data.basicStats?.totalPnL || '0').toFixed(2)}</strong></span>
                    <span className="text-gray-500">(交易记录: ${totalPnL.toFixed(2)}, 不含结算)</span>
                </div>
            </div>

            {/* Core Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            <th className="text-left py-2 px-1">#</th>
                            <th className="text-left py-2 px-1 cursor-pointer hover:text-white" onClick={() => handleSort('firstTimestamp')}>日期 {sortKey === 'firstTimestamp' && (sortDir === 'desc' ? '↓' : '↑')}</th>
                            <th className="text-left py-2 px-1 max-w-[300px]">系列名称 (Event)</th>
                            <th className="text-right py-2 px-1 cursor-pointer hover:text-white" onClick={() => handleSort('buyCost')}>
                                买入成本 {sortKey === 'buyCost' && (sortDir === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="text-right py-2 px-1">卖出收入</th>
                            <th className="text-right py-2 px-1">结算收入</th>
                            <th className="text-right py-2 px-1 cursor-pointer hover:text-white" onClick={() => handleSort('netPnL')}>
                                净盈亏 {sortKey === 'netPnL' && (sortDir === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="text-right py-2 px-1 cursor-pointer hover:text-white" onClick={() => handleSort('roi')}>
                                ROI% {sortKey === 'roi' && (sortDir === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="text-center py-2 px-1">胜负</th>
                            <th className="text-right py-2 px-1 cursor-pointer hover:text-white" onClick={() => handleSort('numBuys')}>
                                买/卖/赎 {sortKey === 'numBuys' && (sortDir === 'desc' ? '↓' : '↑')}
                            </th>
                            <th className="text-right py-2 px-1">均买价</th>
                            <th className="text-right py-2 px-1">均卖价</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSeries.map((s, i) => (
                            <tr key={s.eventSlug} className="border-b border-gray-800 hover:bg-gray-900">
                                <td className="py-1 px-1 text-gray-500">{i + 1}</td>
                                <td className="py-1 px-1 text-gray-400 text-nowrap">
                                    {s.firstTimestamp ? new Date(s.firstTimestamp * 1000).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '-'}
                                </td>
                                <td className="py-1 px-1 max-w-[300px] truncate" title={s.title}>
                                    {s.title}
                                </td>
                                <td className="py-1 px-1 text-right">${s.buyCost.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right">${s.sellRevenue.toFixed(2)}</td>
                                <td className="py-1 px-1 text-right">${s.redeemValue.toFixed(2)}</td>
                                <td className={`py-1 px-1 text-right font-bold ${s.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {s.netPnL >= 0 ? '+' : ''}${s.netPnL.toFixed(2)}
                                </td>
                                <td className={`py-1 px-1 text-right ${s.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {s.roi >= 0 ? '+' : ''}{s.roi.toFixed(1)}%
                                </td>
                                <td className="py-1 px-1 text-center">
                                    {s.isWin ? <span className="text-green-400">✅</span> : <span className="text-red-400">❌</span>}
                                </td>
                                <td className="py-1 px-1 text-right text-gray-400">{s.numBuys}/{s.numSells}/{s.numRedeems}</td>
                                <td className="py-1 px-1 text-right">{s.avgBuyPrice.toFixed(1)}%</td>
                                <td className="py-1 px-1 text-right">{s.avgSellPrice > 0 ? `${s.avgSellPrice.toFixed(1)}%` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
