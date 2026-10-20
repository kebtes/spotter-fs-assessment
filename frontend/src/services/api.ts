import { AnalysisResponse, LocationPoint, PresetTrip } from '../types';

const API_BASE = '/api';

export interface RouteAnalysisPayload {
  origin: LocationPoint;
  destination: LocationPoint;
  departure_time: string;
  load_weight_lbs: number;
  sampling_interval_miles: number;
}

export async function fetchPresets(): Promise<PresetTrip[]> {
  try {
    const res = await fetch(`${API_BASE}/presets/`);
    if (!res.ok) {
      throw new Error(`Failed to fetch presets: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error loading presets:', err);
    return [];
  }
}

export async function searchLocations(query: string): Promise<Array<{ label: string; latitude: number; longitude: number }>> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`${API_BASE}/geocoding/search/?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) {
      throw new Error(`Geocoding error: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Geocoding search failed:', err);
    return [];
  }
}

export async function analyzeRoutes(payload: RouteAnalysisPayload): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/routes/analyze/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || `Server responded with ${res.status}`);
  }

  return await res.json();
}
