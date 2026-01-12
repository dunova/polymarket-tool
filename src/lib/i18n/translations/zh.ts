import { Translations } from './en';

export const zh: Translations = {
    // 通用
    common: {
        live: '实时',
        loading: '加载中...',
        error: '错误',
        refresh: '刷新',
        viewAll: '查看全部',
        trade: '交易',
        online: '在线',
        offline: '离线',
        demo: '演示模式',
    },

    // 导航
    nav: {
        dashboard: '仪表盘',
        elon: 'Elon',
        btc: 'BTC',
        traders: '交易员',
        markets: '市场',
        london: '伦敦',
    },

    // 首页
    home: {
        title: '仪表盘',
        subtitle: 'Polymarket 交易终端',
        volume24h: '24小时交易量',
        activeMarkets: '活跃市场',
        totalLiquidity: '总流动性',
        status: '状态',
        quickAccess: '快速访问',
        trendingMarkets: '热门市场',
        topByVolume: '按24小时交易量排序',
        tools: {
            elon: { label: 'Elon', desc: '推文预测' },
            btc: { label: 'BTC', desc: '价格区间' },
            traders: { label: '交易员', desc: '鲸鱼追踪' },
            markets: { label: '市场', desc: '实时监控' },
        },
    },

    // Elon 终端
    elon: {
        title: 'Elon 终端',
        subtitle: '推文数量预测引擎',
        current: '当前',
        remaining: '剩余时间',
        muskPhase: 'Musk状态',
        activeHours: '活跃时段',
        cstTime: 'CST时间',
        forecast: '预测',
        predictedTotal: '预测总量',
        floor: '下限',
        expected: '预期',
        ceiling: '上限',
        markets: '市场',
        priceVsModel: '价格 vs 模型概率',
        range: '区间',
        price: '价格',
        model: '模型',
        edge: '优势',
    },

    // BTC 策略
    btc: {
        title: 'BTC 策略',
        subtitle: '价格区间回测',
        btcPrice: 'BTC 价格',
        currentRange: '当前区间',
        winRate: '胜率',
        totalReturn: '总回报',
        priceRanges: '价格区间',
        runBacktest: '运行回测',
        backtestResults: '回测结果',
        wins: '盈利',
        losses: '亏损',
        date: '日期',
        entry: '入场',
        exit: '出场',
        pnl: '盈亏',
    },

    // 市场监控
    monitor: {
        title: '市场监控',
        subtitle: '实时市场追踪',
        totalVolume: '总交易量',
        avgChange: '平均变化',
        market: '市场',
        change24h: '24小时',
        volume: '交易量',
        liquidity: '流动性',
        all: '全部',
        trending: '热门',
        new: '最新',
    },

    // 交易员分析
    trader: {
        title: '交易员分析',
        subtitle: '鲸鱼追踪和跟单交易',
        trackedWallets: '追踪钱包',
        avgWinRate: '平均胜率',
        totalPnl: '总盈亏',
        active: '活跃',
        traderProfile: '交易员档案',
        selectTrader: '选择交易员',
        copyTrade: '跟单交易',
        avgSize: '平均仓位',
        trades: '交易次数',
        tags: '标签',
    },

    // 伦敦天气
    london: {
        title: '伦敦天气',
        subtitle: '温度投注仪表盘',
        countdown: '距离结算',
        hours: '小时',
        minutes: '分钟',
        seconds: '秒',
        officialSource: '官方数据源',
        weatherUnderground: 'Weather Underground EGLC',
        multiSource: '多源数据对比',
        currentTemp: '当前温度',
        forecastHigh: '预测最高温',
        historicalAvg: '历史平均',
        confidence: '置信度',
        marketOdds: '市场赔率',
        strategy: '策略计算器',
        expectedValue: '期望值',
        kellySize: 'Kelly仓位',
        recommendation: '建议',
        hourlyForecast: '逐小时预测',
        historicalData: '历史1月12日',
        sources: {
            official: '官方 (结算)',
            openMeteo: 'Open-Meteo (UKMO)',
            visualCrossing: 'Visual Crossing',
        },
    },
};
