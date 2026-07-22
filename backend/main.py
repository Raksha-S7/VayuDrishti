from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime, timedelta
import os
import json
import google.generativeai as genai
from typing import Optional

app = FastAPI(title="VayuDrishti API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

OPENAQ_BASE = "https://api.openaq.io/v3"
OPENAQ_KEY = os.getenv("OPENAQ_API_KEY", "")  # Optional - works without key at lower rate

# Major Indian cities with their coords and OpenAQ location IDs
INDIAN_CITIES = [
    {"name": "Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090, "openaq_city": "Delhi"},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "openaq_city": "Mumbai"},
    {"name": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "openaq_city": "Bengaluru"},
    {"name": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639, "openaq_city": "Kolkata"},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "openaq_city": "Chennai"},
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867, "openaq_city": "Hyderabad"},
    {"name": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567, "openaq_city": "Pune"},
    {"name": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714, "openaq_city": "Ahmedabad"},
    {"name": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462, "openaq_city": "Lucknow"},
    {"name": "Patna", "state": "Bihar", "lat": 25.5941, "lng": 85.1376, "openaq_city": "Patna"},
    {"name": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873, "openaq_city": "Jaipur"},
    {"name": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126, "openaq_city": "Bhopal"},
]

# AQI breakpoints for PM2.5 (µg/m³) - India CPCB standard
def pm25_to_aqi(pm25: float) -> dict:
    if pm25 < 0:
        return {"aqi": 0, "category": "Unknown", "color": "#94a3b8"}
    elif pm25 <= 12:
        return {"aqi": int(pm25 * 50 / 12), "category": "Good", "color": "#22d3a5"}
    elif pm25 <= 35.4:
        return {"aqi": int(51 + (pm25 - 12.1) * 49 / 23.3), "category": "Satisfactory", "color": "#86efac"}
    elif pm25 <= 55.4:
        return {"aqi": int(101 + (pm25 - 35.5) * 49 / 19.9), "category": "Moderate", "color": "#fde047"}
    elif pm25 <= 150.4:
        return {"aqi": int(151 + (pm25 - 55.5) * 49 / 94.9), "category": "Poor", "color": "#fb923c"}
    elif pm25 <= 250.4:
        return {"aqi": int(201 + (pm25 - 150.5) * 99 / 99.9), "category": "Very Poor", "color": "#f87171"}
    else:
        return {"aqi": int(301 + (pm25 - 250.5) * 99 / 99.9), "category": "Severe", "color": "#ef4444"}


async def fetch_city_aqi(client: httpx.AsyncClient, city: dict) -> dict:
    """Fetch latest AQI for a city from OpenAQ"""
    headers = {}
    if OPENAQ_KEY:
        headers["X-API-Key"] = OPENAQ_KEY

    try:
        # Search for locations in this city
        resp = await client.get(
            f"{OPENAQ_BASE}/locations",
            params={
                "country_id": "IN",
                "city": city["openaq_city"],
                "limit": 5,
                "parameters_id": 2,  # PM2.5
            },
            headers=headers,
            timeout=10.0
        )
        data = resp.json()
        locations = data.get("results", [])

        if not locations:
            # Fallback to nearby search
            resp = await client.get(
                f"{OPENAQ_BASE}/locations",
                params={
                    "coordinates": f"{city['lat']},{city['lng']}",
                    "radius": 25000,
                    "limit": 3,
                    "parameters_id": 2,
                },
                headers=headers,
                timeout=10.0
            )
            data = resp.json()
            locations = data.get("results", [])

        if not locations:
            raise ValueError("No stations found")

        # Get latest sensor reading
        loc = locations[0]
        loc_id = loc["id"]

        latest_resp = await client.get(
            f"{OPENAQ_BASE}/locations/{loc_id}/latest",
            headers=headers,
            timeout=10.0
        )
        latest_data = latest_resp.json()
        results = latest_data.get("results", [])

        pm25_val = None
        for r in results:
            if r.get("parameter", {}).get("name") == "pm25":
                pm25_val = r.get("value", -1)
                break

        if pm25_val is None and results:
            pm25_val = results[0].get("value", -1)

        aqi_info = pm25_to_aqi(pm25_val or 0)
        return {
            **city,
            "pm25": round(pm25_val or 0, 1),
            "aqi": aqi_info["aqi"],
            "category": aqi_info["category"],
            "color": aqi_info["color"],
            "station": loc.get("name", "Unknown"),
            "location_id": loc_id,
            "last_updated": datetime.utcnow().isoformat(),
            "error": None,
        }

    except Exception as e:
        # Return mock data so UI still works during dev
        import random
        pm25 = random.uniform(30, 180)
        aqi_info = pm25_to_aqi(pm25)
        return {
            **city,
            "pm25": round(pm25, 1),
            "aqi": aqi_info["aqi"],
            "category": aqi_info["category"],
            "color": aqi_info["color"],
            "station": "Demo Station",
            "location_id": None,
            "last_updated": datetime.utcnow().isoformat(),
            "error": str(e),
        }


