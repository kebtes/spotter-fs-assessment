"""
Route aggregation and risk scoring engine.
"""

from typing import List, Dict, Any
from .rules import (
    RiskLevel,
    RISK_SCORES,
    SCORE_TO_RISK_LEVEL,
    RISK_COLORS,
    evaluate_checkpoint_risk,
)


def aggregate_route_risk(checkpoints: List[Dict[str, Any]], total_distance_miles: float) -> Dict[str, Any]:
    """
    Aggregates risk metrics across all route checkpoints:
    - Calculates exact mileage under each risk level: Low, Moderate, High, Severe, No Travel
    - Calculates distance-weighted average risk score
    - Determines worst encountered risk
    - Computes percentage distribution
    """
    if not checkpoints:
        return {
            "total_miles": round(total_distance_miles, 1),
            "no_travel_miles": 0.0,
            "severe_miles": 0.0,
            "high_miles": 0.0,
            "moderate_miles": 0.0,
            "low_miles": 0.0,
            "average_risk_score": 1.0,
            "worst_risk_level": RiskLevel.LOW.value,
            "worst_risk_score": 1,
            "worst_risk_color": RISK_COLORS[RiskLevel.LOW],
            "distribution_pct": {
                "low": 100.0,
                "moderate": 0.0,
                "high": 0.0,
                "severe": 0.0,
                "no_travel": 0.0,
            },
        }

    n = len(checkpoints)
    miles_by_level = {
        RiskLevel.LOW.value: 0.0,
        RiskLevel.MODERATE.value: 0.0,
        RiskLevel.HIGH.value: 0.0,
        RiskLevel.SEVERE.value: 0.0,
        RiskLevel.NO_TRAVEL.value: 0.0,
    }

    weighted_score_sum = 0.0
    accumulated_miles = 0.0
    worst_score = 1

    # If only 1 checkpoint, entire distance takes that checkpoint's risk
    if n == 1:
        score = checkpoints[0]["risk"]["overall_score"]
        level = checkpoints[0]["risk"]["overall_level"]
        miles_by_level[level] = total_distance_miles
        weighted_score_sum = score * total_distance_miles
        accumulated_miles = total_distance_miles
        worst_score = score
    else:
        # Segment-by-segment calculation based on checkpoint intervals
        for i in range(n - 1):
            curr_cp = checkpoints[i]
            next_cp = checkpoints[i + 1]

            seg_miles = max(0.0, next_cp["distance_from_origin_miles"] - curr_cp["distance_from_origin_miles"])
            if seg_miles == 0.0:
                continue

            # Assign conservative risk of the segment (max of current and next checkpoint)
            curr_score = curr_cp["risk"]["overall_score"]
            next_score = next_cp["risk"]["overall_score"]
            seg_score = max(curr_score, next_score)
            seg_level = SCORE_TO_RISK_LEVEL[seg_score].value

            miles_by_level[seg_level] += seg_miles
            weighted_score_sum += seg_score * seg_miles
            accumulated_miles += seg_miles
            if seg_score > worst_score:
                worst_score = seg_score

    # Normalize if accumulated miles differs slightly from total distance
    if accumulated_miles > 0:
        avg_score = weighted_score_sum / accumulated_miles
    else:
        avg_score = 1.0

    total_calc_miles = max(accumulated_miles, total_distance_miles, 0.1)

    pct_dist = {
        "low": round((miles_by_level[RiskLevel.LOW.value] / total_calc_miles) * 100.0, 1),
        "moderate": round((miles_by_level[RiskLevel.MODERATE.value] / total_calc_miles) * 100.0, 1),
        "high": round((miles_by_level[RiskLevel.HIGH.value] / total_calc_miles) * 100.0, 1),
        "severe": round((miles_by_level[RiskLevel.SEVERE.value] / total_calc_miles) * 100.0, 1),
        "no_travel": round((miles_by_level[RiskLevel.NO_TRAVEL.value] / total_calc_miles) * 100.0, 1),
    }

    worst_level = SCORE_TO_RISK_LEVEL[worst_score]

    return {
        "total_miles": round(total_distance_miles, 1),
        "no_travel_miles": round(miles_by_level[RiskLevel.NO_TRAVEL.value], 1),
        "severe_miles": round(miles_by_level[RiskLevel.SEVERE.value], 1),
        "high_miles": round(miles_by_level[RiskLevel.HIGH.value], 1),
        "moderate_miles": round(miles_by_level[RiskLevel.MODERATE.value], 1),
        "low_miles": round(miles_by_level[RiskLevel.LOW.value], 1),
        "average_risk_score": round(avg_score, 2),
        "worst_risk_level": worst_level.value,
        "worst_risk_score": worst_score,
        "worst_risk_color": RISK_COLORS[worst_level],
        "distribution_pct": pct_dist,
    }
