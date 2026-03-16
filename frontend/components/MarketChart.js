"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
  AreaChart, Area,
} from "recharts";

const API = "http://localhost:8000";

const PERIODS = [
  { label: "1D", value: "1d",  interval: "5m"  },
  { label: "1W", value: "5d",  interval: "15m" },
  { label: "1M", value: "1mo", interval: "1d"  },
  { label: "3M", value: "3mo", interval: "1d"  },
  { label: "1Y", value: "1y",  interval: "1wk" },
];

const CHART_TABS = [
  { key: "stocks",  label: "Stock Market" },
  { key: "forex",   label: "Forex / FX"   },
  { key: "futures", label: "Futures"      },
  { key: "options", label: "Options"      },
  { key: "funds",   label: "Funds"        },
];

// ── Candlestick tooltip ───────────────────────────────────────────────────────
const CandleTooltip = ({ active, payload, label, sym, currency }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isGreen = (d.Close ?? 0) >= (d.Open ?? 0);
  const fmt = (v) => `${sym}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <div className="bg-[#020617]/98 border border-cyan-500/20 rounded-xl px-4 py-3 text-[11px] font-mono shadow-2xl z-50 min-w-[160px]">
      <p className="text-slate-400 mb-2 text-[10px]">{d.Date || label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {d.Open  != null && <><span className="text-slate-500">Open</span><span className="text-slate-200">{fmt(d.Open)}</span></>}
        {d.High  != null && <><span className="text-slate-500">High</span><span className="text-emerald-400">{fmt(d.High)}</span></>}
        {d.Low   != null && <><span className="text-slate-500">Low</span><span className="text-rose-400">{fmt(d.Low)}</span></>}
        {d.Close != null && <><span className="text-slate-500">Close</span><span className={`font-bold ${isGreen?"text-emerald-400":"text-rose-400"}`}>{fmt(d.Close)}</span></>}
        {d.Volume > 0    && <><span className="text-slate-500">Vol</span><span className="text-slate-400">{Number(d.Volume).toLocaleString()}</span></>}
      </div>
      {currency && <p className="text-[9px] text-slate-600 mt-1.5 uppercase tracking-widest border-t border-white/5 pt-1.5">{currency}</p>}
    </div>
  );
};

// ── Candlestick chart ─────────────────────────────────────────────────────────
function CandlestickChart({ rawData, sym = "", currency = "" }) {
  if (!rawData?.length) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[11px] font-mono text-slate-600">No chart data available</p>
    </div>
  );

  const prices    = rawData.flatMap(d => [d.Open, d.High, d.Low, d.Close]).filter(v => v != null && !isNaN(v));
  const pMin      = Math.min(...prices);
  const pMax      = Math.max(...prices);
  const pad       = (pMax - pMin) * 0.08 || pMin * 0.05 || 1;
  const domainMin = pMin - pad;
  const domainMax = pMax + pad;
  const volumes   = rawData.map(d => d.Volume || 0);
  const volMax    = Math.max(...volumes) || 1;

  const fmtTick = (v) => {
    const n = Number(v);
    if (n >= 1000) return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rawData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="Date" tick={{ fill:"#475569", fontSize:9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="price" domain={[domainMin, domainMax]}
          tick={{ fill:"#475569", fontSize:9 }} tickLine={false} axisLine={false} width={72}
          tickFormatter={fmtTick} orientation="left" />
        <YAxis yAxisId="volume" domain={[0, volMax * 5]} tick={false} axisLine={false} tickLine={false} width={0} orientation="right" />
        <Tooltip content={<CandleTooltip sym={sym} currency={currency} />} />
        <ReferenceLine yAxisId="price" y={rawData[0]?.Close} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

        {/* Volume bars */}
        <Bar yAxisId="volume" dataKey="Volume" maxBarSize={12} radius={[2,2,0,0]}>
          {rawData.map((d, i) => (
            <Cell key={i} fill={(d.Close??0)>=(d.Open??0) ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)"} />
          ))}
        </Bar>

        {/* Candlestick */}
        <Bar yAxisId="price" dataKey="Close" maxBarSize={20}
          shape={(sp) => {
            const { x, width, index } = sp;
            const d = rawData[index];
            if (!d || d.Open==null || d.High==null || d.Low==null || d.Close==null) return null;
            const isGreen  = d.Close >= d.Open;
            const color    = isGreen ? "#34d399" : "#f87171";
            const chartH   = sp.background?.height || 400;
            const chartTop = sp.background?.y || 0;
            const range    = domainMax - domainMin;
            const toY      = (p) => chartTop + chartH * (1 - (p - domainMin) / range);
            const highPx   = toY(d.High), lowPx = toY(d.Low);
            const openPx   = toY(d.Open), closePx = toY(d.Close);
            const bodyTop  = Math.min(openPx, closePx);
            const bodyBot  = Math.max(openPx, closePx);
            const bodyH    = Math.max(bodyBot - bodyTop, 1.5);
            const cx       = x + width / 2;
            const bw       = Math.max(width * 0.65, 2);
            return (
              <g key={index}>
                <line x1={cx} y1={highPx}  x2={cx} y2={bodyTop} stroke={color} strokeWidth={1.2} />
                <line x1={cx} y1={bodyBot} x2={cx} y2={lowPx}   stroke={color} strokeWidth={1.2} />
                <rect x={cx-bw/2} y={bodyTop} width={bw} height={bodyH}
                  fill={isGreen ? color : "transparent"} stroke={color} strokeWidth={1.2} rx={1} />
              </g>
            );
          }}>
          {rawData.map((_, i) => <Cell key={i} fill="transparent" />)}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Forex area chart ──────────────────────────────────────────────────────────
function ForexChart({ rawData, ticker, currency, sym }) {
  if (!rawData?.length) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[11px] font-mono text-slate-600">No forex data — currency may be pegged or data unavailable</p>
    </div>
  );

  const prices    = rawData.map(d => d.Close).filter(v => v != null && !isNaN(v));
  const pMin      = Math.min(...prices);
  const pMax      = Math.max(...prices);
  const pad       = (pMax - pMin) * 0.05 || pMin * 0.02 || 0.001;
  const isPos     = prices[prices.length-1] >= prices[0];
  const color     = isPos ? "#34d399" : "#f87171";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rawData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="fxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="Date" tick={{ fill:"#475569", fontSize:9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[pMin - pad, pMax + pad]}
          tick={{ fill:"#475569", fontSize:9 }} tickLine={false} axisLine={false} width={72}
          tickFormatter={v => `${sym}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })}`} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-[#020617]/98 border border-cyan-500/20 rounded-xl px-4 py-3 text-[11px] font-mono shadow-2xl">
                <p className="text-slate-400 mb-1 text-[10px]">{label}</p>
                <p className="text-white font-bold">{sym}{Number(payload[0]?.value).toFixed(4)} {currency}</p>
                <p className="text-[9px] text-slate-600 mt-1">per 1 USD</p>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="Close" stroke={color} strokeWidth={1.8}
          fill="url(#fxGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Options table ─────────────────────────────────────────────────────────────
function OptionsTable({ data, sym }) {
  const [view, setView] = useState("calls");
  const rows = view === "calls" ? data?.calls : data?.puts;
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {["calls","puts"].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1.5 text-[10px] font-bold font-mono uppercase transition-all ${v===view?"bg-cyan-500/20 text-cyan-400":"text-slate-500 hover:text-slate-300"}`}>
              {v}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-slate-600">ETF: {data?.ticker} · Expiry: {data?.expiry}</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0" style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(0,255,255,0.15) transparent" }}>
        <table className="w-full text-[10px] font-mono">
          <thead className="sticky top-0 bg-[#020617]">
            <tr className="text-slate-500 border-b border-white/5">
              {["Strike","Last","Bid","Ask","Vol","OI","IV%"].map(h => (
                <th key={h} className="text-left py-2 px-2 font-bold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows?.slice(0,40).map((r,i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-1.5 px-2 text-cyan-400 font-bold">{sym}{Number(r.strike||0).toFixed(2)}</td>
                <td className="py-1.5 px-2 text-white">{sym}{Number(r.lastPrice||0).toFixed(2)}</td>
                <td className="py-1.5 px-2 text-slate-300">{sym}{Number(r.bid||0).toFixed(2)}</td>
                <td className="py-1.5 px-2 text-slate-300">{sym}{Number(r.ask||0).toFixed(2)}</td>
                <td className="py-1.5 px-2 text-slate-400">{Number(r.volume||0).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-slate-400">{Number(r.openInterest||0).toLocaleString()}</td>
                <td className="py-1.5 px-2 text-amber-400">{(Number(r.impliedVolatility||0)*100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Funds list ────────────────────────────────────────────────────────────────
function FundsList({ data, sym, selectedFund, onSelect }) {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        {data?.funds?.map(f => (
          <button key={f.ticker} onClick={() => onSelect(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${
              selectedFund?.ticker===f.ticker
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                : "border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}>{f.ticker}</button>
        ))}
      </div>
      {selectedFund && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-[11px] font-mono text-slate-300 truncate mr-2">{selectedFund.name}</p>
            <p className={`text-sm font-black font-mono flex-shrink-0 ${(selectedFund.last_price??0)>=(selectedFund.previous_close??0)?"text-emerald-400":"text-rose-400"}`}>
              {sym}{Number(selectedFund.last_price||0).toFixed(2)}
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <CandlestickChart rawData={selectedFund.data} sym={sym} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main MarketChart ──────────────────────────────────────────────────────────
export default function MarketChart({ countryCode, countryName, countryMeta, forexDefault, currencySymbols }) {
  const [activeTab,      setActiveTab]      = useState(null);
  const [period,         setPeriod]         = useState(PERIODS[2]);
  const [chartData,      setChartData]      = useState(null);
  const [forexInfo,      setForexInfo]      = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [selectedFuture, setSelectedFuture] = useState(null);
  const [selectedFund,   setSelectedFund]   = useState(null);

  const currency = countryMeta?.currency || "USD";
  const sym      = (currencySymbols || {})[currency] || "";

  // On country change: set default tab
  useEffect(() => {
    if (!countryCode) { setChartData(null); setActiveTab(null); return; }
    setChartData(null);
    setError(null);
    setActiveTab(forexDefault ? "forex" : "stocks");
  }, [countryCode, forexDefault]);

  // Fetch forex info once per country (for the forex tab)
  useEffect(() => {
    if (!countryCode) return;
    setForexInfo(null);
    fetch(`${API}/market/country-info/${countryCode}`)
      .then(r => r.json())
      .then(d => setForexInfo(d))
      .catch(() => {});
  }, [countryCode]);

  // Fetch chart data on tab/period change
  useEffect(() => {
    if (!countryCode || !activeTab) return;
    loadChart(activeTab, period);
  }, [countryCode, activeTab, period]);

  const loadChart = async (tab, per) => {
    setLoading(true);
    setError(null);
    setChartData(null);
    try {
      let url;
      if (tab === "stocks")  url = `${API}/market/stocks/${countryCode}?period=${per.value}&interval=${per.interval}`;
      if (tab === "futures") url = `${API}/market/futures/${countryCode}?period=${per.value}&interval=${per.interval}`;
      if (tab === "options") url = `${API}/market/options/${countryCode}`;
      if (tab === "funds")   url = `${API}/market/funds/${countryCode}?period=${per.value}&interval=${per.interval}`;
      if (tab === "forex")   url = null; // uses forexInfo already fetched

      if (url) {
        const res  = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
        setChartData(json);
        if (tab === "futures" && json.futures?.length) setSelectedFuture(json.futures[0]);
        if (tab === "funds"   && json.funds?.length)   setSelectedFund(json.funds[0]);
      }
    } catch (e) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // Price summary
  const priceRaw   = activeTab === "stocks"  ? chartData?.data
                   : activeTab === "futures" ? selectedFuture?.data : null;
  const lastClose  = priceRaw?.[priceRaw.length - 1]?.Close;
  const firstClose = priceRaw?.[0]?.Close;
  const priceDiff  = lastClose != null && firstClose != null ? lastClose - firstClose : null;
  const pctChange  = priceDiff != null && firstClose ? (priceDiff / firstClose) * 100 : null;
  const isPositive = (priceDiff ?? 0) >= 0;

  const fxLast   = forexInfo?.forex_rate?.price;
  const fxChange = forexInfo?.forex_rate?.change;
  const fxPos    = forexInfo?.forex_rate?.positive;

  if (!countryCode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center bg-[#020617]">
        <div className="w-14 h-14 rounded-full border border-cyan-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Click any country on the map</p>
        <p className="text-[9px] font-mono text-slate-600">Lighter countries have full market data</p>
      </div>
    );
  }

  const scrollStyle = { scrollbarWidth:"thin", scrollbarColor:"rgba(0,255,255,0.15) transparent" };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200">

      {/* ── Chart header ── */}
      <div className="px-5 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black font-mono italic uppercase text-white tracking-tight leading-none">
              {countryName}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {activeTab === "stocks" && chartData?.ticker && (
                <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                  {chartData.ticker}
                </span>
              )}
              {activeTab === "forex" && forexInfo?.forex_ticker && (
                <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                  {forexInfo.forex_ticker}
                </span>
              )}
              {currency !== "USD" && (
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  {sym} {currency}
                </span>
              )}
            </div>
          </div>

          {/* Price display */}
          <div className="text-right">
            {activeTab === "forex" && fxLast != null && (
              <>
                <p className="text-xl font-black font-mono text-white">
                  {sym}{Number(fxLast).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
                <p className={`text-sm font-bold font-mono ${fxPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {fxChange}
                </p>
                <p className="text-[9px] font-mono text-slate-600 mt-0.5">USD/{currency}</p>
              </>
            )}
            {(activeTab === "stocks" || activeTab === "futures") && lastClose != null && (
              <>
                <p className="text-xl font-black font-mono text-white">
                  {sym}{Number(lastClose).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                {pctChange != null && (
                  <p className={`text-sm font-bold font-mono ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPositive ? "+" : ""}{sym}{Math.abs(Number(priceDiff)).toFixed(2)} ({isPositive ? "+" : ""}{pctChange.toFixed(2)}%)
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {CHART_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-[9px] font-bold font-mono uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.key
                ? "text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border-b-2 border-transparent"
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* ── Period bar ── */}
      {activeTab !== "options" && activeTab !== "forex" && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-white/5 flex-shrink-0 flex-wrap">
          {activeTab === "futures" && chartData?.futures?.length > 1 && (
            <>
              {chartData.futures.map(f => (
                <button key={f.ticker} onClick={() => setSelectedFuture(f)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                    selectedFuture?.ticker === f.ticker
                      ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                      : "border-white/10 text-slate-500 hover:text-slate-300"
                  }`}>{f.ticker}</button>
              ))}
              <div className="w-px h-4 bg-white/10" />
            </>
          )}
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                period.value === p.value
                  ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                  : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}>{p.label}</button>
          ))}
        </div>
      )}

      {/* ── Chart body ── */}
      <div className="flex-1 min-h-0 px-4 py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest animate-pulse">Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-[11px] font-mono text-rose-400/70 max-w-[280px] leading-relaxed">{error}</p>
            <div className="flex gap-2">
              <button onClick={() => loadChart(activeTab, period)}
                className="px-4 py-1.5 rounded-lg border border-cyan-500/20 text-[10px] font-bold font-mono text-cyan-400 hover:bg-cyan-500/10 transition-all">
                Retry
              </button>
              <button onClick={() => setActiveTab("forex")}
                className="px-4 py-1.5 rounded-lg border border-amber-500/20 text-[10px] font-bold font-mono text-amber-400 hover:bg-amber-500/10 transition-all">
                View Forex Instead
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stocks */}
            {activeTab === "stocks" && chartData?.data?.length > 0 && (
              <CandlestickChart rawData={chartData.data} sym={sym} currency={currency} />
            )}
            {activeTab === "stocks" && chartData?.data?.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <p className="text-[11px] font-mono text-amber-400/70">No stock data for {countryName}</p>
                <button onClick={() => setActiveTab("forex")}
                  className="px-4 py-1.5 rounded-lg border border-cyan-500/20 text-[10px] font-bold font-mono text-cyan-400 hover:bg-cyan-500/10 transition-all">
                  View Currency Chart
                </button>
              </div>
            )}

            {/* Forex */}
            {activeTab === "forex" && (
              <ForexChart
                rawData={forexInfo?.forex_history || []}
                ticker={forexInfo?.forex_ticker}
                currency={currency}
                sym={sym}
              />
            )}
            {activeTab === "forex" && !forexInfo?.forex_ticker && currency === "USD" && (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] font-mono text-slate-600">USD is the base currency — no forex chart needed</p>
              </div>
            )}

            {/* Futures */}
            {activeTab === "futures" && selectedFuture?.data && (
              <CandlestickChart rawData={selectedFuture.data} sym={sym} currency={currency} />
            )}

            {/* Options */}
            {activeTab === "options" && chartData && <OptionsTable data={chartData} sym={sym} />}

            {/* Funds */}
            {activeTab === "funds" && chartData && (
              <FundsList data={chartData} sym={sym} selectedFund={selectedFund} onSelect={setSelectedFund} />
            )}
          </>
        )}
      </div>
    </div>
  );
}