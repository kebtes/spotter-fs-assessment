import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { RouteOption, Checkpoint, HeatmapFrame } from '../types';
import { ROUTE_LINE_COLORS, RISK_COLOR_MAP } from '../utils/colors';
import { formatDateTime } from '../utils/formatters';
import { Layers, Maximize2, Wind, CloudRain, Snowflake, AlertTriangle, ShieldAlert } from 'lucide-react';

interface MapViewProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  currentHeatmapFrame: HeatmapFrame | null;
  heatmapOpacity: number;
  heatmapVisible: boolean;
  onSelectCheckpoint?: (checkpoint: Checkpoint) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  currentHeatmapFrame,
  heatmapOpacity,
  heatmapVisible,
  onSelectCheckpoint,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basemapStyle, setBasemapStyle] = useState<'dark' | 'osm'>('dark');
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);
  const checkpointMarkers = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'esri-dark': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '&copy; Esri, DeLorme, NAVTEQ',
            maxzoom: 16,
          },
          'esri-reference': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 16,
          },
          'osm': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'esri-dark-base',
            type: 'raster',
            source: 'esri-dark',
            minzoom: 0,
            maxzoom: 16,
            layout: { visibility: 'visible' },
          },
          {
            id: 'osm-base',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'none' },
          },
        ],
      },
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
    });

    instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    instance.on('load', () => {
      // 1. Add Heatmap Source & Layer
      instance.addSource('corridor-weather-heat', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      instance.addLayer({
        id: 'corridor-weather-heat-layer',
        type: 'heatmap',
        source: 'corridor-weather-heat',
        maxzoom: 13,
        paint: {
          // Heatmap weight based on intensity (0.15 to 1.0)
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.2, 1, 1.2],
          // Heatmap intensity as a function of zoom
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.2, 5, 2.5, 9, 3.8],
          // Color ramp: Soft Blue (Calm) -> Emerald Green -> Warm Amber -> Orange -> Red -> Dark Red
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.02, 'rgba(56, 189, 248, 0.45)', // sky blue for light weather
            0.20, 'rgba(34, 197, 94, 0.70)',  // green for moderate weather
            0.45, 'rgba(234, 179, 8, 0.85)',  // amber / yellow
            0.70, 'rgba(249, 115, 22, 0.90)', // orange for high
            0.88, 'rgba(239, 68, 68, 0.95)',  // red for severe
            1.00, 'rgba(185, 28, 28, 1.00)'   // dark crimson for no travel
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 30, 4, 60, 7, 95, 12, 130],
          'heatmap-opacity': heatmapOpacity,
        },
      });

      // Weather Radar Station Beacons (gives immediate, crisp visual feedback as time changes)
      instance.addLayer({
        id: 'corridor-weather-points-layer',
        type: 'circle',
        source: 'corridor-weather-heat',
        maxzoom: 14,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.5, 4, 4.5, 7, 7.5],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'wind_mph'],
            0, '#38bdf8',
            15, '#22c55e',
            25, '#eab308',
            35, '#f97316',
            45, '#ef4444'
          ],
          'circle-opacity': heatmapVisible ? heatmapOpacity * 0.85 : 0,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.5,
        },
      });

      // 2. Add Sources for Routes
      for (let i = 0; i < 3; i++) {
        instance.addSource(`route-source-${i}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [] },
            properties: {},
          },
        });

        // Route line casing (glow / contrast)
        instance.addLayer({
          id: `route-casing-${i}`,
          type: 'line',
          source: `route-source-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0f172a',
            'line-width': 8,
            'line-opacity': 0.8,
          },
        });

        // Route line foreground
        instance.addLayer({
          id: `route-line-${i}`,
          type: 'line',
          source: `route-source-${i}`,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ROUTE_LINE_COLORS[i],
            'line-width': 4.5,
            'line-opacity': 0.85,
          },
        });

        // Click on route line to select
        instance.on('click', `route-line-${i}`, () => {
          if (routes[i]) {
            onSelectRoute(routes[i].id);
          }
        });

        instance.on('mouseenter', `route-line-${i}`, () => {
          instance.getCanvas().style.cursor = 'pointer';
        });
        instance.on('mouseleave', `route-line-${i}`, () => {
          instance.getCanvas().style.cursor = '';
        });
      }

      instance.addLayer({
        id: 'esri-reference-layer',
        type: 'raster',
        source: 'esri-reference',
        minzoom: 0,
        maxzoom: 16,
        layout: { visibility: 'visible' },
      });

      setMapLoaded(true);
    });

    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  // Toggle basemap between Dark (Esri) and OpenStreetMap
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const isDark = basemapStyle === 'dark';
    if (map.current.getLayer('esri-dark-base')) {
      map.current.setLayoutProperty('esri-dark-base', 'visibility', isDark ? 'visible' : 'none');
    }
    if (map.current.getLayer('esri-reference-layer')) {
      map.current.setLayoutProperty('esri-reference-layer', 'visibility', isDark ? 'visible' : 'none');
    }
    if (map.current.getLayer('osm-base')) {
      map.current.setLayoutProperty('osm-base', 'visibility', isDark ? 'none' : 'visible');
    }
  }, [basemapStyle, mapLoaded]);

  // Update Heatmap Opacity and Visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const heatLayer = map.current.getLayer('corridor-weather-heat-layer');
    if (heatLayer) {
      map.current.setLayoutProperty(
        'corridor-weather-heat-layer',
        'visibility',
        heatmapVisible ? 'visible' : 'none'
      );
      map.current.setPaintProperty(
        'corridor-weather-heat-layer',
        'heatmap-opacity',
        heatmapOpacity
      );
    }

    const pointsLayer = map.current.getLayer('corridor-weather-points-layer');
    if (pointsLayer) {
      map.current.setLayoutProperty(
        'corridor-weather-points-layer',
        'visibility',
        heatmapVisible ? 'visible' : 'none'
      );
      map.current.setPaintProperty(
        'corridor-weather-points-layer',
        'circle-opacity',
        heatmapVisible ? heatmapOpacity * 0.85 : 0
      );
    }
  }, [heatmapOpacity, heatmapVisible, mapLoaded]);

  // Update Heatmap Data frame-by-frame (60 FPS WebGL setData)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('corridor-weather-heat') as maplibregl.GeoJSONSource;
    if (source && currentHeatmapFrame) {
      source.setData(currentHeatmapFrame.geojson as any);
    }
  }, [currentHeatmapFrame, mapLoaded]);

  // Update Route Polylines and Fit Bounds
  useEffect(() => {
    if (!map.current || !mapLoaded || !routes || routes.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    routes.forEach((route, i) => {
      if (i >= 3) return;
      const source = map.current?.getSource(`route-source-${i}`) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: route.geometry,
          properties: {},
        });
      }

      // Adjust styles for active route vs background routes
      const isSelected = route.id === selectedRouteId;
      if (map.current?.getLayer(`route-line-${i}`)) {
        map.current.setPaintProperty(
          `route-line-${i}`,
          'line-width',
          isSelected ? 6 : 3
        );
        map.current.setPaintProperty(
          `route-line-${i}`,
          'line-opacity',
          isSelected ? 1.0 : 0.45
        );
        map.current.setPaintProperty(
          `route-casing-${i}`,
          'line-width',
          isSelected ? 10 : 5
        );
      }

      // Extend bounds
      route.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord as [number, number]);
      });
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 13,
        duration: 1000,
      });
    }

    // Origin and Destination Markers
    const firstRoute = routes[0];
    if (firstRoute && firstRoute.geometry.coordinates.length > 0) {
      const startCoord = firstRoute.geometry.coordinates[0];
      const endCoord = firstRoute.geometry.coordinates[firstRoute.geometry.coordinates.length - 1];

      // Origin Marker
      if (!originMarker.current) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs';
        el.innerHTML = 'A';
        originMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat(startCoord)
          .addTo(map.current);
      } else {
        originMarker.current.setLngLat(startCoord);
      }

      // Destination Marker
      if (!destMarker.current) {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs';
        el.innerHTML = 'B';
        destMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat(endCoord)
          .addTo(map.current);
      } else {
        destMarker.current.setLngLat(endCoord);
      }
    }
  }, [routes, selectedRouteId, mapLoaded]);

  // Update Checkpoint Markers along the Selected Route
  useEffect(() => {
    if (!map.current || !mapLoaded || !routes) return;

    // Clear existing checkpoint markers
    checkpointMarkers.current.forEach((m) => m.remove());
    checkpointMarkers.current = [];

    const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!activeRoute) return;

    activeRoute.checkpoints.forEach((cp, idx) => {
      // Create custom DOM element for checkpoint marker
      const el = document.createElement('div');
      const riskColor = cp.risk.color;
      const isSevereOrNoTravel = cp.risk.overall_score >= 4;

      el.className = `cursor-pointer transition-transform duration-200 hover:scale-125 rounded-full flex items-center justify-center shadow-md ${
        isSevereOrNoTravel ? 'animate-pulse' : ''
      }`;
      el.style.width = isSevereOrNoTravel ? '16px' : '12px';
      el.style.height = isSevereOrNoTravel ? '16px' : '12px';
      el.style.backgroundColor = riskColor;
      el.style.border = '2px solid #ffffff';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cp.longitude, cp.latitude])
        .addTo(map.current!);

      // Click checkpoint to trigger rich popup
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popupRef.current) popupRef.current.remove();

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; color: #f8fafc; background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 13px;">Mile ${cp.distance_from_origin_miles.toFixed(1)}</span>
              <span style="background: ${cp.risk.color}33; color: ${cp.risk.color}; border: 1px solid ${cp.risk.color}66; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">
                ${cp.risk.overall_level}
              </span>
            </div>

            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 8px;">
              ETA: <strong style="color: #ffffff;">${formatDateTime(cp.eta_iso)}</strong>
            </div>

            <div style="background: #1e293b; padding: 8px; border-radius: 6px; margin-bottom: 8px; font-size: 11px;">
              <div>💨 Wind: <strong style="color: #ffffff;">${cp.weather.wind_speed_mph} mph</strong> (Gusts: ${cp.weather.wind_gusts_mph} mph)</div>
              <div>🌧️ Rain: <strong style="color: #ffffff;">${cp.weather.rain_in_per_hr} in/hr</strong></div>
              <div>❄️ Snow: <strong style="color: #ffffff;">${cp.weather.snow_in_per_hr} in/hr</strong></div>
            </div>

            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.3;">
              ${cp.risk.summary_reason}
            </div>
          </div>
        `;

        popupRef.current = new maplibregl.Popup({ offset: 12, className: 'custom-map-popup' })
          .setLngLat([cp.longitude, cp.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);

        if (onSelectCheckpoint) onSelectCheckpoint(cp);
      });

      checkpointMarkers.current.push(marker);
    });
  }, [routes, selectedRouteId, mapLoaded]);

  const fitBounds = () => {
    if (!map.current || !routes || routes.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    routes.forEach((r) => {
      r.geometry.coordinates.forEach((c) => bounds.extend(c as [number, number]));
    });
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        duration: 800,
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[450px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Overlay Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={fitBounds}
          title="Fit All Routes"
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white shadow-lg backdrop-blur transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Fit Corridor</span>
        </button>
        <button
          onClick={() => setBasemapStyle(basemapStyle === 'dark' ? 'osm' : 'dark')}
          title="Switch Basemap Style"
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white shadow-lg backdrop-blur transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{basemapStyle === 'dark' ? 'Dark Map' : 'OpenStreetMap'}</span>
        </button>
      </div>

      {/* Live Active Route Badge on Map */}
      {routes && routes.length > 0 && (
        <div className="absolute top-4 right-16 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs shadow-lg backdrop-blur">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor:
                ROUTE_LINE_COLORS[routes.findIndex((r) => r.id === selectedRouteId) % ROUTE_LINE_COLORS.length] || '#3b82f6',
            }}
          />
          <span className="font-semibold text-white">
            {routes.find((r) => r.id === selectedRouteId)?.name || 'Selected Route'}
          </span>
        </div>
      )}
    </div>
  );
};
