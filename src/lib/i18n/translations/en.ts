export const en = {
    // Common
    common: {
        live: 'Live',
        loading: 'Loading...',
        error: 'Error',
        refresh: 'Refresh',
        viewAll: 'View All',
        trade: 'Trade',
        online: 'Online',
        offline: 'Offline',
        demo: 'Demo Mode',
    },

    // Navigation
    nav: {
        dashboard: 'Dashboard',
        elon: 'Elon',
        btc: 'BTC',
        traders: 'Traders',
        markets: 'Markets',
        london: 'London',
    },

    // Home Page
    home: {
        title: 'Dashboard',
        subtitle: 'Polymarket Trading Terminal',
        volume24h: '24h Volume',
        activeMarkets: 'Active Markets',
        totalLiquidity: 'Total Liquidity',
        status: 'Status',
        quickAccess: 'Quick Access',
        trendingMarkets: 'Trending Markets',
        topByVolume: 'Top by 24h volume',
        tools: {
            elon: { label: 'Elon', desc: 'Tweet predictions' },
            btc: { label: 'BTC', desc: 'Price ranges' },
            traders: { label: 'Traders', desc: 'Whale tracking' },
            markets: { label: 'Markets', desc: 'Live monitoring' },
        },
    },

    // Elon Terminal
    elon: {
        title: 'Elon Terminal',
        subtitle: 'Tweet Volume Forecasting',
        current: 'Current',
        remaining: 'Remaining',
        muskPhase: 'Musk Phase',
        activeHours: 'Active Hours',
        cstTime: 'CST Time',
        forecast: 'Forecast',
        predictedTotal: 'Predicted Total',
        floor: 'Floor',
        expected: 'Expected',
        ceiling: 'Ceiling',
        markets: 'Markets',
        priceVsModel: 'Price vs Model Probability',
        range: 'Range',
        price: 'Price',
        model: 'Model',
        edge: 'Edge',
    },

    // BTC Strategy
    btc: {
        title: 'BTC Strategy',
        subtitle: 'Range prediction backtesting',
        btcPrice: 'BTC Price',
        currentRange: 'Current Range',
        winRate: 'Win Rate',
        totalReturn: 'Total Return',
        priceRanges: 'Price Ranges',
        runBacktest: 'Run Backtest',
        backtestResults: 'Backtest Results',
        wins: 'Wins',
        losses: 'Losses',
        date: 'Date',
        entry: 'Entry',
        exit: 'Exit',
        pnl: 'P/L',
    },

    // Market Monitor
    monitor: {
        title: 'Market Monitor',
        subtitle: 'Live market tracking',
        totalVolume: 'Total Volume',
        avgChange: 'Avg Change',
        market: 'Market',
        change24h: '24h',
        volume: 'Volume',
        liquidity: 'Liquidity',
        all: 'All',
        trending: 'Trending',
        new: 'New',
    },

    // Trader Analyzer
    trader: {
        title: 'Trader Analyzer',
        subtitle: 'Whale tracking and copy trading',
        trackedWallets: 'Tracked Wallets',
        avgWinRate: 'Avg Win Rate',
        totalPnl: 'Total P/L',
        active: 'Active',
        traderProfile: 'Trader Profile',
        selectTrader: 'Select a trader',
        copyTrade: 'Copy Trade',
        avgSize: 'Avg Size',
        trades: 'Trades',
        tags: 'Tags',
    },

    // London Weather
    london: {
        title: 'London Weather',
        subtitle: 'Temperature Betting Dashboard',
        countdown: 'Time to Resolution',
        hours: 'Hours',
        minutes: 'Minutes',
        seconds: 'Seconds',
        officialSource: 'Official Source',
        weatherUnderground: 'Weather Underground EGLC',
        multiSource: 'Multi-Source Comparison',
        currentTemp: 'Current Temp',
        forecastHigh: 'Forecast High',
        historicalAvg: 'Historical Avg',
        confidence: 'Confidence',
        marketOdds: 'Market Odds',
        strategy: 'Strategy Calculator',
        expectedValue: 'Expected Value',
        kellySize: 'Kelly Size',
        recommendation: 'Recommendation',
        hourlyForecast: 'Hourly Forecast',
        historicalData: 'Historical Jan 12',
        sources: {
            official: 'Official (Resolution)',
            openMeteo: 'Open-Meteo (UKMO)',
            visualCrossing: 'Visual Crossing',
        },
    },
};

export type Translations = typeof en;
