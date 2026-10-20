"""
Integration tests for Django REST Framework API endpoints.
"""

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestApiEndpoints:
    def test_presets_endpoint(self, client):
        response = client.get("/api/presets/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
        assert any("Chicago" in p["title"] for p in data)

    def test_geocoding_search_endpoint(self, client):
        response = client.get("/api/geocoding/search/?q=Denver")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any("Denver" in item["label"] for item in data)

    def test_route_analysis_endpoint_validation_error(self, client):
        # Missing destination
        payload = {
            "origin": {"label": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298},
        }
        response = client.post("/api/routes/analyze/", data=payload, format="json")
        assert response.status_code == 400

    def test_route_analysis_endpoint_full_pipeline(self, client):
        payload = {
            "origin": {"label": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298},
            "destination": {"label": "Denver, CO", "latitude": 39.7392, "longitude": -104.9903},
            "departure_time": "2026-10-17T14:00:00Z",
            "load_weight_lbs": 42000,
            "sampling_interval_miles": 50,
        }
        response = client.post("/api/routes/analyze/", data=payload, format="json")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "success"
        # Exactly 3 routes returned
        assert len(data["routes"]) == 3

        # Exactly 1 route recommended
        recommended_count = sum(1 for r in data["routes"] if r["is_recommended"])
        assert recommended_count == 1

        first_route = data["routes"][0]
        assert "risk_summary" in first_route
        assert "checkpoints" in first_route
        assert len(first_route["checkpoints"]) > 0

        # Checkpoint structure
        first_cp = first_route["checkpoints"][0]
        assert "weather" in first_cp
        assert "risk" in first_cp
        assert "overall_level" in first_cp["risk"]

        # Heatmap structure
        assert "heatmap" in data
        assert data["heatmap"]["max_hours"] == 48
        assert len(data["heatmap"]["frames"]) == 49
