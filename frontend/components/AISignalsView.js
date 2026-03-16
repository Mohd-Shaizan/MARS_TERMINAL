"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const DIRECTION_COLOR = (d) =>
  d === "LONG"
    ? "text-emerald-300 bg-emerald-400/15 border-emerald-400/40"
    : d === "SHORT"
    ? "text-rose-300 bg-rose-400/15 border-rose-400/40"
    : "text-amber-300 bg-amber-400/15 border-amber-400/40";

const CONF_BAR = ({ value }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${value * 100}%`,
          background: value >= 0.7 ? "#34d399" : value >= 0.5 ? "#fbbf24" : "#f87171",
        }}
      />
    </div>
    <span className="text-xs font-bold font-mono text-white w-10 text-right">
      {(value * 100).toFixed(0)}%
    </span>
  </div>
);

export default function AISignalsView() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/intelligence/global`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to fetch");
      setData(json);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
    const id = setInterval(fetchPrediction, 60_000);
    return () => clearInterval(id);
  }, []);

  const scrollStyle = { scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,255,0.2) transparent" };
  const riskScore   = data?.global_risk_score ?? 0;
  const riskColor   = riskScore >= 8 ? "#ff4444" : riskScore >= 6 ? "#ff8c00" : riskScore >= 4 ? "#ffdc00" : "#00d4ff";
  const riskLabel   = riskScore >= 8 ? "Critical" : riskScore >= 6 ? "Elevated" : riskScore >= 4 ? "Moderate" : "Stable";

  return (
    <div className="w-full h-full bg-[#020617] overflow-y-auto text-white font-mono" style={scrollStyle}>
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              MARS<span className="text-cyan-400">AI</span>
              <span className="ml-4 text-base font-bold text-slate-300 not-italic normal-case tracking-widest">
                Global Intelligence Feed
              </span>
            </h2>
            <p className="text-sm font-mono text-slate-400 mt-1 uppercase tracking-widest">
              AI-powered market predictions based on real-time geopolitical intelligence
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastRefresh && (
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Updated {lastRefresh}
              </span>
            )}
            <button
              onClick={fetchPrediction}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10 transition-all disabled:opacity-40"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm font-mono text-cyan-400/70 uppercase tracking-widest animate-pulse">
              Analyzing global intelligence...
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !data && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-base font-mono text-rose-300">{error}</p>
            <p className="text-sm font-mono text-slate-400">Make sure the backend is running at localhost:8000</p>
            <button onClick={fetchPrediction}
              className="px-5 py-2 rounded-lg border border-cyan-500/30 text-sm font-bold text-cyan-300 hover:bg-cyan-500/10 transition-all">
              Retry
            </button>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 gap-6">

            {/* ── Global Risk Score ── */}
            <div className="bg-white/[0.04] border border-cyan-500/25 rounded-2xl px-6 py-6 backdrop-blur-md">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.35em] mb-4">
                Global Market Risk Index
              </p>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-6xl font-black font-mono" style={{ color: riskColor }}>
                    {riskScore.toFixed(1)}
                  </p>
                  <p className="text-base font-mono text-slate-300 mt-1">/ 10 — {riskLabel}</p>
                </div>
                <div className="flex-1">
                  <div
                    className="relative h-4 rounded-full overflow-hidden border border-white/15"
                    style={{ background: "linear-gradient(to right, #0078ff, #00c8ff, #ffdc00, #ff8c00, #dc0000)" }}
                  >
                    <div
                      className="absolute top-0 h-full w-1.5 bg-white rounded-full"
                      style={{ left: `${(riskScore / 10) * 100}%`, transform: "translateX(-50%)", boxShadow: "0 0 10px white" }}
                    />
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-2 uppercase tracking-widest">
                    {data.headlines_used > 0
                      ? `Based on ${data.headlines_used} live headlines from global hotspots`
                      : "Calculated from geopolitical keyword analysis"}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Market Summary ── */}
            <div className="bg-white/[0.04] border border-cyan-500/25 rounded-2xl px-6 py-6 backdrop-blur-md">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.35em] mb-3">
                Market Summary (Next 24-48h)
              </p>
              <p className="text-base text-white leading-relaxed font-sans font-medium">{data.summary}</p>
            </div>

            {/* ── Top Predicted Trades ── */}
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.35em] mb-4">
                Top Predicted Trades ({data.top_trades?.length || 0})
              </p>
              <div className="grid grid-cols-1 gap-3">
                {data.top_trades?.map((trade, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.04] border border-white/10 rounded-xl px-5 py-5 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Rank badge */}
                        <div className="w-8 h-8 rounded-full border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-black font-mono text-cyan-300">{i + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-base font-black font-mono text-white">{trade.instrument}</span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${DIRECTION_COLOR(trade.direction)}`}>
                              {trade.direction}
                            </span>
                            <span className="text-xs font-mono text-slate-400 border border-white/15 px-2.5 py-0.5 rounded-lg">
                              {trade.timeframe}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed mb-3 font-sans">{trade.reasoning}</p>
                          <CONF_BAR value={trade.confidence} />
                        </div>
                      </div>

                      {/* Confidence number */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-2xl font-black font-mono" style={{
                          color: trade.confidence >= 0.7 ? "#34d399" : trade.confidence >= 0.5 ? "#fbbf24" : "#f87171"
                        }}>
                          {(trade.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs font-mono text-slate-400 uppercase">confidence</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Disclaimer ── */}
            <p className="text-xs font-mono text-slate-500 text-center uppercase tracking-widest pb-4">
              AI-generated analysis for informational purposes only. Not financial advice.
              Predictions auto-refresh every 60 seconds.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}