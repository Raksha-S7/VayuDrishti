import { getAQILevel } from "../utils/aqi";

export default function AQICard({ city, selected, onClick }) {
  const level = getAQILevel(city.aqi);

  return (
    <div
      onClick={() => onClick(city)}
      className="relative cursor-pointer rounded-xl border transition-all duration-300 overflow-hidden group"
      style={{
        borderColor: selected ? level.color : "rgba(255,255,255,0.08)",
        background: selected ? level.bg : "rgba(15,22,40,0.8)",
        boxShadow: selected ? `0 0 20px ${level.color}30` : "none",
      }}
    >
      {/* Pulse ring */}
      <div
        className={`absolute inset-0 rounded-xl ${level.pulse}`}
        style={{ background: `radial-gradient(ellipse at center, ${level.color}15, transparent 70%)` }}
      />

      <div className="relative p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-display font-semibold text-white text-sm">{city.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{city.state}</p>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${level.color}20`, color: level.color }}
          >
            {city.category}
          </span>
        </div>

        <div className="flex items-end gap-2">
          <span
            className="font-mono font-bold text-3xl leading-none"
            style={{ color: level.color }}
          >
            {city.aqi}
          </span>
          <span className="text-xs text-slate-400 mb-1">AQI</span>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (city.aqi / 500) * 100)}%`, background: level.color }}
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">{city.pm25}µg</span>
        </div>
      </div>
    </div>
  );
}
