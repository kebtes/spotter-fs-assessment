"""
Unit tests for route recommendation ranking hierarchy and rationale generation.
"""

import pytest
from apps.risk.recommend import rank_and_recommend_routes


class TestRouteRecommendationHierarchy:
    def test_prefers_zero_no_travel_miles(self):
        # Route A has NO_TRAVEL miles, Route B has 0 NO_TRAVEL miles but slightly longer travel time
        route_a = {
            "id": "route_a",
            "name": "Route A (Shortest)",
            "duration_seconds": 36000,
            "risk_summary": {
                "no_travel_miles": 15.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.5,
            },
        }
        route_b = {
            "id": "route_b",
            "name": "Route B (Safe)",
            "duration_seconds": 40000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 10.0,
                "high_miles": 20.0,
                "average_risk_score": 2.1,
            },
        }

        ranked = rank_and_recommend_routes([route_a, route_b])
        assert ranked[0]["id"] == "route_b"
        assert ranked[0]["is_recommended"] is True
        assert "NO TRAVEL" in ranked[0]["recommendation_rationale"]

    def test_prefers_fewest_severe_miles(self):
        # Both have 0 no_travel. Route A has 5 severe miles; Route B has 25 severe miles
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 45000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 5.0,
                "high_miles": 50.0,
                "average_risk_score": 2.5,
            },
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 42000,  # Faster, but more severe miles
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 25.0,
                "high_miles": 10.0,
                "average_risk_score": 2.3,
            },
        }

        ranked = rank_and_recommend_routes([route_b, route_a])
        assert ranked[0]["id"] == "route_a"
        assert ranked[0]["is_recommended"] is True
        assert "Severe" in ranked[0]["recommendation_rationale"]

    def test_prefers_fewest_high_miles_when_severe_tied(self):
        # Both have 0 no_travel and 0 severe miles. Route A has 10 high miles, Route B has 30 high miles
        route_a = {
            "id": "route_a",
            "name": "Route A",
            "duration_seconds": 50000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 10.0,
                "average_risk_score": 1.8,
            },
        }
        route_b = {
            "id": "route_b",
            "name": "Route B",
            "duration_seconds": 48000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 30.0,
                "average_risk_score": 2.0,
            },
        }

        ranked = rank_and_recommend_routes([route_b, route_a])
        assert ranked[0]["id"] == "route_a"
        assert ranked[0]["is_recommended"] is True

    def test_prefers_shortest_time_when_risks_tied(self):
        # Identical risk profiles -> fastest route wins
        route_fast = {
            "id": "route_fast",
            "name": "Fast Route",
            "duration_seconds": 30000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.0,
            },
        }
        route_slow = {
            "id": "route_slow",
            "name": "Slow Route",
            "duration_seconds": 35000,
            "risk_summary": {
                "no_travel_miles": 0.0,
                "severe_miles": 0.0,
                "high_miles": 0.0,
                "average_risk_score": 1.0,
            },
        }

        ranked = rank_and_recommend_routes([route_slow, route_fast])
        assert ranked[0]["id"] == "route_fast"
        assert ranked[0]["is_recommended"] is True
        assert "faster" in ranked[0]["recommendation_rationale"]
