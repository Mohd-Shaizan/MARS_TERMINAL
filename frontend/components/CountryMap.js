"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO numeric → alpha-2 for ALL countries with market data
const NUMERIC_TO_ALPHA2 = {
  // Major markets
  "840": "US", "356": "IN", "156": "CN", "392": "JP", "276": "DE",
  "826": "GB", "250": "FR", "410": "KR", "036": "AU", "124": "CA",
  "076": "BR", "643": "RU", "484": "MX", "380": "IT", "724": "ES",
  "528": "NL", "756": "CH", "752": "SE", "578": "NO", "208": "DK",
  "246": "FI", "040": "AT", "056": "BE", "620": "PT", "300": "GR",
  // Asia Pacific
  "344": "HK", "158": "TW", "702": "SG", "764": "TH", "360": "ID",
  "458": "MY", "608": "PH", "704": "VN", "050": "BD", "144": "LK",
  "524": "NP", "104": "MM", "116": "KH", "418": "LA", "096": "BN",
  // Middle East
  "682": "SA", "784": "AE", "634": "QA", "414": "KW", "048": "BH",
  "512": "OM", "376": "IL", "400": "JO", "422": "LB", "368": "IQ",
  "364": "IR", "792": "TR",
  // Africa
  "710": "ZA", "818": "EG", "566": "NG", "404": "KE", "504": "MA",
  "788": "TN", "012": "DZ", "288": "GH", "716": "ZW", "800": "UG",
  "834": "TZ", "508": "MZ", "024": "AO", "072": "BW",
  // Americas
  "032": "AR", "152": "CL", "170": "CO", "604": "PE", "858": "UY",
  "068": "BO", "600": "PY", "218": "EC", "862": "VE", "192": "CU",
  "214": "DO", "320": "GT", "340": "HN", "558": "NI", "188": "CR",
  "591": "PA",
  // Eastern Europe / Central Asia
  "616": "PL", "203": "CZ", "348": "HU", "703": "SK", "191": "HR",
  "642": "RO", "100": "BG", "688": "RS", "804": "UA", "112": "BY",
  "792": "TR", "398": "KZ", "860": "UZ",
  // South Asia
  "586": "PK", "050": "BD",
  // Oceania
  "554": "NZ", "598": "PG",
  // Other
  "710": "ZA",
};

// Countries that have full market data (stocks + futures + options)
const FULL_DATA = new Set([
  "US","IN","CN","JP","DE","GB","FR","KR","AU","CA","BR","RU","MX","IT",
  "ES","NL","CH","SE","NO","HK","TW","SG","TH","ID","MY","PH","SA","AE",
  "QA","IL","ZA","EG","NG","AR","CL","CO","NZ","TR","PK","VN","PL",
]);

// Countries with forex data only
const FOREX_ONLY = new Set([
  "DK","FI","AT","BE","PT","GR","KW","BH","OM","JO","KE","MA","TN","DZ",
  "GH","UG","TZ","MZ","AO","BW","PE","UY","BO","PY","EC","GT","HN","CR",
  "CZ","HU","SK","HR","RO","BG","RS","UA","BY","KZ","UZ","DO","IR","IQ",
]);

export default function CountryMap({ onCountrySelect, selectedCode }) {
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom]       = useState(1);

  const getAlpha2 = (geo) => {
    const id = String(geo.id || "").padStart(3, "0");
    return NUMERIC_TO_ALPHA2[id] || null;
  };

  const getFill = (geo) => {
    const a2 = getAlpha2(geo);
    if (!a2) return "#07111f";
    if (a2 === selectedCode) return "#00ffff";
    if (FULL_DATA.has(a2))   return "#0e2a4a";
    if (FOREX_ONLY.has(a2))  return "#0a1f38";
    return "#07111f";
  };

  const getStroke = (geo) => {
    const a2 = getAlpha2(geo);
    if (!a2) return "#0d1f30";
    if (a2 === selectedCode) return "#00ffff";
    if (FULL_DATA.has(a2))   return "#1e4a7a";
    if (FOREX_ONLY.has(a2))  return "#152a40";
    return "#0d1f30";
  };

  return (
    <div className="relative w-full h-full bg-[#020c1b]">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none px-3 py-1.5 bg-[#020617]/95 border border-cyan-500/30 rounded-lg text-[11px] font-mono text-cyan-300 shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <span className="font-bold">{tooltip.name}</span>
          {tooltip.type === "full"  && <span className="ml-2 text-emerald-400 text-[9px]">Full data</span>}
          {tooltip.type === "forex" && <span className="ml-2 text-amber-400 text-[9px]">Forex only</span>}
          {tooltip.type === "none"  && <span className="ml-2 text-slate-600 text-[9px]">No data</span>}
        </div>
      )}

      <ComposableMap
        projection="geoMercator"
        style={{ width: "100%", height: "100%" }}
        projectionConfig={{ scale: 140, center: [20, 20] }}
      >
        <ZoomableGroup
          zoom={zoom}
          minZoom={0.8}
          maxZoom={8}
          onMoveEnd={({ zoom: z }) => setZoom(z)}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const alpha2    = getAlpha2(geo);
                const hasFull   = FULL_DATA.has(alpha2);
                const hasForex  = FOREX_ONLY.has(alpha2);
                const clickable = hasFull || hasForex;
                const type      = hasFull ? "full" : hasForex ? "forex" : "none";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(geo)}
                    stroke={getStroke(geo)}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        outline: "none",
                        fill: alpha2 === selectedCode ? "#00ffff"
                            : hasFull  ? "#164e78"
                            : hasForex ? "#102a45"
                            : "#07111f",
                        cursor: clickable ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => setTooltip({
                      name: geo.properties.name,
                      code: alpha2,
                      type,
                      x: e.clientX,
                      y: e.clientY,
                    })}
                    onMouseMove={(e) => setTooltip(prev =>
                      prev ? { ...prev, x: e.clientX, y: e.clientY } : prev
                    )}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (clickable && alpha2) onCountrySelect(alpha2);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-5 pointer-events-none bg-[#020617]/70 border border-white/5 rounded-lg px-4 py-2 backdrop-blur-sm">
        {[
          { color: "#0e2a4a", border: "#1e4a7a", label: "Full market data" },
          { color: "#0a1f38", border: "#152a40", label: "Forex data only"  },
          { color: "#07111f", border: "#0d1f30", label: "No data"          },
          { color: "#00ffff", border: "#00ffff", label: "Selected"         },
        ].map(({ color, border, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, border: `1px solid ${border}` }} />
            <span className="text-[9px] font-mono text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        {[
          { label: "+", action: () => setZoom(z => Math.min(z * 1.5, 8)) },
          { label: "−", action: () => setZoom(z => Math.max(z / 1.5, 0.8)) },
          { label: "⌂", action: () => setZoom(1) },
        ].map(({ label, action }) => (
          <button key={label} onClick={action}
            className="w-7 h-7 rounded bg-[#020617]/80 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 text-sm font-mono flex items-center justify-center transition-all">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}