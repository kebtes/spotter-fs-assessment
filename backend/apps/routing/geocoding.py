"""
Geocoding service using Photon / OpenStreetMap with curated freight hub presets.
"""

import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

FREIGHT_HUBS = [
    {"name": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298, "state": "IL"},
    {"name": "Denver, CO", "latitude": 39.7392, "longitude": -104.9903, "state": "CO"},
    {"name": "Dallas, TX", "latitude": 32.7767, "longitude": -96.7970, "state": "TX"},
    {"name": "Atlanta, GA", "latitude": 33.7490, "longitude": -84.3880, "state": "GA"},
    {"name": "Los Angeles, CA", "latitude": 34.0522, "longitude": -118.2437, "state": "CA"},
    {"name": "Seattle, WA", "latitude": 47.6062, "longitude": -122.3321, "state": "WA"},
    {"name": "Salt Lake City, UT", "latitude": 40.7608, "longitude": -111.8910, "state": "UT"},
    {"name": "Kansas City, MO", "latitude": 39.0997, "longitude": -94.5786, "state": "MO"},
    {"name": "Nashville, TN", "latitude": 36.1627, "longitude": -86.7816, "state": "TN"},
    {"name": "Phoenix, AZ", "latitude": 33.4484, "longitude": -112.0740, "state": "AZ"},
    {"name": "New York, NY", "latitude": 40.7128, "longitude": -74.0060, "state": "NY"},
    {"name": "Minneapolis, MN", "latitude": 44.9778, "longitude": -93.2650, "state": "MN"},
]


def search_locations(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Searches for locations matching the query. First checks freight hub presets,
    then queries the Photon geocoding API.
    """
    if not query or len(query.strip()) < 2:
        return FREIGHT_HUBS[:limit]

    q_clean = query.strip().lower()
    matches = []

    # Check local presets
    for hub in FREIGHT_HUBS:
        if q_clean in hub["name"].lower():
            matches.append({
                "label": hub["name"],
                "latitude": hub["latitude"],
                "longitude": hub["longitude"],
                "source": "preset",
            })

    # Query Photon API
    try:
        url = "https://photon.komoot.io/api/"
        params = {"q": query, "limit": limit}
        headers = {"User-Agent": "TruckSafetyApp/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            for feat in data.get("features", []):
                coords = feat.get("geometry", {}).get("coordinates", [])
                props = feat.get("properties", {})
                if len(coords) >= 2:
                    lon, lat = coords[0], coords[1]
                    name_parts = [props.get("name")]
                    if props.get("city") and props.get("city") != props.get("name"):
                        name_parts.append(props.get("city"))
                    if props.get("state"):
                        name_parts.append(props.get("state"))
                    if props.get("country"):
                        name_parts.append(props.get("country"))
                    
                    label = ", ".join([p for p in name_parts if p])
                    # Check if already in matches
                    if not any(abs(m["latitude"] - lat) < 0.05 and abs(m["longitude"] - lon) < 0.05 for m in matches):
                        matches.append({
                            "label": label or props.get("name", "Unknown"),
                            "latitude": round(lat, 5),
                            "longitude": round(lon, 5),
                            "source": "photon",
                        })
    except Exception as exc:
        logger.warning(f"Geocoding network lookup failed: {exc}")

    return matches[:limit] or FREIGHT_HUBS[:limit]
