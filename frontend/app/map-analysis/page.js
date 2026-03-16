"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MarketChart from "../../components/MarketChart";

const API = "http://localhost:8000";

const CountryMap = dynamic(() => import("../../components/CountryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#020c1b] gap-3">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest animate-pulse">Loading map...</p>
    </div>
  ),
});

const COUNTRY_NAMES = {
  "US":"United States","IN":"India",        "CN":"China",         "JP":"Japan",
  "DE":"Germany",      "GB":"United Kingdom","FR":"France",        "KR":"South Korea",
  "AU":"Australia",    "CA":"Canada",        "BR":"Brazil",        "RU":"Russia",
  "MX":"Mexico",       "IT":"Italy",         "ES":"Spain",         "NL":"Netherlands",
  "CH":"Switzerland",  "SE":"Sweden",        "NO":"Norway",        "DK":"Denmark",
  "FI":"Finland",      "AT":"Austria",       "BE":"Belgium",       "PT":"Portugal",
  "GR":"Greece",       "HK":"Hong Kong",     "TW":"Taiwan",        "SG":"Singapore",
  "TH":"Thailand",     "ID":"Indonesia",     "MY":"Malaysia",      "PH":"Philippines",
  "VN":"Vietnam",      "SA":"Saudi Arabia",  "AE":"UAE",           "QA":"Qatar",
  "KW":"Kuwait",       "BH":"Bahrain",       "OM":"Oman",          "IL":"Israel",
  "JO":"Jordan",       "TR":"Turkey",        "ZA":"South Africa",  "EG":"Egypt",
  "NG":"Nigeria",      "KE":"Kenya",         "MA":"Morocco",       "TN":"Tunisia",
  "DZ":"Algeria",      "GH":"Ghana",         "AR":"Argentina",     "CL":"Chile",
  "CO":"Colombia",     "PE":"Peru",          "UY":"Uruguay",       "BO":"Bolivia",
  "PY":"Paraguay",     "EC":"Ecuador",       "NZ":"New Zealand",   "PK":"Pakistan",
  "PL":"Poland",       "CZ":"Czech Republic","HU":"Hungary",       "SK":"Slovakia",
  "HR":"Croatia",      "RO":"Romania",       "BG":"Bulgaria",      "RS":"Serbia",
  "UA":"Ukraine",      "BY":"Belarus",       "KZ":"Kazakhstan",    "UZ":"Uzbekistan",
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD:"$", EUR:"€", GBP:"£", JPY:"¥", CNY:"¥", INR:"₹", KRW:"₩",
  AUD:"A$", CAD:"C$", CHF:"Fr", SEK:"kr", NOK:"kr", DKK:"kr",
  BRL:"R$", MXN:"$", RUB:"₽", TRY:"₺", ZAR:"R", SGD:"S$",
  HKD:"HK$", TWD:"NT$", THB:"฿", IDR:"Rp", MYR:"RM", PHP:"₱",
  VND:"₫", SAR:"﷼", AED:"د.إ", QAR:"﷼", ILS:"₪", EGP:"E£",
  NGN:"₦", PKR:"₨", PLN:"zł", CZK:"Kč", HUF:"Ft", RON:"lei",
  ARS:"$", CLP:"$", COP:"$", PEN:"S/", NZD:"NZ$",
};

// Countries where forex is default view
const FOREX_DEFAULT = new Set([
  "RU","IR","IQ","LB","BY","VE","ZW","CU","SY","DK","FI","AT","BE",
  "PT","GR","KW","BH","OM","JO","KE","MA","TN","DZ","GH","UG","TZ",
  "MZ","AO","BW","PE","UY","BO","PY","EC","GT","HN","CR","CZ","HU",
  "SK","HR","RO","BG","RS","UA","KZ","UZ","DO",
]);

