"""
Polyline checkpoint sampling and ETA calculation service.
Samples route coordinates every 10, 25, or 50 miles with high-precision interpolation.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple

EARTH_RADIUS_MILES = 3958.8


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in miles.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_MILES * c


def sample_checkpoints(
    coordinates: List[List[float]],  # [[lon, lat], ...]
    total_distance_miles: float,
    total_duration_seconds: float,
    departure_time: datetime,
    sampling_interval_miles: float = 25.0,
) -> List[Dict[str, Any]]:
    """
    Samples checkpoints along the route at regular intervals (e.g. 10, 25, 50 miles)
    and at the final destination. Interpolates coordinates along line segments.
    Computes precise ETA for each checkpoint.
    """
    if not coordinates:
        return []

    # Ensure departure_time is timezone-aware (UTC default if naive)
    if departure_time.tzinfo is None:
        departure_time = departure_time.replace(tzinfo=timezone.utc)

    # 1. Precalculate cumulative distances along polyline vertices
    vertex_cum_dist = [0.0]
    total_poly_dist = 0.0

    for i in range(len(coordinates) - 1):
        lon1, lat1 = coordinates[i]
        lon2, lat2 = coordinates[i + 1]
        dist = haversine_miles(lat1, lon1, lat2, lon2)
        total_poly_dist += dist
        vertex_cum_dist.append(total_poly_dist)

    # If coordinates has only 1 point or polyline dist is near zero
    if total_poly_dist < 0.001 or len(coordinates) == 1:
        lon, lat = coordinates[0]
        return [
            {
                "index": 0,
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "distance_from_origin_miles": 0.0,
                "eta_iso": departure_time.isoformat(),
                "eta_unix": int(departure_time.timestamp()),
                "elapsed_seconds": 0,
            }
        ]

    # Target distances for checkpoints: 0, interval, 2*interval, ..., end
    target_distances = []
    current_dist = 0.0
    while current_dist < total_poly_dist - 0.5:  # Avoid duplicate very close to destination
        target_distances.append(current_dist)
        current_dist += sampling_interval_miles

    # Always ensure the final destination is included as the last checkpoint
    if not target_distances or abs(target_distances[-1] - total_poly_dist) > 1.0:
        target_distances.append(total_poly_dist)

    checkpoints = []
    v_idx = 0
    num_vertices = len(coordinates)

    for cp_idx, target_d in enumerate(target_distances):
        # Advance vertex index until segment contains target_d
        while v_idx < num_vertices - 2 and vertex_cum_dist[v_idx + 1] < target_d:
            v_idx += 1

        seg_start_d = vertex_cum_dist[v_idx]
        seg_end_d = vertex_cum_dist[v_idx + 1]
        seg_len = seg_end_d - seg_start_d

        if seg_len > 1e-7:
            ratio = (target_d - seg_start_d) / seg_len
            ratio = max(0.0, min(1.0, ratio))
        else:
            ratio = 0.0

        lon1, lat1 = coordinates[v_idx]
        lon2, lat2 = coordinates[v_idx + 1]

        interp_lat = lat1 + ratio * (lat2 - lat1)
        interp_lon = lon1 + ratio * (lon2 - lon1)

        # Calculate ETA based on progress along the total route
        fraction = target_d / total_poly_dist if total_poly_dist > 0 else 0.0
        elapsed_seconds = int(round(fraction * total_duration_seconds))
        eta = departure_time + timedelta(seconds=elapsed_seconds)

        checkpoints.append(
            {
                "index": cp_idx,
                "latitude": round(interp_lat, 5),
                "longitude": round(interp_lon, 5),
                "distance_from_origin_miles": round(target_d, 1),
                "eta_iso": eta.isoformat(),
                "eta_unix": int(eta.timestamp()),
                "elapsed_seconds": elapsed_seconds,
            }
        )

    return checkpoints
