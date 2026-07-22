import { useState } from "react";
import AQIMap from "./components/AQIMap";
import AQICard from "./components/AQICard";
import CityPanel from "./components/CityPanel";
import { useCities } from "./hooks/useAPI";
import { getAQILevel } from "./utils/aqi";

export default function App() {
  const { data, loading, refetch } = useCities();
  const [selectedCity, setSelectedCity] = useState(null);
  const [search, setSearch] = useState("");

  const cities = data?.cities || [];
  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase())
  );

  const avgAQI = cities.length ? Math.round(cities.reduce((a, c) => a + c.aqi, 0) / cities.length) : 0;
  const worstCity = cities.reduce((a, b) => a.aqi > b.aqi ? a : b, { aqi: 0, name: "—" });
  const severeCount = cities.filter(c => c.aqi > 200).length;

  return (
    <div className="h-screen flex flex-col bg-midnight overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}>
            🌬️
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-base leading-none">VayuDrishti</h1>
            <p className="text-slate-500 text-xs mt-0.5">Urban Air Quality Intelligence · India</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "National Avg AQI", value: avgAQI, color: getAQILevel(avgAQI).color },
            { label: "Worst City", value: worstCity.name, color: "#ef4444" },
            { label: "Severe Cities", value: `${severeCount} / ${cities.length}`, color: severeCount > 0 ? "#ef4444" : "#22d3a5" },
          ].map(stat => (
            <div key={stat.label} className="text-right">
              <p className="font-mono font-bold text-sm" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={refetch} className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            ↻ Refresh
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-aqi-good animate-pulse" />
            Live
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 flex-shrink-0 border-r border-white/5 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities..." className="w-full text-sm px-3 py-2 rounded-xl outline-none transition-all placeholder-slate-600 text-slate-200" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            )) : filteredCities.map(city => (
              <AQICard key={city.name} city={city} selected={selectedCity?.name === city.name} onClick={setSelectedCity} />
            ))}
          </div>
        </aside>

        <main className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-steel border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Fetching live AQI data...
              </div>
            </div>
          ) : (
            <AQIMap cities={cities} selectedCity={selectedCity} onCityClick={setSelectedCity} />
          )}
          <div className="absolute bottom-4 left-4 rounded-xl px-4 py-3 pointer-events-none z-10" style={{ background: "rgba(10,14,26,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
            <p className="text-xs text-slate-500 mb-2 font-display uppercase tracking-wider">AQI Level</p>
            <div className="flex flex-col gap-1">
              {[{ label: "Good", color: "#22d3a5" }, { label: "Moderate", color: "#fde047" }, { label: "Poor", color: "#fb923c" }, { label: "Severe", color: "#ef4444" }].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-slate-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          {!selectedCity && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="rounded-full px-4 py-2 text-xs text-slate-400" style={{ background: "rgba(10,14,26,0.8)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}>
                Click any city bubble to explore
              </div>
            </div>
          )}
        </main>

        {selectedCity && (
          <aside className="w-80 flex-shrink-0 border-l border-white/5 flex flex-col overflow-hidden relative" style={{ background: "rgba(10,14,26,0.95)" }}>
            <button onClick={() => setSelectedCity(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xs z-10 transition-colors">✕ Close</button>
            <CityPanel city={selectedCity} />
          </aside>
        )}
      </div>
    </div>
  );
}
