"""
Route recommendation ranking and rationale generator.
Rules:
Prefer:
1. Fewest Severe miles (and Fewest No Travel miles)
2. Fewest High miles
3. Lowest average risk
4. Shortest travel times
"""

from typing import List, Dict, Any


def rank_and_recommend_routes(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks routes according to safety priority and generates a clear, human-readable rationale.
    """
    if not routes:
        return []

    # Sort key lexicographically:
    # 1a. no_travel_miles (ascending - zero is best)
    # 1b. severe_miles (ascending - fewest is best)
    # 2.  high_miles (ascending - fewest is best)
    # 3.  average_risk_score (ascending - lowest is best)
    # 4.  duration_seconds (ascending - shortest is best)
    def sort_key(r: Dict[str, Any]):
        risk_summary = r.get("risk_summary", {})
        return (
            risk_summary.get("no_travel_miles", 0.0),
            risk_summary.get("severe_miles", 0.0),
            risk_summary.get("high_miles", 0.0),
            round(risk_summary.get("average_risk_score", 1.0), 3),
            r.get("duration_seconds", 0),
        )

    sorted_routes = sorted(routes, key=sort_key)

    # Decorate routes with rank, recommended flag, and rationale
    for rank_idx, route in enumerate(sorted_routes):
        is_recommended = (rank_idx == 0)
        route["rank"] = rank_idx + 1
        route["is_recommended"] = is_recommended

        if is_recommended:
            route["recommendation_badge"] = "RECOMMENDED"
            route["recommendation_rationale"] = _generate_recommendation_rationale(route, sorted_routes)
        else:
            route["recommendation_badge"] = f"OPTION #{rank_idx + 1}"
            route["recommendation_rationale"] = _generate_alternative_rationale(route, sorted_routes[0])

    return sorted_routes


def _generate_recommendation_rationale(best: Dict[str, Any], all_routes: List[Dict[str, Any]]) -> str:
    """
    Generates a natural-language explanation of why this route was selected over alternatives.
    """
    b_risk = best.get("risk_summary", {})
    b_no_travel = b_risk.get("no_travel_miles", 0.0)
    b_severe = b_risk.get("severe_miles", 0.0)
    b_high = b_risk.get("high_miles", 0.0)
    b_avg = b_risk.get("average_risk_score", 1.0)
    b_dur_min = int(round(best.get("duration_seconds", 0) / 60))

    if len(all_routes) == 1:
        if b_no_travel > 0:
            return f"Caution: Only route available, but contains {b_no_travel:.1f} miles of NO TRAVEL hazard."
        if b_severe > 0:
            return f"Recommended route has {b_severe:.1f} miles of severe weather risk."
        return "Safest available route with minimal weather risk."

    # Compare against second-best route
    alt = all_routes[1]
    a_risk = alt.get("risk_summary", {})
    a_no_travel = a_risk.get("no_travel_miles", 0.0)
    a_severe = a_risk.get("severe_miles", 0.0)
    a_high = a_risk.get("high_miles", 0.0)
    a_dur_min = int(round(alt.get("duration_seconds", 0) / 60))
    time_diff_min = b_dur_min - a_dur_min

    # Case 1: Avoids No Travel miles
    if b_no_travel == 0.0 and a_no_travel > 0:
        return (
            f"Strongly Recommended: Avoids {a_no_travel:.1f} miles of impassable NO TRAVEL hazards present on {alt.get('name', 'Option 2')}."
        )

    # Case 2: Reduces Severe miles
    if b_severe < a_severe:
        diff_severe = a_severe - b_severe
        time_text = (
            f"while adding only {time_diff_min} mins"
            if time_diff_min > 0
            else f"and is {abs(time_diff_min)} mins faster"
            if time_diff_min < 0
            else "with identical driving time"
        )
        return (
            f"Recommended: Avoids {diff_severe:.1f} miles of Severe weather conditions compared to {alt.get('name', 'Option 2')} ({time_text})."
        )

    # Case 3: Reduces High miles
    if b_high < a_high:
        diff_high = a_high - b_high
        time_text = (
            f"while adding only {time_diff_min} mins"
            if time_diff_min > 0
            else f"and saves {abs(time_diff_min)} mins"
            if time_diff_min < 0
            else "with identical driving time"
        )
        return (
            f"Recommended: Reduces High-risk weather exposure by {diff_high:.1f} miles ({time_text})."
        )

    # Case 4: Lower average risk
    if b_avg < a_risk.get("average_risk_score", 1.0):
        return (
            f"Recommended: Lowest overall weather risk score ({b_avg:.2f} vs {a_risk.get('average_risk_score', 1.0):.2f}) across the corridor."
        )

    # Case 5: Faster travel time under equal risk
    if time_diff_min < 0:
        return (
            f"Recommended: Weather conditions are comparable, and this route is {abs(time_diff_min)} minutes faster."
        )

    return "Recommended: Best balanced trade-off between driving safety and travel duration."


def _generate_alternative_rationale(route: Dict[str, Any], best: Dict[str, Any]) -> str:
    """
    Explains the safety drawback of this alternative route compared to the recommended one.
    """
    r_risk = route.get("risk_summary", {})
    b_risk = best.get("risk_summary", {})

    r_no_travel = r_risk.get("no_travel_miles", 0.0)
    r_severe = r_risk.get("severe_miles", 0.0)
    b_severe = b_risk.get("severe_miles", 0.0)
    r_high = r_risk.get("high_miles", 0.0)
    b_high = b_risk.get("high_miles", 0.0)

    if r_no_travel > 0:
        return f"Warning: Contains {r_no_travel:.1f} miles of NO TRAVEL conditions. Unsafe for current load weight."
    if r_severe > b_severe:
        return f"Exposes driver to {r_severe - b_severe:.1f} additional miles of Severe weather hazards."
    if r_high > b_high:
        return f"Exposes driver to {r_high - b_high:.1f} additional miles of High weather hazards."

    r_dur = route.get("duration_seconds", 0)
    b_dur = best.get("duration_seconds", 0)
    if r_dur > b_dur:
        diff_min = int(round((r_dur - b_dur) / 60))
        return f"Similar weather risk profile, but takes {diff_min} minutes longer."

    return "Alternative route with slightly higher average risk score."
