"""
Domain risk classification rules for truck routing based on weather and load weight.
"""

from enum import Enum
from typing import NamedTuple, List, Optional


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"
    NO_TRAVEL = "NO_TRAVEL"


RISK_SCORES = {
    RiskLevel.LOW: 1,
    RiskLevel.MODERATE: 2,
    RiskLevel.HIGH: 3,
    RiskLevel.SEVERE: 4,
    RiskLevel.NO_TRAVEL: 5,
}

SCORE_TO_RISK_LEVEL = {
    1: RiskLevel.LOW,
    2: RiskLevel.MODERATE,
    3: RiskLevel.HIGH,
    4: RiskLevel.SEVERE,
    5: RiskLevel.NO_TRAVEL,
}

RISK_COLORS = {
    RiskLevel.LOW: "#22c55e",       # Green
    RiskLevel.MODERATE: "#eab308",  # Yellow / Amber
    RiskLevel.HIGH: "#f97316",      # Orange
    RiskLevel.SEVERE: "#ef4444",    # Red
    RiskLevel.NO_TRAVEL: "#7f1d1d", # Dark maroon / black
}


class ConditionEvaluation(NamedTuple):
    level: RiskLevel
    score: int
    reason: str
    active_load_rule: bool = False


def evaluate_wind_risk(wind_mph: float, load_lbs: float) -> ConditionEvaluation:
    """
    Evaluates wind risk incorporating vehicle weight aerodynamics.
    Rules:
    - >= 55 mph -> No Travel for any load
    - 45-54 mph + > 30,000 lb -> No Travel (otherwise Severe)
    - 35-44 mph + > 40,000 lb -> Severe (otherwise High)
    - 25-34 mph -> Moderate
    - < 25 mph -> Low
    """
    wind = round(float(wind_mph), 2)
    load = float(load_lbs)

    if wind >= 55.0:
        return ConditionEvaluation(
            level=RiskLevel.NO_TRAVEL,
            score=5,
            reason=f"Extreme wind ({wind:.1f} mph) exceeds 55 mph threshold: No Travel permitted for any load.",
            active_load_rule=True
        )

    if wind >= 45.0:
        if load > 30000.0:
            return ConditionEvaluation(
                level=RiskLevel.NO_TRAVEL,
                score=5,
                reason=f"Severe wind ({wind:.1f} mph) with load {load:,.0f} lbs (> 30,000 lbs) triggers No Travel due to high rollover risk.",
                active_load_rule=True
            )
        return ConditionEvaluation(
            level=RiskLevel.SEVERE,
            score=4,
            reason=f"Severe wind ({wind:.1f} mph) between 45-54 mph (load <= 30,000 lbs).",
            active_load_rule=False
        )

    if wind >= 35.0:
        if load > 40000.0:
            return ConditionEvaluation(
                level=RiskLevel.SEVERE,
                score=4,
                reason=f"High wind ({wind:.1f} mph) with heavy load {load:,.0f} lbs (> 40,000 lbs) escalated to Severe handling risk.",
                active_load_rule=True
            )
        return ConditionEvaluation(
            level=RiskLevel.HIGH,
            score=3,
            reason=f"High wind ({wind:.1f} mph) between 35-44 mph.",
            active_load_rule=False
        )

    if wind >= 25.0:
        return ConditionEvaluation(
            level=RiskLevel.MODERATE,
            score=2,
            reason=f"Moderate wind ({wind:.1f} mph) between 25-34 mph.",
            active_load_rule=False
        )

    return ConditionEvaluation(
        level=RiskLevel.LOW,
        score=1,
        reason=f"Safe wind speed ({wind:.1f} mph) below 25 mph.",
        active_load_rule=False
    )


def evaluate_rain_risk(rain_in_per_hr: float) -> ConditionEvaluation:
    """
    Evaluates precipitation/rain risk:
    - > 1.00 in/hr -> No Travel
    - 0.50-1.00 in/hr -> Severe
    - 0.25-0.50 in/hr -> High
    - 0.10-0.25 in/hr -> Moderate
    - < 0.10 in/hr -> Low
    """
    rain = round(float(rain_in_per_hr), 3)

    if rain > 1.00:
        return ConditionEvaluation(
            level=RiskLevel.NO_TRAVEL,
            score=5,
            reason=f"Torrential rain ({rain:.2f} in/hr) > 1.00 in/hr: Extreme hydroplaning & flash flood hazard (No Travel)."
        )
    if rain >= 0.50:
        return ConditionEvaluation(
            level=RiskLevel.SEVERE,
            score=4,
            reason=f"Severe rain ({rain:.2f} in/hr) between 0.50-1.00 in/hr: High braking distance & low visibility."
        )
    if rain >= 0.25:
        return ConditionEvaluation(
            level=RiskLevel.HIGH,
            score=3,
            reason=f"Heavy rain ({rain:.2f} in/hr) between 0.25-0.50 in/hr: Impaired traction and spray."
        )
    if rain >= 0.10:
        return ConditionEvaluation(
            level=RiskLevel.MODERATE,
            score=2,
            reason=f"Moderate rain ({rain:.2f} in/hr) between 0.10-0.25 in/hr: Wet road conditions."
        )
    return ConditionEvaluation(
        level=RiskLevel.LOW,
        score=1,
        reason=f"Light or no rain ({rain:.2f} in/hr) < 0.10 in/hr."
    )