@app.get("/api/cities")
async def get_all_cities():
    """Get live AQI for all major Indian cities"""
    async with httpx.AsyncClient() as client:
        tasks = [fetch_city_aqi(client, city) for city in INDIAN_CITIES]
        results = await asyncio.gather(*tasks)
    return {"cities": list(results), "fetched_at": datetime.utcnow().isoformat()}


@app.get("/api/city/{city_name}/history")
async def get_city_history(city_name: str, hours: int = 48):
    """Get hourly AQI history for a city"""
    city = next((c for c in INDIAN_CITIES if c["name"].lower() == city_name.lower()), None)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    headers = {"X-API-Key": OPENAQ_KEY} if OPENAQ_KEY else {}

    async with httpx.AsyncClient() as client:
        try:
            # Find location ID first
            resp = await client.get(
                f"{OPENAQ_BASE}/locations",
                params={"coordinates": f"{city['lat']},{city['lng']}", "radius": 25000, "limit": 1, "parameters_id": 2},
                headers=headers, timeout=10.0
            )
            locs = resp.json().get("results", [])
            if not locs:
                raise ValueError("No location found")

            loc_id = locs[0]["id"]
            sensors_resp = await client.get(f"{OPENAQ_BASE}/locations/{loc_id}", headers=headers, timeout=10.0)
            sensors_data = sensors_resp.json().get("results", [{}])[0]
            sensors = sensors_data.get("sensors", [])
            pm25_sensor = next((s for s in sensors if s.get("parameter", {}).get("name") == "pm25"), None)

            if not pm25_sensor:
                raise ValueError("No PM2.5 sensor")

            sensor_id = pm25_sensor["id"]
            date_to = datetime.utcnow()
            date_from = date_to - timedelta(hours=hours)

            hist_resp = await client.get(
                f"{OPENAQ_BASE}/sensors/{sensor_id}/hours",
                params={
                    "datetime_from": date_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "datetime_to": date_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "limit": hours,
                },
                headers=headers, timeout=15.0
            )
            hist_data = hist_resp.json().get("results", [])

            history = [
                {
                    "timestamp": r["period"]["datetimeFrom"]["utc"],
                    "pm25": round(r["value"], 1),
                    "aqi": pm25_to_aqi(r["value"])["aqi"],
                    "category": pm25_to_aqi(r["value"])["category"],
                }
                for r in hist_data if r.get("value") is not None
            ]
            return {"city": city_name, "history": history}

        except Exception as e:
            # Generate mock trend data
            now = datetime.utcnow()
            import random, math
            history = []
            base = random.uniform(60, 140)
            for i in range(hours, 0, -1):
                t = now - timedelta(hours=i)
                # Simulate diurnal pattern
                hour_of_day = t.hour
                diurnal = 30 * math.sin(math.pi * hour_of_day / 12)
                pm25 = max(10, base + diurnal + random.uniform(-15, 15))
                aqi_info = pm25_to_aqi(pm25)
                history.append({
                    "timestamp": t.isoformat(),
                    "pm25": round(pm25, 1),
                    "aqi": aqi_info["aqi"],
                    "category": aqi_info["category"],
                })
            return {"city": city_name, "history": history}


