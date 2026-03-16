"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from "next/link";
import { useRouter } from "next/navigation";
import AISignalsView from "./AISignalsView";

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#020617] text-cyan-500 font-mono">
      <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
      <p className="tracking-[0.3em] uppercase text-[10px] animate-pulse">Initializing Global Intelligence...</p>
    </div>
  )
});

const API  = "http://localhost:8000";
const TABS = ["Forex", "Commodities", "Crypto"];

const TAB_PAIRS = {
  Forex:       ["XAU/USD", "EUR/USD", "USD/JPY", "GBP/USD", "WTI/USD", "BTC/USD"],
  Commodities: ["GOLD", "SILVER", "BRENT", "WTI", "COPPER", "NATGAS", "SOYBEAN", "CORN"],
  Crypto:      ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD", "ADA/USD", "DOGE/USD"],
};

const SKELETON = (pair) => ({
  pair, name: pair, price: "--", change: "--", changeAbs: "--",
  bid: "--", ask: "--", high: "--", low: "--", volume: "--",
  positive: true, loading: true,
});

const RISK_LEGEND = [
  { color: "#0078ff", label: "Stable"   },
  { color: "#00c8ff", label: "Low"      },
  { color: "#ffdc00", label: "Moderate" },
  { color: "#ff8c00", label: "High"     },
  { color: "#dc0000", label: "Critical" },
];

// Global risk is now fetched live from backend (see useEffect below)

// GeoJSON country name → API name where they differ
const GEO_TO_API = {
  "United States of America": "United States",
  "United Kingdom":           "United Kingdom",
  "South Korea":              "South Korea",
  "Saudi Arabia":             "Saudi Arabia",
  "United Arab Emirates":     "UAE",
  "South Africa":             "South Africa",
  "New Zealand":              "New Zealand",
};
const toApiName = (n) => GEO_TO_API[n] || n;

