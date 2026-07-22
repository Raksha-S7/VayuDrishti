import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCityHistory, useForecast, useAttribution, useVulnerability, generateAdvisory, simulatePolicy } from "../hooks/useAPI";
import { getAQILevel, LANGUAGES } from "../utils/aqi";

const TABS = ["Overview", "Forecast", "Attribution", "Simulate", "Advisory"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const level = getAQILevel(val || 0);
  return (
    <div className="rounded-lg border px-3 py-2 text-xs" style={{ background: "#0F1628", borderColor: `${level.color}40` }}>
      <p className="font-mono font-bold" style={{ color: level.color }}>AQI {val}</p>
    </div>
  );
};

function fmt(n) {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n.toLocaleString("en-IN");
}

export default function CityPanel({ city }) {
  const [tab, setTab] = useState("Overview");
  const [language, setLanguage] = useState("English");
  const [advisory, setAdvisory] = useState(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [simQuery, setSimQuery] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const { data: histData, loading: histLoading } = useCityHistory(city.name);
  const { data: forecastData, loading: forecastLoading } = useForecast(city.name);
  const { data: attrData } = useAttribution(city.name);
  const { data: vulnData } = useVulnerability(city.name);

  const level = getAQILevel(city.aqi);

  const history = histData?.history?.slice(-24).map(h => ({
    ...h,
    time: new Date(h.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  })) || [];

  const forecast24 = forecastData?.forecast?.slice(0, 24).map(f => ({ ...f, time: `+${f.hour}h` })) || [];

  async function handleAdvisory() {
    setLoadingAdvisory(true);
    const r = await generateAdvisory(city.name, city.aqi, city.category, language);
    setAdvisory(r);
    setLoadingAdvisory(false);
  }

  async function handleSimulate() {
    if (!simQuery.trim()) return;
    setSimLoading(true);
    setSimResult(null);
    const r = await simulatePolicy(city.name, simQuery, city.aqi, city.category);
    setSimResult(r);
    setSimLoading(false);
  }

  useEffect(() => { setAdvisory(null); }, [city.name, language]);
  useEffect(() => { setSimResult(null); setSimQuery(""); }, [city.name]);

  const EXAMPLE_QUERIES = [
    "Halt all construction activity for 48 hours",
    "Implement odd-even vehicle rule on main roads",
    "Deploy 20 water sprinkler trucks across the city",
    "Shut down brick kilns in 10km radius",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-white text-xl">{city.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{city.state} · Live monitoring</p>
          </div>
          <div className="text-right">
            <div className={`font-mono font-bold text-4xl leading-none ${level.pulse}`} style={{ color: level.color }}>
              {city.aqi}
            </div>
            <div className="text-xs mt-1" style={{ color: level.color }}>{city.category}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "PM2.5", value: `${city.pm25} µg/m³` },
            { label: "Vulnerable", value: vulnData ? fmt(vulnData.vulnerable_count) : "—" },
            { label: "Vuln. Score", value: vulnData ? `${vulnData.vulnerability_score}/100` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-slate-500 text-xs">{label}</p>
              <p className="text-white text-xs font-medium mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium"
            style={{
              background: tab === t ? `${level.color}20` : "transparent",
              color: tab === t ? level.color : "#64748b",
              border: tab === t ? `1px solid ${level.color}40` : "1px solid transparent",
            }}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* OVERVIEW */}
        {tab === "Overview" && (
          <>
            <div>
              <p className="text-xs text-slate-400 mb-2 font-display uppercase tracking-wider">Last 24 Hours — AQI</p>
              {histLoading ? <div className="h-32 flex items-center justify-center text-slate-500 text-xs">Loading...</div> : (
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={level.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={level.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 9 }} interval={5} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="aqi" stroke={level.color} strokeWidth={2} fill="url(#ag)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Vulnerability quick view */}
            {vulnData && (
              <div>
                <p className="text-xs text-slate-400 mb-2 font-display uppercase tracking-wider">Population at Risk</p>
                <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {vulnData.groups?.slice(0, 3).map(g => (
                    <div key={g.group} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-center">{g.icon}</span>
                      <span className="flex-1 text-slate-300">{g.group}</span>
                      <span className="font-mono text-slate-400">{fmt(g.count)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${g.risk === "SEVERE" ? "text-red-400 bg-red-900/30" : g.risk === "HIGH" ? "text-orange-400 bg-orange-900/30" : "text-amber-400 bg-amber-900/30"}`}>{g.risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* FORECAST */}
        {tab === "Forecast" && (
          <div>
            <p className="text-xs text-slate-400 mb-2 font-display uppercase tracking-wider">24-Hour AQI Forecast</p>
            {forecastLoading ? <div className="h-40 flex items-center justify-center text-slate-500 text-xs">Generating...</div> : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={forecast24}>
                    <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 9 }} interval={3} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="aqi" radius={[3, 3, 0, 0]}>
                      {forecast24.map((e, i) => <Cell key={i} fill={e.color || "#38bdf8"} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {(() => {
                  const peak = forecast24.reduce((a, b) => a.aqi > b.aqi ? a : b, { aqi: 0 });
                  const pl = getAQILevel(peak.aqi);
                  return peak.aqi > 150 ? (
                    <div className="rounded-xl p-3 mt-3 text-xs" style={{ background: `${pl.color}10`, border: `1px solid ${pl.color}30` }}>
                      <p className="font-semibold" style={{ color: pl.color }}>⚠ Peak: AQI {peak.aqi} at {peak.time}</p>
                      <p className="text-slate-400 mt-1">Plan outdoor activities outside this window.</p>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        )}

        {/* ATTRIBUTION */}
        {tab === "Attribution" && attrData && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-display uppercase tracking-wider">Pollution Sources</p>
                <span className="text-xs text-slate-500">Confidence: {Math.round(attrData.confidence * 100)}%</span>
              </div>
              <div className="space-y-2">
                {attrData.sources?.map(src => (
                  <div key={src.source} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{src.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{src.source}</span>
                        <span className="font-mono text-slate-400">{src.contribution}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${src.contribution}%`, background: level.color, opacity: 0.8 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2 font-display uppercase tracking-wider">Enforcement Priorities</p>
              <div className="space-y-2">
                {attrData.enforcement?.map((e, i) => (
                  <div key={i} className="rounded-xl p-3 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${e.priority === "HIGH" ? "text-red-400 bg-red-900/30" : e.priority === "MEDIUM" ? "text-amber-400 bg-amber-900/30" : "text-slate-400 bg-slate-800"}`}>{e.priority}</span>
                      <span className="text-slate-400">{e.zone}</span>
                    </div>
                    <p className="text-slate-300">{e.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SIMULATE */}
        {tab === "Simulate" && (
          <div className="space-y-3">
            <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <p className="text-steel font-semibold mb-1">🧪 Policy What-If Simulator</p>
              <p className="text-slate-400">Type any intervention in plain English. Gemini will project its AQI impact, cost-benefit, and feasibility.</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2">Try an example:</p>
              <div className="space-y-1">
                {EXAMPLE_QUERIES.map(q => (
                  <button key={q} onClick={() => setSimQuery(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    → {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                value={simQuery}
                onChange={e => setSimQuery(e.target.value)}
                placeholder="e.g. Ban diesel trucks from entering the city between 6am-10pm for 3 days..."
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl outline-none resize-none text-slate-200 placeholder-slate-600"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={handleSimulate}
                disabled={simLoading || !simQuery.trim()}
                className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold font-display transition-all"
                style={{ background: "#38BDF8", color: "#0A0E1A", opacity: (simLoading || !simQuery.trim()) ? 0.5 : 1 }}>
                {simLoading ? "Simulating..." : "⚡ Simulate Impact"}
              </button>
            </div>

            {simResult && !simResult.error && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Result header */}
                <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs text-slate-400 mb-1">Intervention</p>
                  <p className="text-white text-sm font-medium">{simResult.intervention_parsed}</p>
                </div>

                {/* AQI change */}
                <div className="px-4 py-3 flex items-center gap-4 border-t border-white/5">
                  <div className="text-center">
                    <p className="font-mono text-2xl font-bold" style={{ color: level.color }}>{city.aqi}</p>
                    <p className="text-xs text-slate-500">Current</p>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-green-400 text-lg font-bold">↓ {simResult.aqi_reduction} pts</div>
                    <div className="text-xs text-slate-500">in ~{simResult.timeframe_hours}h</div>
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-2xl font-bold text-green-400">{simResult.aqi_after}</p>
                    <p className="text-xs text-slate-500">Projected</p>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-px border-t border-white/5" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {[
                    { label: "Health Savings", value: `₹${simResult.health_cost_savings_cr}Cr`, color: "#22d3a5" },
                    { label: "Net Benefit", value: `₹${simResult.net_benefit_cr}Cr`, color: "#22d3a5" },
                    { label: "PM2.5 Reduction", value: `${simResult.pm25_reduction_pct}%`, color: "#38bdf8" },
                    { label: "Confidence", value: `${simResult.confidence_pct}%`, color: "#38bdf8" },
                  ].map(m => (
                    <div key={m.label} className="px-3 py-2.5" style={{ background: "#0A0E1A" }}>
                      <p className="text-xs text-slate-500">{m.label}</p>
                      <p className="font-mono font-bold text-sm mt-0.5" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Feasibility + recommendation */}
                <div className="px-4 py-3 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${simResult.feasibility === "HIGH" ? "text-green-400 bg-green-900/30" : simResult.feasibility === "MEDIUM" ? "text-amber-400 bg-amber-900/30" : "text-red-400 bg-red-900/30"}`}>
                      {simResult.feasibility} FEASIBILITY
                    </span>
                    <span className="text-xs text-slate-500">via {simResult.powered_by}</span>
                  </div>
                  <p className="text-xs text-slate-300">{simResult.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADVISORY */}
        {tab === "Advisory" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-2 font-display uppercase tracking-wider">Language</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => setLanguage(lang.code)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: language === lang.code ? `${level.color}20` : "rgba(255,255,255,0.05)",
                      color: language === lang.code ? level.color : "#64748b",
                      border: language === lang.code ? `1px solid ${level.color}40` : "1px solid transparent",
                    }}>
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAdvisory} disabled={loadingAdvisory}
              className="w-full py-2.5 rounded-xl text-sm font-semibold font-display transition-all"
              style={{ background: level.color, color: "#0A0E1A", opacity: loadingAdvisory ? 0.7 : 1 }}>
              {loadingAdvisory ? "Generating..." : "Generate Health Advisory"}
            </button>
            {advisory && (
              <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: `${level.color}08`, border: `1px solid ${level.color}25` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: level.color }} />
                  <span className="text-xs text-slate-400">Powered by {advisory.powered_by} · {advisory.language}</span>
                </div>
                <p className="text-slate-200">{advisory.advisory}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
