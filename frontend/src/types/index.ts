export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'NO_TRAVEL';

export interface LocationPoint {
  label?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherCondition {
  wind_speed_mph: number;
  wind_gusts_mph: number;
  rain_in_per_hr: number;
  snow_in_per_hr: number;
  temperature_c: number;
  weather_code: number;
  matched_forecast_time: string;
}

export interface FactorEvaluation {
  level: RiskLevel;
  score: number;
  reason: string;
  active_load_rule?: boolean;
}

export interface CheckpointRisk {
  overall_level: RiskLevel;
  overall_score: number;
  color: string;
  summary_reason: string;
  wind: FactorEvaluation & { value_mph: number };
  rain: FactorEvaluation & { value_in_per_hr: number };
  snow: FactorEvaluation & { value_in_per_hr: number };
}

export interface Checkpoint {
  index: number;
  latitude: number;
  longitude: number;
  distance_from_origin_miles: number;
  eta_iso: string;
  eta_unix: number;
  elapsed_seconds: number;
  weather: WeatherCondition;
  risk: CheckpointRisk;
}

export interface RiskDistribution {
  low: number;
  moderate: number;
  high: number;
  severe: number;
  no_travel: number;
}

export interface RouteRiskSummary {
  total_miles: number;
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  average_risk_score: number;
  worst_risk_level: RiskLevel;
  worst_risk_score: number;
  worst_risk_color: string;
  distribution_pct: RiskDistribution;
}

export interface RouteOption {
  id: string;
  name: string;
  rank: number;
  is_recommended: boolean;
  recommendation_badge: string;
  recommendation_rationale: string;
  distance_miles: number;
  duration_seconds: number;
  formatted_duration: string;
  eta_destination: string;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lon, lat]
  };
  risk_summary: RouteRiskSummary;
  checkpoints: Checkpoint[];
}

export interface HeatmapPointProperties {
  intensity: number;
  risk_score: number;
  risk_level: RiskLevel;
  wind_mph: number;
  rain_in: number;
  snow_in: number;
}

export interface HeatmapPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: HeatmapPointProperties;
}

export interface HeatmapFrame {
  hour: number;
  timestamp_iso: string;
  formatted_time: string;
  max_wind_mph?: number;
  max_rain_in?: number;
  max_snow_in?: number;
  worst_risk_score?: number;
  geojson: {
    type: 'FeatureCollection';
    features: HeatmapPointFeature[];
  };
}

export interface HeatmapData {
  max_hours: number;
  hours: number[];
  frames: HeatmapFrame[];
}

export interface AnalysisResponse {
  status: string;
  metadata: {
    origin: LocationPoint;
    destination: LocationPoint;
    departure_time: string;
    load_weight_lbs: number;
    sampling_interval_miles: number;
    calculated_at: string;
  };
  routes: RouteOption[];
  heatmap: HeatmapData;
}

export interface PresetTrip {
  id: string;
  title: string;
  description: string;
  origin: LocationPoint;
  destination: LocationPoint;
  default_load_lbs: number;
}
