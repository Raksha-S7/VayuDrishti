import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const BASE = "";

export function useCities() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE}/api/cities`);
      setData(res.data);
    } catch (e) {
      setError(e.message);
      // Fallback mock data so UI works even without backend
      setData({ cities: MOCK_CITIES, fetched_at: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useCityHistory(cityName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityName) return;
    setLoading(true);
    axios.get(`${BASE}/api/city/${cityName}/history`)
      .then(r => setData(r.data))
      .catch(() => setData({ city: cityName, history: generateMockHistory(cityName) }))
      .finally(() => setLoading(false));
  }, [cityName]);

  return { data, loading };
}

export function useForecast(cityName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityName) return;
    setLoading(true);
    axios.get(`${BASE}/api/city/${cityName}/forecast`)
      .then(r => setData(r.data))
      .catch(() => setData({ city: cityName, forecast: generateMockForecast() }))
      .finally(() => setLoading(false));
  }, [cityName]);

  return { data, loading };
}

export function useAttribution(cityName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityName) return;
    setLoading(true);
    axios.get(`${BASE}/api/city/${cityName}/attribution`)
      .then(r => setData(r.data))
      .catch(() => setData(MOCK_ATTRIBUTION(cityName)))
      .finally(() => setLoading(false));
  }, [cityName]);

  return { data, loading };
}

export async function generateAdvisory(city, aqi, category, language) {
  try {
    const res = await axios.post(`${BASE}/api/advisory`, { city, aqi, category, language });
    return res.data;
  } catch {
    return { advisory: getFallbackAdvisory(city, aqi, category, language), language, powered_by: "fallback" };
  }
}

export function useVulnerability(cityName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!cityName) return;
    setLoading(true);
    axios.get(`${BASE}/api/city/${cityName}/vulnerability`)
      .then(r => setData(r.data))
      .catch(() => setData(MOCK_VULNERABILITY(cityName)))
      .finally(() => setLoading(false));
  }, [cityName]);
  return { data, loading };
}

export async function simulatePolicy(city, query, current_aqi, current_category) {
  try {
    const res = await axios.post(`${BASE}/api/simulate`, { city, query, current_aqi, current_category });
    return res.data;
  } catch {
    return MOCK_SIMULATION(city, query, current_aqi);
  }
}

function MOCK_VULNERABILITY(city) {
  const profiles = {
    Delhi: { pop: 19800000, elderly_pct: 7.2, children_pct: 28.4, copd_pct: 4.1, vuln: 82 },
    Mumbai: { pop: 20700000, elderly_pct: 6.8, children_pct: 24.1, copd_pct: 3.8, vuln: 74 },
    Bengaluru: { pop: 10000000, elderly_pct: 6.1, children_pct: 22.3, copd_pct: 2.9, vuln: 62 },
    Kolkata: { pop: 14900000, elderly_pct: 8.9, children_pct: 21.8, copd_pct: 5.2, vuln: 86 },
    Chennai: { pop: 7100000, elderly_pct: 7.5, children_pct: 23.4, copd_pct: 3.4, vuln: 68 },
    Hyderabad: { pop: 7700000, elderly_pct: 6.3, children_pct: 25.1, copd_pct: 3.1, vuln: 65 },
    Patna: { pop: 2000000, elderly_pct: 6.4, children_pct: 33.1, copd_pct: 5.1, vuln: 88 },
    Lucknow: { pop: 3700000, elderly_pct: 7.1, children_pct: 31.2, copd_pct: 4.8, vuln: 85 },
  };
  const p = profiles[city] || { pop: 2000000, elderly_pct: 7, children_pct: 27, copd_pct: 3.5, vuln: 70 };
  return {
    city, vulnerability_score: p.vuln, total_population: p.pop,
    vulnerable_count: Math.round(p.pop * 0.42),
    groups: [
      { group: "Children (under 15)", count: Math.round(p.pop * p.children_pct / 100), pct: p.children_pct, risk: "HIGH", icon: "👧" },
      { group: "Elderly (60+)", count: Math.round(p.pop * p.elderly_pct / 100), pct: p.elderly_pct, risk: "HIGH", icon: "👴" },
      { group: "COPD / Asthma patients", count: Math.round(p.pop * p.copd_pct / 100), pct: p.copd_pct, risk: "SEVERE", icon: "🫁" },
      { group: "Outdoor workers", count: Math.round(p.pop * 0.18), pct: 18.0, risk: "MEDIUM", icon: "👷" },
      { group: "Near-road residents", count: Math.round(p.pop * 0.12), pct: 12.0, risk: "MEDIUM", icon: "🏘️" },
    ],
  };
}

function MOCK_SIMULATION(city, query, current_aqi) {
  const reduction = 15 + Math.floor(Math.random() * 40);
  return {
    intervention_parsed: `Targeted emission reduction policy in ${city} addressing primary pollution sources`,
    feasibility: "MEDIUM",
    aqi_reduction: reduction,
    aqi_after: Math.max(20, current_aqi - reduction),
    pm25_reduction_pct: parseFloat((reduction / current_aqi * 100).toFixed(1)),
    health_cost_savings_cr: parseFloat((reduction * 0.09).toFixed(2)),
    economic_cost_cr: parseFloat((reduction * 0.02).toFixed(2)),
    net_benefit_cr: parseFloat((reduction * 0.07).toFixed(2)),
    confidence_pct: 70 + Math.floor(Math.random() * 18),
    timeframe_hours: 6 + Math.floor(Math.random() * 18),
    co_benefits: ["Reduced noise levels", "Lower fuel consumption", "Improved road safety"],
    risks: ["Enforcement capacity constraints", "Temporary economic disruption"],
    recommendation: `Implement in phases starting with highest-impact corridors in ${city}.`,
    powered_by: "fallback",
  };
}

// ---- Mock data helpers ----
function generateMockHistory(city) {
  const now = new Date();
  const base = { Delhi: 140, Mumbai: 90, Bengaluru: 70, Kolkata: 120, Chennai: 80, Hyderabad: 85, Pune: 75, Ahmedabad: 100, Lucknow: 160, Patna: 180, Jaipur: 110, Bhopal: 95 }[city] || 100;
  return Array.from({ length: 48 }, (_, i) => {
    const t = new Date(now - (47 - i) * 3600000);
    const h = t.getHours();
    const diurnal = 30 * Math.sin(Math.PI * h / 12);
    const pm25 = Math.max(10, base + diurnal + (Math.random() - 0.5) * 30);
    const aqi = Math.round(pm25 * 2.1);
    return { timestamp: t.toISOString(), pm25: Math.round(pm25 * 10) / 10, aqi, category: aqiCat(aqi) };
  });
}

function generateMockForecast() {
  const now = new Date();
  return Array.from({ length: 72 }, (_, i) => {
    const t = new Date(now.getTime() + (i + 1) * 3600000);
    const h = t.getHours();
    const pm25 = Math.max(15, 90 + 25 * Math.sin(Math.PI * h / 12) + (Math.random() - 0.5) * 20);
    const aqi = Math.round(pm25 * 2.1);
    const colors = { Good: "#22d3a5", Satisfactory: "#86efac", Moderate: "#fde047", Poor: "#fb923c", "Very Poor": "#f87171", Severe: "#ef4444" };
    const cat = aqiCat(aqi);
    return { hour: i + 1, timestamp: t.toISOString(), pm25: Math.round(pm25 * 10) / 10, aqi, category: cat, color: colors[cat] || "#94a3b8" };
  });
}

function aqiCat(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 150) return "Moderate";
  if (aqi <= 200) return "Poor";
  if (aqi <= 300) return "Very Poor";
  return "Severe";
}

function MOCK_ATTRIBUTION(city) {
  return {
    city, confidence: 0.74,
    sources: [
      { source: "Vehicle Emissions", contribution: 42, icon: "🚗" },
      { source: "Industrial Stacks", contribution: 28, icon: "🏭" },
      { source: "Construction Dust", contribution: 18, icon: "🏗️" },
      { source: "Biomass Burning", contribution: 8, icon: "🔥" },
      { source: "Other", contribution: 4, icon: "💨" },
    ],
    enforcement: [
      { priority: "HIGH", action: "Deploy traffic police for vehicle emission checks", zone: "CBD & Ring Road" },
      { priority: "HIGH", action: "Inspect construction sites for dust suppression", zone: "North & East zones" },
      { priority: "MEDIUM", action: "Monitor industrial stack emissions", zone: "Industrial corridor" },
      { priority: "LOW", action: "Biomass burning ban advisory", zone: "Peri-urban areas" },
    ],
    generated_at: new Date().toISOString(),
  };
}

function getFallbackAdvisory(city, aqi, category, language) {
  const advisories = {
    English: `⚠️ Air quality in ${city} is currently ${category} (AQI: ${aqi}). Limit outdoor exposure. Children, elderly, and those with respiratory conditions should stay indoors. Wear N95 masks if venturing out.`,
    Hindi: `⚠️ ${city} में वायु गुणवत्ता अभी ${category} है (AQI: ${aqi})। बाहरी गतिविधियां सीमित करें। बच्चे, बुजुर्ग और सांस के मरीज़ घर के अंदर रहें।`,
    Kannada: `⚠️ ${city}ದಲ್ಲಿ ವಾಯು ಗುಣಮಟ್ಟ ${category} ಆಗಿದೆ (AQI: ${aqi})। ಹೊರಗಿನ ಚಟುವಟಿಕೆಗಳನ್ನು ಸೀಮಿತಗೊಳಿಸಿ।`,
    Tamil: `⚠️ ${city}ல் காற்றின் தரம் ${category} (AQI: ${aqi}). வெளியே செல்வதை குறைத்துக்கொள்ளுங்கள்.`,
    Telugu: `⚠️ ${city}లో వాయు నాణ్యత ${category} (AQI: ${aqi}). బయటి కార్యకలాపాలు తగ్గించండి.`,
    Bengali: `⚠️ ${city}-তে বায়ুর মান ${category} (AQI: ${aqi}). বাইরের কার্যকলাপ সীমিত করুন।`,
    Marathi: `⚠️ ${city}मध्ये हवेची गुणवत्ता ${category} आहे (AQI: ${aqi}). बाहेरील क्रियाकलाप मर्यादित करा.`,
  };
  return advisories[language] || advisories.English;
}

const MOCK_CITIES = [
  { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, pm25: 142, aqi: 198, category: "Poor", color: "#fb923c" },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, pm25: 68, aqi: 112, category: "Moderate", color: "#fde047" },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, pm25: 45, aqi: 78, category: "Satisfactory", color: "#86efac" },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, pm25: 118, aqi: 162, category: "Very Poor", color: "#f87171" },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, pm25: 52, aqi: 89, category: "Satisfactory", color: "#86efac" },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, pm25: 62, aqi: 101, category: "Moderate", color: "#fde047" },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, pm25: 48, aqi: 83, category: "Satisfactory", color: "#86efac" },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, pm25: 88, aqi: 138, category: "Moderate", color: "#fde047" },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, pm25: 156, aqi: 214, category: "Very Poor", color: "#f87171" },
  { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, pm25: 178, aqi: 241, category: "Severe", color: "#ef4444" },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, pm25: 98, aqi: 148, category: "Moderate", color: "#fde047" },
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, pm25: 72, aqi: 118, category: "Moderate", color: "#fde047" },
];
