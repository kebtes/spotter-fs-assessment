"""
Unit tests for polyline sampling and ETA calculations.
"""

from datetime import datetime, timezone
import pytest
from apps.routing.sampling import sample_checkpoints, haversine_miles


class TestSamplingAndETA:
    def test_haversine_accuracy(self):
        # Chicago to Denver is approx ~915 miles direct
        dist = haversine_miles(41.8781, -87.6298, 39.7392, -104.9903)
        assert 890.0 < dist < 940.0

    def test_checkpoint_interval_spacing(self):
        # Create a straight line segment of ~100 miles
        start_lat, start_lon = 40.0, -90.0
        end_lat, end_lon = 40.0, -88.0  # Approx 106 miles along 40N
        coords = [[start_lon, start_lat], [end_lon, end_lat]]

        dep_time = datetime(2026, 10, 17, 12, 0, tzinfo=timezone.utc)
        total_dist = haversine_miles(start_lat, start_lon, end_lat, end_lon)
        total_dur = 7200  # 2 hours

        # Sample every 25 miles
        cps_25 = sample_checkpoints(coords, total_dist, total_dur, dep_time, sampling_interval_miles=25.0)
        assert len(cps_25) >= 4
        assert cps_25[0]["distance_from_origin_miles"] == 0.0
        assert cps_25[1]["distance_from_origin_miles"] == 25.0
        assert cps_25[2]["distance_from_origin_miles"] == 50.0

        # Verify ETAs strictly increase
        for i in range(len(cps_25) - 1):
            assert cps_25[i]["eta_unix"] < cps_25[i + 1]["eta_unix"]
            assert cps_25[i]["elapsed_seconds"] < cps_25[i + 1]["elapsed_seconds"]

        # Sample every 50 miles
        cps_50 = sample_checkpoints(coords, total_dist, total_dur, dep_time, sampling_interval_miles=50.0)
        assert len(cps_50) < len(cps_25)
        assert cps_50[1]["distance_from_origin_miles"] == 50.0
