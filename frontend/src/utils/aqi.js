export const AQI_LEVELS = [
  { max: 50,  label: "Good",        color: "#22d3a5", bg: "rgba(34,211,165,0.15)", pulse: "pulse-good" },
  { max: 100, label: "Satisfactory",color: "#86efac", bg: "rgba(134,239,172,0.15)", pulse: "pulse-good" },
  { max: 150, label: "Moderate",    color: "#fde047", bg: "rgba(253,224,71,0.15)", pulse: "pulse-moderate" },
  { max: 200, label: "Poor",        color: "#fb923c", bg: "rgba(251,146,60,0.15)", pulse: "pulse-poor" },
  { max: 300, label: "Very Poor",   color: "#f87171", bg: "rgba(248,113,113,0.15)", pulse: "pulse-poor" },
  { max: 999, label: "Severe",      color: "#ef4444", bg: "rgba(239,68,68,0.15)", pulse: "pulse-severe" },
];

export function getAQILevel(aqi) {
  return AQI_LEVELS.find(l => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

export function getAQIGradient(aqi) {
  const level = getAQILevel(aqi);
  return `radial-gradient(ellipse at center, ${level.bg}, transparent)`;
}

export const LANGUAGES = [
  { code: "English", label: "English", flag: "🇬🇧" },
  { code: "Hindi", label: "हिंदी", flag: "🇮🇳" },
  { code: "Kannada", label: "ಕನ್ನಡ", flag: "🌿" },
  { code: "Tamil", label: "தமிழ்", flag: "🌺" },
  { code: "Telugu", label: "తెలుగు", flag: "🌸" },
  { code: "Bengali", label: "বাংলা", flag: "🌻" },
  { code: "Marathi", label: "मराठी", flag: "🦁" },
];
