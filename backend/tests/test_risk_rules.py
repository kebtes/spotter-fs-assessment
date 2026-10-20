"""
Comprehensive unit tests for weather and truck load risk rules.
Tests all boundary values and threshold transitions.
"""

import pytest
from apps.risk.rules import (
    RiskLevel,
    evaluate_wind_risk,
    evaluate_rain_risk,
    evaluate_snow_risk,
    evaluate_checkpoint_risk,
)


class TestWindAndLoadRules:
    def test_low_wind(self):
        # < 25 mph should be LOW regardless of load
        for wind in [0.0, 12.5, 24.9]:
            res = evaluate_wind_risk(wind, load_lbs=45000.0)
            assert res.level == RiskLevel.LOW
            assert res.score == 1
            assert not res.active_load_rule

    def test_moderate_wind(self):
        # 25-34 mph should be MODERATE
        for wind in [25.0, 30.0, 34.9]:
            res = evaluate_wind_risk(wind, load_lbs=50000.0)
            assert res.level == RiskLevel.MODERATE
            assert res.score == 2
            assert not res.active_load_rule

    def test_high_wind_under_40k_lbs(self):
        # 35-44 mph with load <= 40,000 lbs is HIGH
        for wind in [35.0, 40.0, 44.9]:
            res = evaluate_wind_risk(wind, load_lbs=40000.0)
            assert res.level == RiskLevel.HIGH
            assert res.score == 3
            assert not res.active_load_rule

    def test_high_wind_over_40k_lbs_escalation_to_severe(self):
        # 35-44 mph with load > 40,000 lbs ESCALATES to SEVERE
        for wind in [35.0, 39.5, 44.9]:
            res = evaluate_wind_risk(wind, load_lbs=40001.0)
            assert res.level == RiskLevel.SEVERE
            assert res.score == 4
            assert res.active_load_rule

    def test_severe_wind_under_30k_lbs(self):
        # 45-54 mph with load <= 30,000 lbs is SEVERE
        for wind in [45.0, 50.0, 54.9]:
            res = evaluate_wind_risk(wind, load_lbs=30000.0)
            assert res.level == RiskLevel.SEVERE
            assert res.score == 4
            assert not res.active_load_rule

    def test_severe_wind_over_30k_lbs_escalation_to_no_travel(self):
        # 45-54 mph with load > 30,000 lbs ESCALATES to NO_TRAVEL
        for wind in [45.0, 48.0, 54.9]:
            res = evaluate_wind_risk(wind, load_lbs=30001.0)
            assert res.level == RiskLevel.NO_TRAVEL
            assert res.score == 5
            assert res.active_load_rule

    def test_extreme_wind_no_travel_any_load(self):
        # >= 55 mph is NO_TRAVEL for any load weight
        for load in [5000.0, 20000.0, 35000.0, 80000.0]:
            for wind in [55.0, 65.0, 90.0]:
                res = evaluate_wind_risk(wind, load_lbs=load)
                assert res.level == RiskLevel.NO_TRAVEL
                assert res.score == 5
                assert res.active_load_rule


class TestRainRules:
    def test_rain_thresholds(self):
        # < 0.10: Low
        assert evaluate_rain_risk(0.0).level == RiskLevel.LOW
        assert evaluate_rain_risk(0.09).level == RiskLevel.LOW

        # 0.10 - 0.25: Moderate
        assert evaluate_rain_risk(0.10).level == RiskLevel.MODERATE
        assert evaluate_rain_risk(0.24).level == RiskLevel.MODERATE

        # 0.25 - 0.50: High
        assert evaluate_rain_risk(0.25).level == RiskLevel.HIGH
        assert evaluate_rain_risk(0.49).level == RiskLevel.HIGH

        # 0.50 - 1.00: Severe
        assert evaluate_rain_risk(0.50).level == RiskLevel.SEVERE
        assert evaluate_rain_risk(1.00).level == RiskLevel.SEVERE

        # > 1.00: No Travel
        assert evaluate_rain_risk(1.01).level == RiskLevel.NO_TRAVEL
        assert evaluate_rain_risk(2.50).level == RiskLevel.NO_TRAVEL


class TestSnowRules:
    def test_snow_thresholds(self):
        # < 0.5: Low
        assert evaluate_snow_risk(0.0).level == RiskLevel.LOW
        assert evaluate_snow_risk(0.49).level == RiskLevel.LOW

        # 0.5 - 1.0: Moderate
        assert evaluate_snow_risk(0.50).level == RiskLevel.MODERATE
        assert evaluate_snow_risk(0.99).level == RiskLevel.MODERATE

        # 1.0 - 2.0: High
        assert evaluate_snow_risk(1.00).level == RiskLevel.HIGH
        assert evaluate_snow_risk(1.99).level == RiskLevel.HIGH

        # 2.0 - 3.0: Severe
        assert evaluate_snow_risk(2.00).level == RiskLevel.SEVERE
        assert evaluate_snow_risk(3.00).level == RiskLevel.SEVERE

        # > 3.0: No Travel
        assert evaluate_snow_risk(3.01).level == RiskLevel.NO_TRAVEL
        assert evaluate_snow_risk(4.50).level == RiskLevel.NO_TRAVEL


class TestCompositeCheckpointRisk:
    def test_composite_risk_takes_highest_score(self):
        # Rain is High (3), Wind is Low (1), Snow is Low (1) -> Overall High
        res = evaluate_checkpoint_risk(wind_mph=10.0, rain_in_per_hr=0.35, snow_in_per_hr=0.0, load_lbs=30000.0)
        assert res["overall_level"] == "HIGH"
        assert res["overall_score"] == 3

        # Wind escalated to Severe (4) with heavy load -> Overall Severe
        res = evaluate_checkpoint_risk(wind_mph=38.0, rain_in_per_hr=0.15, snow_in_per_hr=0.0, load_lbs=45000.0)
        assert res["overall_level"] == "SEVERE"
        assert res["overall_score"] == 4
        assert res["wind"]["active_load_rule"] is True

        # Extreme snow (>3.0) -> Overall NO_TRAVEL
        res = evaluate_checkpoint_risk(wind_mph=15.0, rain_in_per_hr=0.0, snow_in_per_hr=3.5, load_lbs=20000.0)
        assert res["overall_level"] == "NO_TRAVEL"
        assert res["overall_score"] == 5
