# TruckSafe RouteIQ 🚚🌦️

> **Intelligent Heavy-Duty Truck Routing & Weather Risk Safety Platform**  
> Built with **Django REST Framework**, **React 18 (Vite + TypeScript)**, and **MapLibre GL JS (WebGL)**.

[![Backend Tests](https://img.shields.io/badge/pytest-20%20passed-brightgreen.svg)]()
[![Frontend Build](https://img.shields.io/badge/vite-passing-brightgreen.svg)]()
[![Python](https://img.shields.io/badge/python-3.13-blue.svg)]()
[![React](https://img.shields.io/badge/react-18-blue.svg)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)]()

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Risk Classification Rules & Load Aerodynamics](#-risk-classification-rules--load-aerodynamics)
- [Route Recommendation Hierarchy](#-route-recommendation-hierarchy)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Quick Start: Local Development](#-quick-start-local-development)
- [Automated Testing](#-automated-testing)
- [Docker Deployment](#-docker-deployment)
- [Cloud Hosting Instructions](#-cloud-hosting-instructions)
- [Loom Video Walkthrough](#-loom-video-walkthrough)

---

## 🎯 Overview

Severe weather is a primary catalyst for catastrophic freight trucking accidents:
- **Crosswinds** exceeding 35–45 mph can overturn high-profile semi-trailers, especially when hauling light or heavy loads with shifting centers of gravity.
- **Torrential rainfall** induces hydroplaning and extends braking distance on heavy tractor-trailers.
- **Blizzard snow accumulation** causes highway closures, spinouts, and pass blockages.

**TruckSafe RouteIQ** computes and compares **3 distinct route options** for any origin-destination pair across North America, samples route coordinates every 10, 25, or 50 miles, computes exact checkpoint arrival ETAs, queries hourly meteorological data via Open-Meteo batch calls, applies vehicle load weight risk escalations, and delivers the **safest route recommendation** alongside an ultra-smooth **0–48 hour corridor forecast heatmap slider** running at 60 FPS.

---

## ✨ Key Features

1. **Guaranteed 3 Distinct Route Options:**
   - Multi-route engine utilizing OSRM alternatives supplemented by lateral corridor waypoints to guarantee 3 drivable highway alternatives (e.g. I-80 vs I-70 vs I-90).
2. **Sub-Second Weather Sampling & ETA Alignment:**
   - Samples checkpoints along highway geometries at intervals of **10, 25, or 50 miles**.
   - Calculates the truck's cumulative travel duration and precise **Estimated Time of Arrival (ETA)** at every checkpoint.
   - Fetches batch hourly wind speed, wind gusts, rain, and snow rates aligned directly to the checkpoint's ETA.
3. **Domain Risk Engine with Load Weight Aerodynamics:**
   - Strict classification of Low, Moderate, High, Severe, and No Travel conditions.
   - Weight-dependent wind escalation (30k lbs rollover cutoff and 40k lbs severe momentum handling rule).
4. **Lexicographical Route Recommendation:**
   - Mathematically balances safety and speed using hierarchical ranking:
     1. Fewest Severe miles (and zero No Travel miles)
     2. Fewest High miles
     3. Lowest average risk score
     4. Shortest travel duration
   - Generates transparent, natural-language rationale explaining *why* the recommended route was selected.
5. **Interactive WebGL Map & 0–48h Forecast Slider:**
   - MapLibre GL hardware-accelerated map with 3 route overlays, customizable checkpoint markers, and interactive popups.
   - 0–48 hour forecast time slider with **Play / Pause** animation and opacity controls, rendering moving weather fronts across the trip corridor without network round-trips.
6. **Detailed Checkpoint Inspection Drawer:**
   - Full tabular log of all checkpoints along the route, with arrival times, wind/gusts, rain, snow, resulting risk, and active load rule alerts.

---

## 📐 Risk Classification Rules & Load Aerodynamics

### Condition Thresholds

| Condition | Low (1) | Moderate (2) | High (3) | Severe (4) | No Travel (5) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wind Speed** | $< 25\text{ mph}$ | $25 - 34\text{ mph}$ | $35 - 44\text{ mph}$ | $45 - 54\text{ mph}$ | $\ge 55\text{ mph}$ |
| **Rain Rate** | $< 0.10\text{ in/hr}$ | $0.10 - 0.25\text{ in/hr}$ | $0.25 - 0.50\text{ in/hr}$ | $0.50 - 1.00\text{ in/hr}$ | $> 1.00\text{ in/hr}$ |
| **Snow Rate** | $< 0.5\text{ in/hr}$ | $0.5 - 1.0\text{ in/hr}$ | $1.0 - 2.0\text{ in/hr}$ | $2.0 - 3.0\text{ in/hr}$ | $> 3.0\text{ in/hr}$ |

### Load Weight Escalation Rules
- **$\ge 55\text{ mph}$ Wind:** Always **No Travel** regardless of trailer weight.
- **$45 - 54\text{ mph}$ Wind + Weight $> 30,000\text{ lb}$:** Escalated from Severe to **No Travel** (rollover prevention).
- **$35 - 44\text{ mph}$ Wind + Weight $> 40,000\text{ lb}$:** Escalated from High to **Severe** (trailer sway & handling risk).

---

## 🏆 Route Recommendation Hierarchy

Routes are sorted using a strict tuple comparison:
$$\text{Rank Key} = (\text{NoTravelMiles}, \text{SevereMiles}, \text{HighMiles}, \text{AverageRiskScore}, \text{DurationSeconds})$$

1. **Avoid impassable conditions:** Zero No Travel miles takes absolute priority.
2. **Minimize Severe exposure:** Route with fewest Severe miles is preferred.
3. **Minimize High risk:** Route with fewest High-risk miles breaks ties.
4. **Lowest Average Risk:** Lowest corridor risk score breaks ties.
5. **Shortest Travel Time:** Fastest route wins if safety profiles are identical.

---

## 🛠️ Tech Stack & Architecture

```
spotter-fs-assessment/
├── backend/                  # Django 5.x REST Framework
│   ├── apps/
│   │   ├── risk/             # Pure domain risk & recommendation engine
│   │   ├── routing/          # OSRM client, corridor waypoints & ETA sampling
│   │   ├── weather/          # Open-Meteo batch client & 48h corridor grid
│   │   └── api/              # DRF views, serializers & endpoints
│   ├── tests/                # 20 automated pytest test cases
│   └── manage.py
├── frontend/                 # React 18 (Vite + TypeScript)
│   ├── src/
│   │   ├── components/       # MapView, ForecastSlider, RouteCard, InputForm, etc.
│   │   ├── services/         # API integration client
│   │   └── types/            # TypeScript data contracts
│   └── vite.config.ts
├── docker-compose.yml        # 1-command container orchestration
└── LOOM_WALKTHROUGH.md       # Video recording script
```

---

## 🚀 Quick Start: Local Development

### Prerequisites
- Python 3.11+ (or Python 3.13)
- Node.js 18+ (or Node 22)
- npm 9+

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver 8000
```
Backend API will be running at `http://localhost:8000/api/`.

### 2. Frontend Setup
In a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server with proxy
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 🧪 Automated Testing

The backend includes a comprehensive `pytest` test suite with **20 unit and integration tests** verifying all boundary conditions:
```bash
# From the repository root (using the backend venv):
.\backend\venv\Scripts\pytest backend/tests/ -v
```

### Coverage Highlights:
- **Wind & Load Rules:** Boundary checks at 24.9, 25.0, 34.9, 35.0, 44.9, 45.0, 54.9, 55.0 mph, and load cutoffs at 30,000 and 40,000 lbs.
- **Rain & Snow Rules:** Exact decimal boundary checks (0.09, 0.10, 0.25, 0.50, 1.00 in/hr; 0.49, 0.50, 1.0, 2.0, 3.0 in/hr).
- **Recommendation Engine:** Verifies that No Travel and Severe mile avoidance takes priority over travel time.
- **Sampling & ETA Engine:** Distance calculation and ETA progression math.
- **API Endpoints:** Integration tests for `/api/routes/analyze/`, `/api/presets/`, and `/api/geocoding/search/`.

### Frontend Build Verification:
```bash
npm --prefix frontend run build
```
Builds cleanly with zero TypeScript or bundler errors.

---

## 🐳 Docker Deployment

Run the entire application (Backend + Frontend with Nginx) with a single command:
```bash
docker compose up
```
Access the application at `http://localhost:3001`.

---

## ☁️ Cloud Hosting Instructions

### Backend (Render / Railway / Fly.io)
1. **Render:**
   - Create a new **Web Service**.
   - Connect the repository, set Root Directory to `backend`.
   - Build Command: `pip install -r requirements.txt && python manage.py migrate`
   - Start Command: `python manage.py runserver 0.0.0.0:$PORT` (or `gunicorn core.wsgi:application`).
2. **Fly.io:**
   - Run `fly launch` in `backend/` using the included `Dockerfile`.

### Frontend (Vercel / Netlify / Render)
1. **Vercel:**
   - Import repository, set Root Directory to `frontend`.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Add environment variable `VITE_API_URL` pointing to your hosted backend URL.

---

## 🎥 Loom Video Walkthrough

The Loom video walkthrough demonstrates:
1. Architectural introduction & problem statement.
2. Live route comparison & recommendation rationale demonstration.
3. Checkpoint telemetry & load escalation rules.
4. 0–48 hour corridor forecast heatmap scrubber demo at 60 FPS.
5. Code walkthrough & pytest execution.
