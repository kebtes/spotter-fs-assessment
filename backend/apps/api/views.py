"""
DRF Views handling route analysis, corridor weather generation, geocoding, and presets.
"""

from datetime import datetime, timezone, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import RouteAnalysisRequestSerializer, GeocodeQuerySerializer
from apps.routing.services import generate_three_routes
from apps.routing.sampling import sample_checkpoints
from apps.routing.geocoding import search_locations, FREIGHT_HUBS
from apps.weather.client import fetch_weather_for_checkpoints
from apps.weather.corridor import generate_corridor_heatmap_frames
from apps.risk.rules import evaluate_checkpoint_risk
from apps.risk.engine import aggregate_route_risk
from apps.risk.recommend import rank_and_recommend_routes


class RouteAnalysisView(APIView):
    """
    Core pipeline:
    1. Generates 3 route options
    2. Samples checkpoints every 10/25/50 miles
    3. Calculates truck ETA at each checkpoint
    4. Fetches hourly weather forecast at ETA
    5. Computes load-adjusted risk and aggregate stats
    6. Recommends the safest route
    7. Builds 0-48h corridor heatmap data for the slider
    """

    def post(self, request):
        serializer = RouteAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": "Validation failed", "details": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        origin = data["origin"]
        dest = data["destination"]
        departure_time = data.get("departure_time") or datetime.now(timezone.utc)
        load_weight_lbs = data["load_weight_lbs"]
        sampling_interval = data["sampling_interval_miles"]

        # Ensure departure_time is timezone aware
        if departure_time.tzinfo is None:
            departure_time = departure_time.replace(tzinfo=timezone.utc)

        # 1. Generate 3 distinct routes
        raw_routes = generate_three_routes(
            origin["latitude"], origin["longitude"],
            dest["latitude"], dest["longitude"]
        )

        evaluated_routes = []

        # 2. Process each route
        for route in raw_routes:
            coords = route["geometry"]["coordinates"]
            dist_miles = route["distance_miles"]
            dur_seconds = route["duration_seconds"]

            # Sample checkpoints along polyline
            raw_checkpoints = sample_checkpoints(
                coordinates=coords,
                total_distance_miles=dist_miles,
                total_duration_seconds=dur_seconds,
                departure_time=departure_time,
                sampling_interval_miles=sampling_interval,
            )

            # Enrich checkpoints with weather at ETA
            weather_checkpoints = fetch_weather_for_checkpoints(raw_checkpoints)

            # Evaluate risk at each checkpoint
            final_checkpoints = []
            for cp in weather_checkpoints:
                w = cp.get("weather", {})
                wind_mph = w.get("wind_speed_mph", 8.0)
                rain_in = w.get("rain_in_per_hr", 0.0)
                snow_in = w.get("snow_in_per_hr", 0.0)

                risk = evaluate_checkpoint_risk(wind_mph, rain_in, snow_in, load_weight_lbs)
                cp["risk"] = risk
                final_checkpoints.append(cp)

            # Aggregate route-level risk summary
            risk_summary = aggregate_route_risk(final_checkpoints, dist_miles)

            # Calculate arrival ETA
            eta_dest = departure_time + timedelta(seconds=dur_seconds)
            hours = dur_seconds // 3600
            mins = (dur_seconds % 3600) // 60
            formatted_duration = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

            evaluated_routes.append({
                "id": route["id"],
                "name": route["name"],
                "distance_miles": dist_miles,
                "duration_seconds": dur_seconds,
                "formatted_duration": formatted_duration,
                "eta_destination": eta_dest.isoformat(),
                "geometry": route["geometry"],
                "risk_summary": risk_summary,
                "checkpoints": final_checkpoints,
            })

        # 3. Rank routes according to preference rules
        ranked_routes = rank_and_recommend_routes(evaluated_routes)

        # 4. Generate 0-48 hour corridor weather frames for the interactive heatmap
        heatmap_data = generate_corridor_heatmap_frames(
            routes=ranked_routes,
            departure_time=departure_time,
            load_lbs=load_weight_lbs,
            max_hours=48,
        )

        return Response({
            "status": "success",
            "metadata": {
                "origin": origin,
                "destination": dest,
                "departure_time": departure_time.isoformat(),
                "load_weight_lbs": load_weight_lbs,
                "sampling_interval_miles": sampling_interval,
                "calculated_at": datetime.now(timezone.utc).isoformat(),
            },
            "routes": ranked_routes,
            "heatmap": heatmap_data,
        })


class GeocodeSearchView(APIView):
    """
    Search locations with debounce and freight presets.
    """
    def get(self, request):
        serializer = GeocodeQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(FREIGHT_HUBS[:5])
        
        q = serializer.validated_data["q"]
        limit = serializer.validated_data["limit"]
        results = search_locations(q, limit)
        return Response(results)


class PresetsView(APIView):
    """
    Returns curated long-haul trip presets for quick evaluation.
    """
    def get(self, request):
        presets = [
            {
                "id": "chi_den",
                "title": "Chicago, IL → Denver, CO",
                "description": "I-80 high crosswind plains corridor; tests 35-55 mph wind load thresholds.",
                "origin": {"label": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298},
                "destination": {"label": "Denver, CO", "latitude": 39.7392, "longitude": -104.9903},
                "default_load_lbs": 42000,
            },
            {
                "id": "sea_slc",
                "title": "Seattle, WA → Salt Lake City, UT",
                "description": "Pacific Northwest mountain passes; tests winter precipitation & snowfall rates.",
                "origin": {"label": "Seattle, WA", "latitude": 47.6062, "longitude": -122.3321},
                "destination": {"label": "Salt Lake City, UT", "latitude": 40.7608, "longitude": -111.8910},
                "default_load_lbs": 32000,
            },
            {
                "id": "dal_atl",
                "title": "Dallas, TX → Atlanta, GA",
                "description": "Southeast interstate corridor; tests torrential rain & hydroplaning rules.",
                "origin": {"label": "Dallas, TX", "latitude": 32.7767, "longitude": -96.7970},
                "destination": {"label": "Atlanta, GA", "latitude": 33.7490, "longitude": -84.3880},
                "default_load_lbs": 28000,
            },
            {
                "id": "la_phx",
                "title": "Los Angeles, CA → Phoenix, AZ",
                "description": "Desert corridor along I-10; tests high gust wind escalations.",
                "origin": {"label": "Los Angeles, CA", "latitude": 34.0522, "longitude": -118.2437},
                "destination": {"label": "Phoenix, AZ", "latitude": 33.4484, "longitude": -112.0740},
                "default_load_lbs": 45000,
            },
        ]
        return Response(presets)
