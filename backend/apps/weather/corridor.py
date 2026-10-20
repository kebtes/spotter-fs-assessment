"""
Trip corridor grid generation and 0-48 hour weather forecast frames for the heatmap slider.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
from django.core.cache import cache
from .client import _fetch_batch_chunk
from apps.risk.rules import evaluate_checkpoint_risk


def generate_corridor_heatmap_frames(
    routes: List[Dict[str, Any]],
    departure_time: datetime,
    load_lbs: float = 35000.0,
    max_hours: int = 48,
    grid_density: int = 25,
) -> Dict[str, Any]:
    """
    Generates an hourly time-series (0 to 48 hours) of spatial weather intensity points
    across the bounding corridor of all 3 routes for the interactive map heatmap.
    """
    if not routes:
        return {"hours": [], "frames": []}

    # 1. Compute bounding box across all route polylines
    all_lats = []
    all_lons = []
    for r in routes:
        geom = r.get("geometry", {}).get("coordinates", [])
        for lon, lat in geom:
            all_lats.append(lat)
            all_lons.append(lon)

    if not all_lats:
        return {"hours": [], "frames": []}

    min_lat, max_lat = min(all_lats), max(all_lats)
    min_lon, max_lon = min(all_lons), max(all_lons)

    # Buffer the corridor slightly (~40 miles / 0.6 degrees)
    lat_pad = max(0.4, (max_lat - min_lat) * 0.12)
    lon_pad = max(0.4, (max_lon - min_lon) * 0.12)

    min_lat -= lat_pad
    max_lat += lat_pad
    min_lon -= lon_pad
    max_lon += lon_pad

    # 2. Generate regular grid points within corridor
    # Determine grid resolution
    lat_steps = max(3, int(round(math.sqrt(grid_density) * 0.8)))
    lon_steps = max(4, int(round(grid_density / lat_steps)))

    lat_step = (max_lat - min_lat) / (lat_steps - 1) if lat_steps > 1 else 0
    lon_step = (max_lon - min_lon) / (lon_steps - 1) if lon_steps > 1 else 0

    grid_coords = []
    for i in range(lat_steps):
        for j in range(lon_steps):
            glat = min_lat + i * lat_step
            glon = min_lon + j * lon_step
            grid_coords.append((round(glat, 4), round(glon, 4)))

    # Also include key checkpoints from all routes to guarantee highest fidelity on highway lines
    for r in routes:
        cps = r.get("checkpoints", [])
        # sample 5-8 checkpoints per route
        step = max(1, len(cps) // 6)
        for cp in cps[::step]:
            grid_coords.append((cp["latitude"], cp["longitude"]))

    # Deduplicate coords close to each other
    unique_coords = []
    seen = set()
    for lat, lon in grid_coords:
        key = (round(lat, 2), round(lon, 2))
        if key not in seen:
            seen.add(key)
            unique_coords.append((lat, lon))

    # 3. Batch fetch forecast for grid points
    forecast_results = _fetch_batch_chunk(unique_coords)

    # 4. Construct hourly frames (0 to max_hours)
    if departure_time.tzinfo is None:
        departure_time = departure_time.replace(tzinfo=timezone.utc)

    hours_list = []
    frames = []

    # Map forecast time strings to index
    sample_forecast = forecast_results[0] if forecast_results else {}
    time_list = sample_forecast.get("hourly", {}).get("time", [])

    for h in range(max_hours + 1):
        target_dt = departure_time + timedelta(hours=h)
        target_iso = target_dt.strftime("%Y-%m-%dT%H:00")
        hours_list.append(h)

        # Find matching hour index in weather arrays
        matched_idx = h
        if time_list:
            min_diff = float("inf")
            for t_i, t_str in enumerate(time_list):
                try:
                    f_dt = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                    diff = abs((f_dt - target_dt).total_seconds())
                    if diff < min_diff:
                        min_diff = diff
                        matched_idx = t_i
                except Exception:
                    pass

        # Collect features for this hour frame
        features = []
        for c_idx, (lat, lon) in enumerate(unique_coords):
            f_obj = forecast_results[c_idx] if c_idx < len(forecast_results) else {}
            hourly = f_obj.get("hourly", {})

            wind_arr = hourly.get("wind_speed_10m", [])
            rain_arr = hourly.get("rain", [])
            snow_arr = hourly.get("snowfall", [])

            w_mph = wind_arr[matched_idx] if matched_idx < len(wind_arr) and wind_arr[matched_idx] is not None else 8.0
            r_in = rain_arr[matched_idx] if matched_idx < len(rain_arr) and rain_arr[matched_idx] is not None else 0.0
            s_in = snow_arr[matched_idx] if matched_idx < len(snow_arr) and snow_arr[matched_idx] is not None else 0.0

            # Evaluate composite risk
            risk_eval = evaluate_checkpoint_risk(w_mph, r_in, s_in, load_lbs)
            score = risk_eval["overall_score"]

            # Continuous meteorological intensity (0.15 to 1.0) so weather is always visible and moves dynamically
            wind_intensity = min(1.0, max(0.15, w_mph / 40.0))
            rain_intensity = min(1.0, r_in / 0.40) if r_in > 0 else 0.0
            snow_intensity = min(1.0, s_in / 1.50) if s_in > 0 else 0.0
            risk_intensity = (score - 1) / 4.0

            intensity = max(wind_intensity, rain_intensity, snow_intensity, risk_intensity)

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "intensity": round(intensity, 3),
                    "risk_score": score,
                    "risk_level": risk_eval["overall_level"],
                    "wind_mph": round(w_mph, 1),
                    "rain_in": round(r_in, 2),
                    "snow_in": round(s_in, 2),
                },
            })

        max_w = max((f["properties"]["wind_mph"] for f in features), default=0.0)
        max_r = max((f["properties"]["rain_in"] for f in features), default=0.0)
        max_s = max((f["properties"]["snow_in"] for f in features), default=0.0)
        worst_l = max((f["properties"]["risk_score"] for f in features), default=1)

        frames.append({
            "hour": h,
            "timestamp_iso": target_dt.isoformat(),
            "formatted_time": target_dt.strftime("%a %b %d, %I:%M %p"),
            "max_wind_mph": round(max_w, 1),
            "max_rain_in": round(max_r, 2),
            "max_snow_in": round(max_s, 2),
            "worst_risk_score": worst_l,
            "geojson": {
                "type": "FeatureCollection",
                "features": features,
            },
        })

    return {
        "max_hours": max_hours,
        "hours": hours_list,
        "frames": frames,
    }