def evaluate_snow_risk(snow_in_per_hr: float) -> ConditionEvaluation:
    """
    Evaluates snowfall risk:
    - > 3.0 in/hr -> No Travel
    - 2.0-3.0 in/hr -> Severe
    - 1.0-2.0 in/hr -> High
    - 0.5-1.0 in/hr -> Moderate
    - < 0.5 in/hr -> Low
    """
    snow = round(float(snow_in_per_hr), 3)

    if snow > 3.0:
        return ConditionEvaluation(
            level=RiskLevel.NO_TRAVEL,
            score=5,
            reason=f"Extreme snowfall ({snow:.2f} in/hr) > 3.0 in/hr: Whiteout & impassable mountain passes (No Travel)."
        )
    if snow >= 2.0:
        return ConditionEvaluation(
            level=RiskLevel.SEVERE,
            score=4,
            reason=f"Severe snowfall ({snow:.2f} in/hr) between 2.0-3.0 in/hr: Snow pack and loss of control risk."
        )
    if snow >= 1.0:
        return ConditionEvaluation(
            level=RiskLevel.HIGH,
            score=3,
            reason=f"Heavy snowfall ({snow:.2f} in/hr) between 1.0-2.0 in/hr: Tire chain advisory and icy highway."
        )
    if snow >= 0.5:
        return ConditionEvaluation(
            level=RiskLevel.MODERATE,
            score=2,
            reason=f"Moderate snowfall ({snow:.2f} in/hr) between 0.5-1.0 in/hr: Slush and slick roads."
        )
    return ConditionEvaluation(
        level=RiskLevel.LOW,
        score=1,
        reason=f"Light or no snow ({snow:.2f} in/hr) < 0.5 in/hr."
    )


def evaluate_checkpoint_risk(
    wind_mph: float,
    rain_in_per_hr: float,
    snow_in_per_hr: float,
    load_lbs: float
) -> dict:
    """
    Computes overall risk for a checkpoint combining all factors.
    Overall risk level is dictated by the highest hazard score.
    """
    wind_eval = evaluate_wind_risk(wind_mph, load_lbs)
    rain_eval = evaluate_rain_risk(rain_in_per_hr)
    snow_eval = evaluate_snow_risk(snow_in_per_hr)

    max_score = max(wind_eval.score, rain_eval.score, snow_eval.score)
    overall_level = SCORE_TO_RISK_LEVEL[max_score]

    # Gather primary drivers for why this risk was assigned
    drivers = []
    if wind_eval.score == max_score and max_score > 1:
        drivers.append(wind_eval.reason)
    if rain_eval.score == max_score and max_score > 1:
        drivers.append(rain_eval.reason)
    if snow_eval.score == max_score and max_score > 1:
        drivers.append(snow_eval.reason)

    if not drivers:
        summary_reason = "Favorable driving conditions. All weather parameters are low risk."
    else:
        summary_reason = " | ".join(drivers)

    return {
        "overall_level": overall_level.value,
        "overall_score": max_score,
        "color": RISK_COLORS[overall_level],
        "summary_reason": summary_reason,
        "wind": {
            "value_mph": round(wind_mph, 1),
            "level": wind_eval.level.value,
            "score": wind_eval.score,
            "reason": wind_eval.reason,
            "active_load_rule": wind_eval.active_load_rule,
        },
        "rain": {
            "value_in_per_hr": round(rain_in_per_hr, 2),
            "level": rain_eval.level.value,
            "score": rain_eval.score,
            "reason": rain_eval.reason,
        },
        "snow": {
            "value_in_per_hr": round(snow_in_per_hr, 2),
            "level": snow_eval.level.value,
            "score": snow_eval.score,
            "reason": snow_eval.reason,
        },
    }