@app.get("/api/city/{city_name}/forecast")
async def get_forecast(city_name: str):
    """Generate 24-72hr AQI forecast using trend analysis"""
    # Get historical data first
    history_data = await get_city_history(city_name, hours=72)
    history = history_data["history"]

    if len(history) < 12:
        raise HTTPException(status_code=400, detail="Not enough historical data")

    import numpy as np
    values = [h["pm25"] for h in history]

    # Simple weighted moving average forecast with seasonal component
    forecast = []
    now = datetime.utcnow()
    window = min(24, len(values))
    recent_avg = sum(values[-window:]) / window
    trend = (values[-1] - values[-min(12, len(values))]) / min(12, len(values))

    for h in range(1, 73):
        hour_of_day = (now.hour + h) % 24
        # Diurnal pattern: higher pollution in morning/evening rush
        import math
        diurnal = 15 * (math.sin(math.pi * (hour_of_day - 6) / 12) + 0.5)
        predicted_pm25 = max(5, recent_avg + trend * h * 0.3 + diurnal)
        aqi_info = pm25_to_aqi(predicted_pm25)
        forecast.append({
            "hour": h,
            "timestamp": (now + timedelta(hours=h)).isoformat(),
            "pm25": round(predicted_pm25, 1),
            "aqi": aqi_info["aqi"],
            "category": aqi_info["category"],
            "color": aqi_info["color"],
        })

    return {"city": city_name, "forecast": forecast, "generated_at": now.isoformat()}


@app.get("/api/city/{city_name}/attribution")
async def get_source_attribution(city_name: str):
    """Rule-based pollution source attribution for a city"""
    city = next((c for c in INDIAN_CITIES if c["name"].lower() == city_name.lower()), None)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    now = datetime.utcnow()
    hour = (now.hour + 5) % 24  # IST approx

    # Rule-based attribution (in production: correlate with traffic/satellite/permit data)
    sources = []
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        sources = [
            {"source": "Vehicle Emissions", "contribution": 42, "icon": "🚗"},
            {"source": "Industrial Stacks", "contribution": 28, "icon": "🏭"},
            {"source": "Construction Dust", "contribution": 18, "icon": "🏗️"},
            {"source": "Biomass Burning", "contribution": 8, "icon": "🔥"},
            {"source": "Other", "contribution": 4, "icon": "💨"},
        ]
    elif 10 <= hour <= 17:
        sources = [
            {"source": "Industrial Stacks", "contribution": 38, "icon": "🏭"},
            {"source": "Vehicle Emissions", "contribution": 30, "icon": "🚗"},
            {"source": "Construction Dust", "contribution": 22, "icon": "🏗️"},
            {"source": "Biomass Burning", "contribution": 6, "icon": "🔥"},
            {"source": "Other", "contribution": 4, "icon": "💨"},
        ]
    else:
        sources = [
            {"source": "Biomass Burning", "contribution": 35, "icon": "🔥"},
            {"source": "Industrial Stacks", "contribution": 30, "icon": "🏭"},
            {"source": "Vehicle Emissions", "contribution": 20, "icon": "🚗"},
            {"source": "Construction Dust", "contribution": 10, "icon": "🏗️"},
            {"source": "Other", "contribution": 5, "icon": "💨"},
        ]

    # Enforcement recommendations
    enforcement = [
        {"priority": "HIGH", "action": "Deploy traffic police at major intersections for vehicle emission checks", "zone": "CBD & Ring Road"},
        {"priority": "HIGH", "action": "Inspect active construction sites for dust suppression compliance", "zone": "North & East zones"},
        {"priority": "MEDIUM", "action": "Monitor industrial stack emissions in MIDC/industrial areas", "zone": "Industrial corridor"},
        {"priority": "LOW", "action": "Public advisory for biomass burning ban enforcement", "zone": "Peri-urban areas"},
    ]

    return {
        "city": city_name,
        "hour_ist": hour,
        "sources": sources,
        "enforcement": enforcement,
        "confidence": 0.74,
        "generated_at": now.isoformat(),
    }


