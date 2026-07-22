# 🌬️ VayuDrishti 2.0
### AI-Powered Urban Air Quality Intelligence for Smart City Intervention

> *"Don't just measure air. Change it."*

**ET AI Hackathon 2026 | Problem Statement 5 | Theme: Smart Cities / Environmental Intelligence**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square)](https://vitejs.dev)
[![Gemini](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-8B5CF6?style=flat-square)](https://aistudio.google.com)
[![OpenAQ](https://img.shields.io/badge/Data-OpenAQ%20v3-22D3A5?style=flat-square)](https://api.openaq.org)

---

## The Problem

India has 900+ CAAQMS air quality monitoring stations. 1.67 million people die annually from air pollution. Yet only **31% of cities** have any actionable response protocol linked to those readings (CAG Audit, 2024).

The data exists. The intelligence layer to act on it does not.

---

## What VayuDrishti Does

VayuDrishti is a 3-layer intelligence platform:

| Layer | What it does |
|---|---|
| **Perception** | Real-time AQI for 12 Indian cities via OpenAQ · Pulsing geospatial bubble map |
| **Cognition** | 72-hr AQI forecasting · Source attribution · Vulnerability scoring (Census data) |
| **Action** | LLM Policy Simulator (Gemini) · Multilingual health advisories in 7 languages |

---

## Key Features

### 1. Live AQI Intelligence
- Real-time PM2.5 data for Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad, Pune, Ahmedabad, Lucknow, Patna, Jaipur, Bhopal
- Dark geospatial map with **breathing pulse AQI rings** — urgency scales with pollution level
- 24-hour historical trend chart per city

### 2. 72-Hour AQI Forecast
- Diurnal pattern model capturing rush-hour peaks and nocturnal biomass burning
- Color-coded bar chart with peak warnings
- Based on OpenAQ historical data

### 3. Pollution Source Attribution
- Rule-based engine with time-of-day patterns
- Breakdown: Vehicle Emissions · Industrial Stacks · Construction Dust · Biomass Burning
- **Enforcement priorities** with specific zone targeting for municipal authorities

### 4. Population Vulnerability Scoring
- Census 2011-calibrated scoring for 5 risk groups
- Children · Elderly · COPD/Asthma patients · Outdoor workers · Near-road residents
- Quantified counts per city (e.g. 13.8M vulnerable in Delhi)

### 5. LLM Policy Simulator ⚡
Type any intervention in plain English:
> *"Halt all construction in Zone B and ban diesel trucks for 48 hours"*

Gemini 1.5 Flash returns:
- Projected AQI reduction (points + %)
- Health cost savings (₹ Crore)
- Implementation cost + net benefit
- Confidence score + timeframe
- Specific recommendation

### 6. Multilingual Health Advisories
Gemini-generated, context-aware advisories in:
**English · Hindi · Kannada · Tamil · Telugu · Bengali · Marathi**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  DATA SOURCES                                            │
│  OpenAQ v3 · CPCB India · Sentinel-5P · OSM · Census   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│  FASTAPI BACKEND (Async Python)                          │
│  /api/cities · /history · /forecast · /attribution      │
│  /vulnerability · /simulate · /advisory                  │
└──────────────────────┬──────────────────────────────────┘
                       │ JSON
┌──────────────────────▼──────────────────────────────────┐
│  AI CORE                                                 │
│  Diurnal Forecast · Source Attribution                   │
│  Vulnerability Scorer · Gemini 1.5 Flash                │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│  REACT FRONTEND (Vite + Tailwind)                        │
│  AQI Map · City Panel · 5 Intelligence Tabs             │
│  react-leaflet · Recharts · Axios                        │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Map | react-leaflet + CartoDB Dark Matter tiles |
| Charts | Recharts (AreaChart + BarChart) |
| Backend | FastAPI (async) + Python 3.10+ |
| AI / LLM | Google Gemini 1.5 Flash (free tier) |
| Air Quality Data | OpenAQ v3 API (free) |
| Geospatial | OpenStreetMap (free) |
| Demographics | Census 2011 (public) |

**Entirely free-tier deployable.**

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Free Gemini API key → [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1. Clone
```bash
git clone https://github.com/Dark-fire777/vayudrishti-2.0
cd vayudrishti-2.0
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt

# Add your Gemini key
echo "GEMINI_API_KEY=your_key_here" > .env

uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Windows users
Double-click `start_backend.bat` and `start_frontend.bat` in two separate windows.

---

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/cities` | Live AQI for all 12 cities (parallel fetch) |
| `GET /api/city/{name}/history` | 48-hour PM2.5 trend |
| `GET /api/city/{name}/forecast` | 72-hour diurnal AQI forecast |
| `GET /api/city/{name}/attribution` | Pollution source breakdown + enforcement priorities |
| `GET /api/city/{name}/vulnerability` | Population vulnerability scores |
| `POST /api/simulate` | LLM Policy Simulator (Gemini) |
| `POST /api/advisory` | Multilingual health advisory (Gemini) |
| `GET /docs` | Interactive Swagger UI |

---

## Judging Criteria Alignment

| Criterion | Weight | How VayuDrishti addresses it |
|---|---|---|
| **Innovation** | 25% | LLM Policy Simulator (plain English → AQI projections) · Breathing pulse rings · Vulnerability scoring with Census data |
| **Business Impact** | 25% | City admins: enforcement priorities + ₹Cr cost-benefit · Citizens: 7-language advisories · 131 NCAP cities deployable |
| **Technical Excellence** | 20% | Async FastAPI (12 cities in parallel) · Diurnal model · Graceful mock fallback |
| **Scalability** | 15% | REST decoupled architecture · Any city addable in one config line · Free-tier all the way |
| **User Experience** | 15% | 5-tab city intelligence panel · Dark command-centre design · Plain English policy input |

---

## Evaluation Metrics (PS5)

| Metric | VayuDrishti approach |
|---|---|
| Source attribution accuracy | Rule-based engine + time-of-day patterns, 74% confidence |
| AQI forecast accuracy | Diurnal model vs persistence baseline |
| Enforcement recommendation quality | Zone-targeted, priority-ranked, human-reviewable |
| Citizen advisory relevance | Gemini context-aware, group-specific, 7 languages |
| Response time signal → intervention | <30 seconds from AQI spike to policy simulation output |

---

## Team

**Solo — Raksha S**
B.Tech Data Science & AI, IIIT Dharwad (Batch 2025–29)


---

## License

MIT License — Open source, deployable by any municipality.