export default function GeopoliticalTradingGlobe() {
  const globeRef = useRef(null);
  const router   = useRouter();

  // ── Globe state — IDENTICAL TO ORIGINAL ──────────────────────────────────
  const [countries,       setCountries]       = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [arcs,            setArcs]            = useState([]);
  const [globeReady,      setGlobeReady]      = useState(false);
  const [blink,           setBlink]           = useState(false);
  const [globalRisk,      setGlobalRisk]      = useState(null); // null = loading

  // ── NEW: view toggle ──────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState("globe");

  // ── Right panel — IDENTICAL TO ORIGINAL ──────────────────────────────────
  const [activeTab,    setActiveTab]    = useState("Forex");
  const [tabVisible,   setTabVisible]   = useState(true);
  const [fxData,       setFxData]       = useState({});
  const [fxLoading,    setFxLoading]    = useState(false);
  const [fxLastUpdate, setFxLastUpdate] = useState(null);
  const [selectedPair, setSelectedPair] = useState(SKELETON("XAU/USD"));

  // ── NEW: real news cache, keyed by API country name ───────────────────────
  const [intelCache, setIntelCache] = useState({});

  // ── NEW: fetch real global risk score from backend every 60s ───────────────
  useEffect(() => {
    const fetchGlobalRisk = async () => {
      try {
        const res  = await fetch(`${API}/intelligence/global`);
        const json = await res.json();
        if (typeof json.global_risk_score === "number") {
          setGlobalRisk(json.global_risk_score);
        }
      } catch { /* backend offline — keep last value */ }
    };
    fetchGlobalRisk();
    const id = setInterval(fetchGlobalRisk, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Blink — uses live risk ───────────────────────────────────────────────
  const currentRisk = globalRisk ?? 8.4; // fall back to 8.4 until backend responds
  useEffect(() => {
    if (currentRisk <= 7) { setBlink(false); return; }
    const t = setInterval(() => setBlink(p => !p), 900);
    return () => clearInterval(t);
  }, [currentRisk]);

  // ── newsData — IDENTICAL TO ORIGINAL (drives globe colors only) ───────────
  const newsData = useMemo(() => [
    { url: "#", title: "Nordic Defense spending increases amid Baltic tension",  published: "2026-03-12", signal: { signal: "WATCH",   sentiment: { label: "NEUTRAL",  score: 0.50 }, countries: ["Norway", "Sweden", "Finland"],          strength: 4.5 } },
    { url: "#", title: "Middle East Energy Corridors Secured",                  published: "2026-03-13", signal: { signal: "BUY",     sentiment: { label: "POSITIVE", score: 0.80 }, countries: ["Saudi Arabia", "United Arab Emirates"], strength: 8.2 } },
    { url: "#", title: "Escalation in Donbas: Frontline shifts detected",       published: "2026-03-13", signal: { signal: "SELL",    sentiment: { label: "NEGATIVE", score: 0.98 }, countries: ["Ukraine", "Russia"],                    strength: 9.5 } },
    { url: "#", title: "TSMC expands Arizona facility; Taiwan risk priced in",  published: "2026-03-11", signal: { signal: "BUY",     sentiment: { label: "POSITIVE", score: 0.70 }, countries: ["Taiwan", "United States of America"],   strength: 6.8 } },
    { url: "#", title: "Strait of Hormuz Naval Exercises",                      published: "2026-03-12", signal: { signal: "SELL",    sentiment: { label: "NEGATIVE", score: 0.85 }, countries: ["Iran", "Israel"],                       strength: 8.9 } },
    { url: "#", title: "Germany Manufacturing PMI hits 3-year low",             published: "2026-03-10", signal: { signal: "SELL",    sentiment: { label: "NEGATIVE", score: 0.60 }, countries: ["Germany"],                              strength: 5.2 } },
    { url: "#", title: "India-UK Free Trade Agreement finalized",               published: "2026-03-13", signal: { signal: "BUY",     sentiment: { label: "POSITIVE", score: 0.90 }, countries: ["India", "United Kingdom"],              strength: 7.4 } },
    { url: "#", title: "Brazil Agritech exports surge to record highs",         published: "2026-03-12", signal: { signal: "BUY",     sentiment: { label: "POSITIVE", score: 0.75 }, countries: ["Brazil"],                               strength: 6.1 } },
    { url: "#", title: "South China Sea diplomatic standoff",                   published: "2026-03-09", signal: { signal: "WATCH",   sentiment: { label: "NEGATIVE", score: 0.70 }, countries: ["China", "Philippines", "Vietnam"],      strength: 7.1 } },
    { url: "#", title: "US Dollar Index stabilizes after Fed minutes",          published: "2026-03-13", signal: { signal: "NEUTRAL", sentiment: { label: "NEUTRAL",  score: 0.40 }, countries: ["United States of America"],             strength: 3.0 } },
  ], []);

  // ── NEW: fetch real news when country is clicked ──────────────────────────
  // Using a ref to avoid stale closure issues with intelCache
  const intelCacheRef = useRef({});
  intelCacheRef.current = intelCache;

  useEffect(() => {
    if (!selectedCountry) return;
    const geoName = selectedCountry.properties.NAME;
    const apiName = toApiName(geoName);

    // Skip if already fetched or currently loading
    const cached = intelCacheRef.current[apiName];
    if (cached?.articles !== undefined || cached?.loading) return;

    setIntelCache(prev => ({ ...prev, [apiName]: { loading: true } }));

    Promise.all([
      fetch(`${API}/intelligence/news?country=${encodeURIComponent(apiName)}&max_results=6`),
      fetch(`${API}/intelligence/signals?country=${encodeURIComponent(apiName)}`),
    ])
      .then(async ([newsRes, sigRes]) => {
        const newsJson = await newsRes.json();
        const sigJson  = await sigRes.json();
        setIntelCache(prev => ({
          ...prev,
          [apiName]: {
            loading:    false,
            articles:   newsJson.articles  || [],
            signal:     sigJson.signal     || "WATCH",
            confidence: sigJson.confidence || 0.5,
            reasoning:  sigJson.reasoning  || "",
          },
        }));
      })
      .catch(() => {
        setIntelCache(prev => ({
          ...prev,
          [apiName]: { loading: false, articles: [], error: true },
        }));
      });
  }, [selectedCountry]);

  // ── FX fetch — IDENTICAL TO ORIGINAL ─────────────────────────────────────
  const fetchFX = async () => {
    setFxLoading(true);
    try {
      const res  = await fetch(`${API}/market/fx`);
      const json = await res.json();
      if (res.ok) {
        setFxData(json);
        setFxLastUpdate(new Date().toLocaleTimeString());
        setSelectedPair(prev => {
          const fresh = json[prev.pair];
          return fresh ? { ...fresh, loading: false } : prev;
        });
      }
    } catch { /* backend offline */ }
    finally { setFxLoading(false); }
  };

  useEffect(() => {
    fetchFX();
    const id = setInterval(fetchFX, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── GeoJSON — IDENTICAL TO ORIGINAL ──────────────────────────────────────
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data.features));
  }, []);

  // ── Point to Asia — IDENTICAL TO ORIGINAL ────────────────────────────────
  useEffect(() => {
    if (globeReady && globeRef.current) {
      globeRef.current.pointOfView({ lat: 38.0, lng: -97.0, altitude: 2.2 }, 0);
    }
  }, [globeReady]);

  // ── Auto-rotate — IDENTICAL TO ORIGINAL ──────────────────────────────────
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate      = !selectedCountry;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.15;
  }, [selectedCountry]);

  // ── countryData — IDENTICAL TO ORIGINAL ──────────────────────────────────
  const countryData = useMemo(() => {
    return countries.map(feature => {
      const name = feature.properties.NAME;
      let lat = feature.properties.LABEL_Y;
      let lng = feature.properties.LABEL_X;

      if (!lat || !lng || ["France", "United States of America", "Norway"].includes(name)) {
        const polyCoords = feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0][0]
          : feature.geometry.coordinates[0][0][0];
        lng = polyCoords[0];
        lat = polyCoords[1];
      }

      const relevantNews = newsData.filter(n => n.signal.countries.includes(name));
      let riskScore = ["Ukraine", "Russia", "Israel", "Iran", "North Korea"].includes(name) ? 6.0 : 0;
      relevantNews.forEach(n => {
        if (n.signal.sentiment.label === "NEGATIVE") riskScore += n.signal.strength * 0.4;
        if (n.signal.signal === "BUY")  riskScore -= 1.0;
        if (n.signal.signal === "SELL") riskScore += 1.5;
      });

      const finalRisk = Math.min(Math.max(riskScore, 0), 10);
      let color = "rgba(0,120,255,0.4)";
      if      (finalRisk >= 7.0) color = "rgba(220,0,0,0.9)";
      else if (finalRisk >= 5.0) color = "rgba(255,140,0,0.8)";
      else if (finalRisk >= 3.0) color = "rgba(255,220,0,0.7)";
      else if (finalRisk >= 1.0) color = "rgba(0,200,255,0.55)";

      const signalType = relevantNews.some(n => n.signal.signal === "BUY")  ? "BUY"
                       : relevantNews.some(n => n.signal.signal === "SELL") ? "SELL"
                       : "NONE";

      return { ...feature, riskScore: finalRisk, color, relevantNews, signalType, coords: { lat, lng } };
    });
  }, [countries, newsData]);

  // ── Arcs — IDENTICAL TO ORIGINAL ─────────────────────────────────────────
  useEffect(() => {
    if (countryData.length === 0) return;
    const interval = setInterval(() => {
      setArcs(prev => {
        const list  = prev.length >= 12 ? prev.slice(1) : prev;
        const start = countryData[Math.floor(Math.random() * countryData.length)];
        const end   = countryData[Math.floor(Math.random() * countryData.length)];
        if (!start || !end || start === end) return prev;
        const hot = start.riskScore > 5 || end.riskScore > 5;
        return [...list, {
          startLat: start.coords.lat, startLng: start.coords.lng,
          endLat:   end.coords.lat,   endLng:   end.coords.lng,
          color: hot
            ? ["rgba(255,0,0,1)",   "rgba(255,100,100,0.1)"]
            : ["rgba(0,255,255,1)", "rgba(255,255,255,0.1)"],
          id: Math.random(),
        }];
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [countryData]);

  // ── Helpers — IDENTICAL TO ORIGINAL ──────────────────────────────────────
  const switchTab = (tab) => {
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      const firstKey  = TAB_PAIRS[tab][0];
      const firstPair = fxData[firstKey] ? { ...fxData[firstKey], loading: false } : SKELETON(firstKey);
      setSelectedPair(firstPair);
      setTabVisible(true);
    }, 200);
  };

  const signalBadgeClass = (sig) => {
    if (sig === "BUY")  return "text-emerald-400 bg-emerald-400/10";
    if (sig === "SELL") return "text-rose-400 bg-rose-400/10";
    return "text-amber-400 bg-amber-400/10";
  };

  const currentPairs = TAB_PAIRS[activeTab].map(key =>
    fxData[key] ? { ...fxData[key], loading: false } : SKELETON(key)
  );

  const riskColor  = currentRisk >= 8 ? "#dc0000" : currentRisk >= 6 ? "#ff8c00" : currentRisk >= 4 ? "#ffdc00" : "#00c8ff";
  const riskLabel  = currentRisk >= 8 ? "Critical" : currentRisk >= 6 ? "Elevated" : currentRisk >= 4 ? "Moderate" : "Stable";
  const scrollStyle = { scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,255,0.15) transparent" };

  const selApiName = selectedCountry ? toApiName(selectedCountry.properties.NAME) : null;
  const selIntel   = selApiName ? intelCache[selApiName] : null;

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden text-slate-200">

      {/* ══════════════════════════════════════════════════
          NEW: 3-BUTTON TOGGLE — top center
          Globe View | Market Analysis | AI Signals
      ══════════════════════════════════════════════════ */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#020617]/80 border border-white/10 rounded-xl p-1 backdrop-blur-md">
        {[
          { key: "globe",  label: "Globe View",
            icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" },
          { key: "market", label: "Market Analysis",
            icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          { key: "ai",     label: "AI Signals",
            icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => {
              if (v.key === "market") { router.push("/map-analysis"); return; }
              setActiveView(v.key);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-200 ${
              activeView === v.key
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={v.icon} />
            </svg>
            {v.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          GLOBE VIEW — every single line identical to original
          Only change: sidebar body shows real news instead of newsData
      ════════════════════════════════════════════════════════ */}
      {activeView === "globe" && (
        <>
          {/* ── GLOBE — 100% IDENTICAL ── */}
          <Globe
            ref={globeRef}
            onGlobeReady={() => setTimeout(() => setGlobeReady(true), 0)}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            polygonsData={countryData}
            polygonCapColor={d => d.color}
            polygonSideColor={() => "rgba(0,10,25,0.4)"}
            polygonStrokeColor={d =>
              d.properties.NAME === selectedCountry?.properties.NAME ? "#00ffff" : "rgba(255,255,255,0.1)"
            }
            polygonAltitude={d =>
              d.properties.NAME === selectedCountry?.properties.NAME ? 0.15 :
              d.signalType !== "NONE" ? 0.07 : 0.01
            }
            onPolygonClick={d => {
              if (selectedCountry?.properties.NAME === d.properties.NAME) {
                setSelectedCountry(null);
              } else {
                setSelectedCountry(d);
                if (d.coords.lat !== 0) {
                  globeRef.current?.pointOfView({ lat: d.coords.lat, lng: d.coords.lng, altitude: 1.8 }, 1000);
                }
              }
            }}
            arcsData={arcs}
            arcKey="id"
            arcColor={d => d.color}
            arcDashLength={1.2}
            arcDashGap={1}
            arcDashAnimateTime={1200}
            arcStroke={0.5}
            arcAltitude={0.2}
            arcsTransitionDuration={0}
            atmosphereColor="#00d4ff"
            atmosphereAltitude={0.15}
          />

          {/* ── TOP LEFT — IDENTICAL ── */}
          <div className="absolute top-8 left-8 z-10 pointer-events-none flex flex-row items-start gap-5">
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-2xl font-black italic text-white tracking-tighter uppercase leading-none font-mono">
                  MARS<span className="text-cyan-400">Terminal</span>
                </h1>
                <p className="text-[10px] font-mono text-cyan-400/50 mt-1 uppercase tracking-[0.4em]">
                  Live Intelligence Feed
                </p>
              </div>
              <div className="bg-[#020617]/80 border border-cyan-500/20 rounded-xl px-4 py-3 backdrop-blur-md max-w-[240px]">
                <p className="font-mono text-[10px] text-cyan-300/80 leading-relaxed tracking-wide uppercase">
                  AI-powered geopolitical risk platform mapping global conflicts and trading signals in real-time.
                </p>
              </div>
            </div>
            <div className="bg-[#020617]/80 border border-cyan-500/20 rounded-xl px-4 py-3 backdrop-blur-md flex flex-col gap-2" style={{ minWidth: 190 }}>
              <p className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.35em] leading-none">Global Market Risk</p>
              <div className="relative h-2 rounded-full overflow-hidden border border-white/10"
                style={{ width: 200, background: "linear-gradient(to right, #0078ff, #00c8ff, #ffdc00, #ff8c00, #dc0000)" }}>
                <div className="absolute top-0 h-full w-[3px] bg-white rounded-full"
                  style={{ left: `${(currentRisk / 10) * 100}%`, transform: "translateX(-50%)", boxShadow: "0 0 6px 1px rgba(255,255,255,0.7)" }} />
              </div>
              {globalRisk === null ? (
                <p className="text-[11px] font-mono text-slate-600 animate-pulse">Calculating risk...</p>
              ) : (
                <p className="text-[13px] font-black font-mono tracking-wide leading-none"
                  style={{ color: riskColor, opacity: currentRisk > 7 ? (blink ? 1 : 0.35) : 1, transition: "opacity 0.3s ease" }}>
                  {currentRisk.toFixed(1)}<span className="text-[10px] font-bold text-slate-500"> / 10</span>
                  <span className="ml-1.5 text-[10px] font-bold" style={{ color: riskColor }}>{riskLabel}</span>
                </p>
              )}
              <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.28em] leading-none">Geopolitical + Macro Stress</p>
            </div>
          </div>

          {/* ── BOTTOM LEFT LEGEND — IDENTICAL ── */}
          <div className="absolute bottom-10 left-8 z-10 pointer-events-none bg-[#020617]/80 border border-cyan-500/20 rounded-xl px-4 py-3 backdrop-blur-md">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-2">Country Risk Level</p>
            <div className="flex items-center gap-3">
              {RISK_LEGEND.map(({ color, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div style={{ backgroundColor: color, width: 18, height: 18, borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", boxShadow: `0 0 6px ${color}55` }} />
                  <span className="text-[8px] font-mono text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── LEFT SIDEBAR — layout identical, body shows real news ── */}
          <div
            className="absolute top-0 left-0 h-full w-[370px] z-20 flex flex-col bg-[#020617]/70 backdrop-blur-2xl border-r border-white/10 transition-all duration-500 ease-in-out"
            style={{
              transform:     selectedCountry ? "translateX(0)" : "translateX(-100%)",
              opacity:       selectedCountry ? 1 : 0,
              pointerEvents: selectedCountry ? "auto" : "none",
            }}
          >
            {selectedCountry && (
              <>
                {/* Header — IDENTICAL layout */}
                <div className="p-6 pb-4 border-b border-white/5 relative flex-shrink-0">
                  <button onClick={() => setSelectedCountry(null)} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h2 className="text-2xl font-bold text-cyan-400 tracking-tight mb-1 uppercase font-mono">
                    {selectedCountry.properties.NAME}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-300">
                      RISK RATING: <span className="font-bold">{selectedCountry.riskScore.toFixed(1)}</span>
                    </div>
                    {selIntel && !selIntel.loading && selIntel.signal && (
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${signalBadgeClass(selIntel.signal)}`}>
                        {selIntel.signal}
                        {selIntel.confidence != null && (
                          <span className="ml-1 opacity-60">{(selIntel.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                  {selIntel?.reasoning && (
                    <p className="text-[10px] font-mono text-slate-500 mt-2 leading-relaxed">{selIntel.reasoning}</p>
                  )}
                </div>

                {/* Body — REAL news from backend */}
                <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-3" style={scrollStyle}>

                  {selIntel?.loading && (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest animate-pulse">
                        Fetching live intelligence...
                      </p>
                    </div>
                  )}

                  {selIntel?.error && (
                    <p className="text-[11px] font-mono text-rose-400/60 text-center mt-8">
                      Could not fetch live news. Make sure backend is running at localhost:8000.
                    </p>
                  )}

                  {selIntel?.articles?.map((article, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{article.source}</span>
                        <span className="text-[10px] font-mono text-slate-500">{article.published}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 leading-relaxed mb-2">{article.title}</h4>
                      {article.description && (
                        <p className="text-[10px] text-slate-500 leading-relaxed mb-2 line-clamp-2">{article.description}</p>
                      )}
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest hover:text-white transition-colors">
                        Read Article
                      </a>
                    </div>
                  ))}

                  {!selIntel?.loading && !selIntel?.error && selIntel?.articles?.length === 0 && (
                    <p className="text-[11px] font-mono text-slate-500 text-center mt-10">
                      No active intelligence signals for this region.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT PANEL — IDENTICAL TO ORIGINAL ── */}
          <div className="absolute top-0 right-0 h-full w-[300px] z-20 flex flex-col bg-[#020617]/75 backdrop-blur-2xl border-l border-white/10">
            <div className="px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black italic uppercase tracking-widest text-white font-mono">
                  MARS<span className="text-cyan-400">FX</span>
                </h2>
                {fxLastUpdate && (
                  <span className="text-[8px] font-mono text-slate-600">
                    {fxLoading ? "Updating..." : `Updated ${fxLastUpdate}`}
                  </span>
                )}
              </div>
              <p className="text-[9px] font-mono text-cyan-400/30 mt-0.5 uppercase tracking-[0.25em]">Markets Intelligence</p>
              <Link href="/map-analysis" prefetch={true}
                className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all group">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Market Analysis</span>
                </div>
                <svg className="w-3.5 h-3.5 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="flex border-b border-white/5 flex-shrink-0">
              {TABS.map(tab => (
                <button key={tab} onClick={() => switchTab(tab)}
                  className={`flex-1 py-2.5 text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-200 ${
                    activeTab === tab
                      ? "text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border-b-2 border-transparent"
                  }`}>{tab}</button>
              ))}
            </div>

            <div className="px-3 pt-3 pb-3 border-b border-white/5 flex flex-col gap-1 flex-shrink-0 transition-opacity duration-200" style={{ opacity: tabVisible ? 1 : 0 }}>
              {currentPairs.map(fp => (
                <button key={fp.pair} onClick={() => setSelectedPair(fp)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all text-left ${
                    selectedPair.pair === fp.pair
                      ? "bg-cyan-500/10 border border-cyan-500/30"
                      : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]"
                  }`}>
                  <span className="text-[11px] font-bold text-white font-mono">{fp.pair}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono ${fp.loading ? "text-slate-600 animate-pulse" : "text-slate-200"}`}>{fp.price}</span>
                    <span className={`text-[10px] font-bold ${fp.loading ? "text-slate-600" : fp.positive ? "text-emerald-400" : "text-rose-400"}`}>{fp.change}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 transition-opacity duration-200"
              style={{ opacity: tabVisible ? 1 : 0, scrollbarWidth: "thin", scrollbarColor: "rgba(0,255,255,0.15) transparent" }}>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em]">{selectedPair.name}</p>
              <div className="flex items-end gap-2 mt-1 mb-4">
                <span className={`text-2xl font-black font-mono ${selectedPair.loading ? "text-slate-600 animate-pulse" : "text-white"}`}>{selectedPair.price}</span>
                {!selectedPair.loading && (
                  <span className={`text-sm font-bold mb-0.5 ${selectedPair.positive ? "text-emerald-400" : "text-rose-400"}`}>
                    {selectedPair.changeAbs} ({selectedPair.change})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Bid",    value: selectedPair.bid,    cls: "" },
                  { label: "Ask",    value: selectedPair.ask,    cls: "" },
                  { label: "High",   value: selectedPair.high,   cls: "" },
                  { label: "Low",    value: selectedPair.low,    cls: "" },
                  { label: "Volume", value: selectedPair.volume, cls: "" },
                  { label: "Signal",
                    value: selectedPair.loading ? "--" : selectedPair.positive ? "BUY" : "SELL",
                    cls:   selectedPair.loading ? "text-slate-600" : selectedPair.positive ? "text-emerald-400" : "text-rose-400" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
                    <p className={`text-[12px] font-bold font-mono ${cls || (selectedPair.loading ? "text-slate-600 animate-pulse" : "text-slate-200")}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">Price Action (24h)</p>
                <svg viewBox="0 0 240 44" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={selectedPair.positive ? "#34d399" : "#f87171"} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={selectedPair.positive ? "#34d399" : "#f87171"} stopOpacity="0"   />
                    </linearGradient>
                  </defs>
                  {selectedPair.positive ? (
                    <><path d="M0 38 C30 32,60 26,90 22 S140 14,170 10 S210 6,240 2" stroke="#34d399" strokeWidth="1.5" /><path d="M0 38 C30 32,60 26,90 22 S140 14,170 10 S210 6,240 2 V44 H0Z" fill="url(#sg)" /></>
                  ) : (
                    <><path d="M0 4 C30 10,60 16,90 20 S140 28,170 32 S210 38,240 42" stroke="#f87171" strokeWidth="1.5" /><path d="M0 4 C30 10,60 16,90 20 S140 28,170 32 S210 38,240 42 V44 H0Z" fill="url(#sg)" /></>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          AI SIGNALS VIEW
      ════════════════════════════════════════════ */}
      {activeView === "ai" && (
        <div className="w-full h-full pt-14">
          <AISignalsView />
        </div>
      )}

    </div>
  );
}