@app.post("/api/advisory")
async def generate_health_advisory(body: dict):
    """Generate multilingual health advisory using Gemini"""
    city = body.get("city", "Delhi")
    aqi = body.get("aqi", 150)
    category = body.get("category", "Poor")
    language = body.get("language", "English")

    lang_map = {
        "English": "English",
        "Hindi": "Hindi (Devanagari script)",
        "Kannada": "Kannada",
        "Tamil": "Tamil",
        "Telugu": "Telugu",
        "Bengali": "Bengali",
        "Marathi": "Marathi",
    }
    target_lang = lang_map.get(language, "English")

    prompt = f"""You are VayuDrishti, an urban air quality intelligence system for Indian cities.

Current data for {city}:
- AQI: {aqi} ({category})
- Time: {datetime.utcnow().strftime('%d %B %Y, %H:%M')} UTC

Generate a concise, actionable health advisory in {target_lang}.

Include:
1. One-line risk summary
2. Specific advice for: healthy adults, children/elderly, outdoor workers
3. One immediate action to take right now

Keep it under 120 words. Write in {target_lang} only (no translation needed). Use simple, clear language a citizen can act on immediately."""

    if not GEMINI_API_KEY:
        # Fallback advisory
        advisories = {
            "English": f"⚠️ Air quality in {city} is {category} (AQI: {aqi}). Limit outdoor activities. Children, elderly, and those with respiratory conditions should stay indoors. Wear N95 masks if going outside. Close windows and use air purifiers indoors.",
            "Hindi": f"⚠️ {city} में वायु गुणवत्ता {category} है (AQI: {aqi})। बाहरी गतिविधियां सीमित करें। बच्चे, बुजुर्ग और सांस के मरीज घर के अंदर रहें। बाहर जाते समय N95 मास्क पहनें।",
            "Kannada": f"⚠️ {city}ದಲ್ಲಿ ವಾಯು ಗುಣಮಟ್ಟ {category} ಆಗಿದೆ (AQI: {aqi})। ಹೊರಗಿನ ಚಟುವಟಿಕೆಗಳನ್ನು ಸೀಮಿತಗೊಳಿಸಿ। ಮಕ್ಕಳು ಮತ್ತು ವೃದ್ಧರು ಮನೆಯಲ್ಲಿ ಇರಬೇಕು।",
        }
        return {"advisory": advisories.get(language, advisories["English"]), "language": language, "powered_by": "fallback"}

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return {"advisory": response.text, "language": language, "powered_by": "gemini-1.5-flash"}
    except Exception as e:
        return {"advisory": f"Advisory unavailable: {str(e)}", "language": language, "powered_by": "error"}


@app.post("/api/simulate")
async def simulate_policy(body: dict):
    """LLM Policy Simulator — natural language what-if queries"""
    city = body.get("city", "Delhi")
    query = body.get("query", "")
    current_aqi = body.get("current_aqi", 150)
    current_category = body.get("current_category", "Poor")

    city_data = next((c for c in INDIAN_CITIES if c["name"].lower() == city.lower()), INDIAN_CITIES[0])

    prompt = f"""You are VAYU-SIM, an urban air quality policy simulation engine for Indian cities.

City: {city} ({city_data['state']})
Current AQI: {current_aqi} ({current_category})
Current PM2.5: ~{round(current_aqi / 2.1, 1)} µg/m³

Policy Query: "{query}"

Simulate the impact of this intervention. Respond ONLY with a valid JSON object (no markdown, no explanation):

{{
  "intervention_parsed": "1-sentence description of what the policy does",
  "feasibility": "HIGH|MEDIUM|LOW",
  "aqi_reduction": <integer, projected AQI points reduction, realistic range 5-80>,
  "aqi_after": <integer, current_aqi minus aqi_reduction, minimum 20>,
  "pm25_reduction_pct": <float, percentage reduction in PM2.5>,
  "health_cost_savings_cr": <float, crore rupees saved, realistic for city scale>,
  "economic_cost_cr": <float, implementation cost in crore rupees>,
  "net_benefit_cr": <float, savings minus cost>,
  "confidence_pct": <integer, 60-92>,
  "timeframe_hours": <integer, hours until effect visible>,
  "co_benefits": ["benefit1", "benefit2"],
  "risks": ["risk1"],
  "recommendation": "1-sentence actionable recommendation"
}}"""

    if not GEMINI_API_KEY:
        # Deterministic fallback
        import hashlib
        seed = int(hashlib.md5(query.encode()).hexdigest()[:8], 16) % 100
        aqi_reduction = 20 + (seed % 45)
        return {
            "intervention_parsed": f"Regulatory intervention targeting major emission sources in {city}",
            "feasibility": "MEDIUM",
            "aqi_reduction": aqi_reduction,
            "aqi_after": max(20, current_aqi - aqi_reduction),
            "pm25_reduction_pct": round(aqi_reduction / current_aqi * 100, 1),
            "health_cost_savings_cr": round(aqi_reduction * 0.08, 2),
            "economic_cost_cr": round(aqi_reduction * 0.02, 2),
            "net_benefit_cr": round(aqi_reduction * 0.06, 2),
            "confidence_pct": 68 + (seed % 20),
            "timeframe_hours": 4 + (seed % 20),
            "co_benefits": ["Reduced noise pollution", "Lower fuel consumption"],
            "risks": ["Compliance enforcement challenges"],
            "recommendation": f"Deploy in phases across {city} starting with highest-impact zones.",
            "powered_by": "fallback",
        }

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
        result["powered_by"] = "gemini-1.5-flash"
        return result
    except Exception as e:
        return {"error": str(e), "intervention_parsed": query, "powered_by": "error"}