// Country metadata
const COUNTRY_META = {
  "US":{"currency":"USD","gdp":"$27.4T","inflation":"3.2%","rate":"5.25%","exchange":"NYSE / NASDAQ"},
  "IN":{"currency":"INR","gdp":"$3.7T","inflation":"5.1%","rate":"6.50%","exchange":"NSE / BSE"},
  "CN":{"currency":"CNY","gdp":"$17.8T","inflation":"0.3%","rate":"3.45%","exchange":"SSE / SZSE"},
  "JP":{"currency":"JPY","gdp":"$4.2T","inflation":"3.2%","rate":"-0.10%","exchange":"Tokyo SE"},
  "DE":{"currency":"EUR","gdp":"$4.1T","inflation":"2.3%","rate":"4.50%","exchange":"XETRA"},
  "GB":{"currency":"GBP","gdp":"$3.1T","inflation":"4.0%","rate":"5.25%","exchange":"LSE"},
  "FR":{"currency":"EUR","gdp":"$2.9T","inflation":"2.4%","rate":"4.50%","exchange":"Euronext Paris"},
  "KR":{"currency":"KRW","gdp":"$1.7T","inflation":"3.6%","rate":"3.50%","exchange":"KRX"},
  "AU":{"currency":"AUD","gdp":"$1.7T","inflation":"4.1%","rate":"4.35%","exchange":"ASX"},
  "CA":{"currency":"CAD","gdp":"$2.1T","inflation":"3.4%","rate":"5.00%","exchange":"TSX"},
  "BR":{"currency":"BRL","gdp":"$2.1T","inflation":"4.6%","rate":"10.75%","exchange":"B3"},
  "RU":{"currency":"RUB","gdp":"$2.2T","inflation":"7.5%","rate":"16.00%","exchange":"MOEX (Sanctioned)"},
  "MX":{"currency":"MXN","gdp":"$1.3T","inflation":"4.7%","rate":"11.25%","exchange":"BMV"},
  "IT":{"currency":"EUR","gdp":"$2.1T","inflation":"0.6%","rate":"4.50%","exchange":"Borsa Italiana"},
  "ES":{"currency":"EUR","gdp":"$1.6T","inflation":"3.3%","rate":"4.50%","exchange":"BME"},
  "NL":{"currency":"EUR","gdp":"$1.0T","inflation":"2.7%","rate":"4.50%","exchange":"Euronext AMS"},
  "CH":{"currency":"CHF","gdp":"$0.9T","inflation":"1.7%","rate":"1.75%","exchange":"SIX Swiss"},
  "SE":{"currency":"SEK","gdp":"$0.6T","inflation":"8.5%","rate":"4.00%","exchange":"Nasdaq OMX"},
  "NO":{"currency":"NOK","gdp":"$0.6T","inflation":"4.8%","rate":"4.50%","exchange":"Oslo Bors"},
  "SA":{"currency":"SAR","gdp":"$1.1T","inflation":"1.6%","rate":"6.00%","exchange":"Tadawul"},
  "AE":{"currency":"AED","gdp":"$0.5T","inflation":"3.1%","rate":"5.40%","exchange":"DFM / ADX"},
  "SG":{"currency":"SGD","gdp":"$0.5T","inflation":"3.6%","rate":"3.68%","exchange":"SGX"},
  "HK":{"currency":"HKD","gdp":"$0.4T","inflation":"2.1%","rate":"5.75%","exchange":"HKEX"},
  "TW":{"currency":"TWD","gdp":"$0.8T","inflation":"2.5%","rate":"2.00%","exchange":"TWSE"},
  "TR":{"currency":"TRY","gdp":"$1.1T","inflation":"65.0%","rate":"45.00%","exchange":"Borsa Istanbul"},
  "ZA":{"currency":"ZAR","gdp":"$0.4T","inflation":"5.9%","rate":"8.25%","exchange":"JSE"},
  "EG":{"currency":"EGP","gdp":"$0.4T","inflation":"35.0%","rate":"21.25%","exchange":"EGX"},
  "NG":{"currency":"NGN","gdp":"$0.5T","inflation":"28.9%","rate":"18.75%","exchange":"NGX"},
  "IL":{"currency":"ILS","gdp":"$0.5T","inflation":"3.7%","rate":"4.75%","exchange":"TASE"},
  "TH":{"currency":"THB","gdp":"$0.5T","inflation":"1.2%","rate":"2.50%","exchange":"SET"},
  "ID":{"currency":"IDR","gdp":"$1.4T","inflation":"2.6%","rate":"6.00%","exchange":"IDX"},
  "MY":{"currency":"MYR","gdp":"$0.4T","inflation":"1.8%","rate":"3.00%","exchange":"Bursa Malaysia"},
  "PH":{"currency":"PHP","gdp":"$0.4T","inflation":"3.9%","rate":"6.50%","exchange":"PSE"},
  "PK":{"currency":"PKR","gdp":"$0.3T","inflation":"23.0%","rate":"22.00%","exchange":"PSX"},
  "VN":{"currency":"VND","gdp":"$0.4T","inflation":"3.5%","rate":"4.50%","exchange":"HOSE"},
  "AR":{"currency":"ARS","gdp":"$0.6T","inflation":"211.0%","rate":"100.00%","exchange":"BCBA"},
  "CL":{"currency":"CLP","gdp":"$0.3T","inflation":"4.5%","rate":"6.00%","exchange":"BCS"},
  "CO":{"currency":"COP","gdp":"$0.3T","inflation":"9.3%","rate":"13.25%","exchange":"BVC"},
  "NZ":{"currency":"NZD","gdp":"$0.2T","inflation":"4.7%","rate":"5.50%","exchange":"NZX"},
  "QA":{"currency":"QAR","gdp":"$0.2T","inflation":"1.0%","rate":"6.00%","exchange":"QSE"},
  "PL":{"currency":"PLN","gdp":"$0.7T","inflation":"6.2%","rate":"5.75%","exchange":"WSE"},
};