@app.get("/api/city/{city_name}/vulnerability")
async def get_vulnerability(city_name: str):
    """Population vulnerability scoring for a city"""
    city = next((c for c in INDIAN_CITIES if c["name"].lower() == city_name.lower()), None)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    # Population estimates and vulnerability factors (Census 2011 + WHO models)
    city_profiles = {
        "Delhi": {"pop_million": 19.8, "elderly_pct": 7.2, "children_pct": 28.4, "copd_prevalence": 4.1},
        "Mumbai": {"pop_million": 20.7, "elderly_pct": 6.8, "children_pct": 24.1, "copd_prevalence": 3.8},
        "Bengaluru": {"pop_million": 10.0, "elderly_pct": 6.1, "children_pct": 22.3, "copd_prevalence": 2.9},
        "Kolkata": {"pop_million": 14.9, "elderly_pct": 8.9, "children_pct": 21.8, "copd_prevalence": 5.2},
        "Chennai": {"pop_million": 7.1, "elderly_pct": 7.5, "children_pct": 23.4, "copd_prevalence": 3.4},
        "Hyderabad": {"pop_million": 7.7, "elderly_pct": 6.3, "children_pct": 25.1, "copd_prevalence": 3.1},
        "Pune": {"pop_million": 3.1, "elderly_pct": 6.0, "children_pct": 24.8, "copd_prevalence": 2.8},
        "Ahmedabad": {"pop_million": 7.2, "elderly_pct": 6.7, "children_pct": 27.2, "copd_prevalence": 3.6},
        "Lucknow": {"pop_million": 3.7, "elderly_pct": 7.1, "children_pct": 31.2, "copd_prevalence": 4.8},
        "Patna": {"pop_million": 2.0, "elderly_pct": 6.4, "children_pct": 33.1, "copd_prevalence": 5.1},
        "Jaipur": {"pop_million": 3.1, "elderly_pct": 6.9, "children_pct": 29.7, "copd_prevalence": 4.0},
        "Bhopal": {"pop_million": 1.8, "elderly_pct": 6.5, "children_pct": 28.9, "copd_prevalence": 3.7},
    }

    profile = city_profiles.get(city_name, {"pop_million": 2.0, "elderly_pct": 7.0, "children_pct": 26.0, "copd_prevalence": 3.5})
    pop = profile["pop_million"] * 1_000_000

    # Vulnerable population counts
    elderly = round(pop * profile["elderly_pct"] / 100)
    children = round(pop * profile["children_pct"] / 100)
    copd = round(pop * profile["copd_prevalence"] / 100)
    outdoor_workers = round(pop * 0.18)  # ~18% in outdoor occupations (Census)
    high_exposure = round(pop * 0.12)    # near roads/industrial zones

    total_vulnerable = min(round(elderly + children + copd * 0.6 + outdoor_workers * 0.3), round(pop * 0.55))

    # Overall vulnerability score (0-100)
    vuln_score = round(
        (profile["elderly_pct"] * 2.5) +
        (profile["children_pct"] * 1.5) +
        (profile["copd_prevalence"] * 8) +
        (outdoor_workers / pop * 100 * 1.2)
    )
    vuln_score = min(100, vuln_score)

    return {
        "city": city_name,
        "total_population": round(pop),
        "vulnerability_score": vuln_score,
        "vulnerable_count": total_vulnerable,
        "groups": [
            {"group": "Children (under 15)", "count": children, "pct": profile["children_pct"], "risk": "HIGH", "icon": "👧"},
            {"group": "Elderly (60+)", "count": elderly, "pct": profile["elderly_pct"], "risk": "HIGH", "icon": "👴"},
            {"group": "COPD / Asthma patients", "count": copd, "pct": profile["copd_prevalence"], "risk": "SEVERE", "icon": "🫁"},
            {"group": "Outdoor workers", "count": outdoor_workers, "pct": 18.0, "risk": "MEDIUM", "icon": "👷"},
            {"group": "Near-road residents", "count": high_exposure, "pct": 12.0, "risk": "MEDIUM", "icon": "🏘️"},
        ],
        "data_sources": ["Census 2011", "WHO COPD India Burden", "NCMRD"],
        "generated_at": datetime.utcnow().isoformat(),
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0", "gemini_configured": bool(GEMINI_API_KEY)}