function CountryPanel({ code, onClose }) {
  const name   = COUNTRY_NAMES[code] || code;
  const meta   = COUNTRY_META[code]  || {};
  const sym    = CURRENCY_SYMBOLS[meta.currency] || "";
  const scrollStyle = { scrollbarWidth:"thin", scrollbarColor:"rgba(0,255,255,0.15) transparent" };

  const [fxRate,    setFxRate]    = useState(null);
  const [fxHistory, setFxHistory] = useState([]);
  const [signal,    setSignal]    = useState(null);

  useEffect(() => {
    fetch(`${API}/market/country-info/${code}`)
      .then(r => r.json())
      .then(d => {
        setFxRate(d.forex_rate);
        setFxHistory(d.forex_history || []);
      }).catch(() => {});

    fetch(`${API}/intelligence/signals?country=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => setSignal(d))
      .catch(() => {});
  }, [code]);

  const signalCls = signal?.signal === "BUY"  ? "text-emerald-300 bg-emerald-400/15 border-emerald-400/40"
                  : signal?.signal === "SELL" ? "text-rose-300 bg-rose-400/15 border-rose-400/40"
                  : "text-amber-300 bg-amber-400/15 border-amber-400/40";

  // Sparkline SVG from history
  const sparkline = () => {
    if (!fxHistory.length) return null;
    const closes = fxHistory.map(d => d.Close).filter(v => v != null);
    if (!closes.length) return null;
    const min = Math.min(...closes), max = Math.max(...closes);
    const range = max - min || 1;
    const w = 220, h = 48;
    const pts = closes.map((v, i) => `${(i / (closes.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    const isPos = closes[closes.length-1] >= closes[0];
    const color = isPos ? "#34d399" : "#f87171";
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" fill="none">
        <defs>
          <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" />
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#spGrad)" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] border-r border-white/10">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black italic uppercase text-cyan-400 font-mono tracking-tight leading-none">
              {name}
            </h2>
            {meta.exchange && (
              <p className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-[0.3em]">
                {meta.exchange}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="text-slate-600 hover:text-white transition-colors p-1 rounded hover:bg-white/5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={scrollStyle}>

        {/* Currency + live rate */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-3">Currency</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-black text-cyan-400">{sym || meta.currency?.[0]}</span>
            </div>
            <div>
              <p className="text-xl font-black font-mono text-white">{meta.currency}</p>
              <p className="text-[9px] font-mono text-slate-500">
                {sym ? `Symbol: ${sym}` : ""}
              </p>
            </div>
            {fxRate && (
              <div className="ml-auto text-right">
                <p className="text-base font-bold font-mono text-white">
                  {fxRate.price?.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
                <p className={`text-[11px] font-bold ${fxRate.positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {fxRate.change}
                </p>
              </div>
            )}
          </div>
          {fxRate && (
            <p className="text-[10px] font-mono text-slate-600">
              1 USD = <span className="text-slate-400 font-bold">{sym}{fxRate.price?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span> {meta.currency}
            </p>
          )}
          {!fxRate && code === "US" && (
            <p className="text-[10px] font-mono text-slate-600">Base currency — all pairs quoted vs USD</p>
          )}
        </div>

        {/* Economic indicators */}
        {(meta.gdp || meta.inflation || meta.rate) && (
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-3">Economic Indicators</p>
            <div className="space-y-0">
              {[
                { label: "GDP (Nominal)",  value: meta.gdp,        color: "text-cyan-300"   },
                { label: "Inflation Rate", value: meta.inflation,  color: parseFloat(meta.inflation) > 10 ? "text-rose-400" : "text-emerald-400" },
                { label: "Interest Rate",  value: meta.rate,       color: parseFloat(meta.rate) > 15 ? "text-rose-400" : "text-amber-400" },
              ].map(({ label, value, color }) => value && (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-[10px] font-mono text-slate-500">{label}</span>
                  <span className={`text-sm font-black font-mono ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Signal */}
        {signal && (
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-3">AI Trading Signal</p>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1.5 rounded-lg border text-sm font-black font-mono ${signalCls}`}>
                {signal.signal}
              </span>
              {signal.confidence != null && (
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                      style={{ width: `${signal.confidence * 100}%` }} />
                  </div>
                  <p className="text-[9px] font-mono text-slate-500 mt-1">
                    {(signal.confidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
              )}
            </div>
            {signal.reasoning && (
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed">{signal.reasoning}</p>
            )}
          </div>
        )}

        {/* Forex sparkline */}
        {fxHistory.length > 0 && meta.currency !== "USD" && (
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em]">
                USD/{meta.currency} — 30 Days
              </p>
              {fxRate && (
                <span className={`text-[10px] font-bold font-mono ${fxRate.positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {fxRate.change}
                </span>
              )}
            </div>
            {sparkline()}
          </div>
        )}

      </div>
    </div>
  );
}

export default function MapAnalysis() {
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState(null);
  const [showPanel,    setShowPanel]    = useState(false);

  const handleSelect = (code) => {
    setSelectedCode(code);
    setShowPanel(true);
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#020617] overflow-hidden text-slate-200 font-mono">

      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 flex-shrink-0 bg-[#020617]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Globe View
          </button>
          <div className="w-px h-5 bg-white/10" />
          <h1 className="text-sm font-black italic uppercase tracking-tight text-white">
            MARS<span className="text-cyan-400">Terminal</span>
            <span className="ml-3 text-[10px] font-bold text-slate-500 not-italic normal-case tracking-widest">
              Market Analysis
            </span>
          </h1>
        </div>
        {selectedCode ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-cyan-400">
              {COUNTRY_NAMES[selectedCode] || selectedCode}
            </span>
          </div>
        ) : (
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            Click a country to load data
          </span>
        )}
      </div>

      {/* Main layout */}
      <div className="relative flex flex-1 min-h-0">

        {/* ── LEFT PANEL — slides over from screen left edge ── */}
        <div
          className="absolute top-0 left-0 h-full z-30 transition-all duration-500 ease-in-out"
          style={{
            width:         "300px",
            transform:     showPanel && selectedCode ? "translateX(0)" : "translateX(-100%)",
            opacity:       showPanel && selectedCode ? 1 : 0,
            pointerEvents: showPanel && selectedCode ? "auto" : "none",
            boxShadow:     "4px 0 24px rgba(0,0,0,0.6)",
          }}
        >
          {selectedCode && (
            <CountryPanel
              key={selectedCode}
              code={selectedCode}
              onClose={() => setShowPanel(false)}
            />
          )}
        </div>

        {/* ── MAP — always full width ── */}
        <div className="relative flex-1 min-w-0 bg-[#020c1b]">
          <CountryMap onCountrySelect={handleSelect} selectedCode={selectedCode} />
        </div>

        {/* ── CHART — fixed right panel ── */}
        <div className="w-[580px] flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden">
          <MarketChart
            countryCode={selectedCode}
            countryName={selectedCode ? (COUNTRY_NAMES[selectedCode] || selectedCode) : null}
            countryMeta={selectedCode ? COUNTRY_META[selectedCode] : null}
            forexDefault={selectedCode ? FOREX_DEFAULT.has(selectedCode) : false}
            currencySymbols={CURRENCY_SYMBOLS}
          />
        </div>

      </div>
    </div>
  );
}