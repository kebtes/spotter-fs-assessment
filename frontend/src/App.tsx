import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickPresets } from './components/QuickPresets';
import { InputForm } from './components/InputForm';
import { RouteList } from './components/RouteList';
import { MapView } from './components/MapView';
import { ForecastSlider } from './components/ForecastSlider';
import { CheckpointTable } from './components/CheckpointTable';
import { RiskLegend } from './components/RiskLegend';
import { analyzeRoutes, fetchPresets, RouteAnalysisPayload } from './services/api';
import { LocationPoint, PresetTrip, RouteOption, HeatmapData, Checkpoint } from './types';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Trip inputs state
  const [origin, setOrigin] = useState<LocationPoint>({
    label: 'Chicago, IL',
    latitude: 41.8781,
    longitude: -87.6298,
  });

  const [destination, setDestination] = useState<LocationPoint>({
    label: 'Denver, CO',
    latitude: 39.7392,
    longitude: -104.9903,
  });

  // Default departure time to now (local ISO string without seconds)
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  const [loadWeightLbs, setLoadWeightLbs] = useState<number>(42000);
  const [samplingIntervalMiles, setSamplingIntervalMiles] = useState<number>(25);

  // Data & Analysis state
  const [presets, setPresets] = useState<PresetTrip[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [currentHour, setCurrentHour] = useState<number>(0);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [heatmapVisible, setHeatmapVisible] = useState<boolean>(true);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);

  // Status & Error state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load presets on initial mount & execute first analysis
  useEffect(() => {
    async function init() {
      const p = await fetchPresets();
      setPresets(p);
      handleAnalyze();
    }
    init();
  }, []);

  const handleSelectPreset = (preset: PresetTrip) => {
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setLoadWeightLbs(preset.default_load_lbs);
    // Trigger analysis with new preset
    executeAnalysis(preset.origin, preset.destination, departureTime, preset.default_load_lbs, samplingIntervalMiles);
  };

  const handleAnalyze = () => {
    executeAnalysis(origin, destination, departureTime, loadWeightLbs, samplingIntervalMiles);
  };

  const executeAnalysis = async (
    orig: LocationPoint,
    dest: LocationPoint,
    depTime: string,
    weight: number,
    interval: number
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload: RouteAnalysisPayload = {
        origin: orig,
        destination: dest,
        departure_time: new Date(depTime).toISOString(),
        load_weight_lbs: weight,
        sampling_interval_miles: interval,
      };

      const res = await analyzeRoutes(payload);

      setRoutes(res.routes);
      // Automatically select the #1 recommended route
      const rec = res.routes.find((r) => r.is_recommended) || res.routes[0];
      if (rec) {
        setSelectedRouteId(rec.id);
      }
      setHeatmapData(res.heatmap);
      setCurrentHour(0);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while analyzing routes.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar Controls & Telemetry Panel */}
        <aside className="w-full lg:w-[440px] xl:w-[480px] flex-shrink-0 space-y-5">
          {/* Curated Presets */}
          <QuickPresets
            presets={presets}
            onSelect={handleSelectPreset}
            isLoading={isLoading}
          />

          {/* Core Input Form */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Trip Configuration</span>
              {isLoading && (
                <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Fetching Live Weather...
                </span>
              )}
            </h2>

            <InputForm
              origin={origin}
              destination={destination}
              departureTime={departureTime}
              loadWeightLbs={loadWeightLbs}
              samplingIntervalMiles={samplingIntervalMiles}
              isLoading={isLoading}
              onOriginChange={setOrigin}
              onDestinationChange={setDestination}
              onDepartureTimeChange={setDepartureTime}
              onLoadWeightChange={setLoadWeightLbs}
              onSamplingIntervalChange={setSamplingIntervalMiles}
              onSubmit={handleAnalyze}
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2.5 shadow-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Analysis Error</span>
                <span className="text-red-300">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Evaluated Route Cards */}
          {routes.length > 0 && (
            <RouteList
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          )}

          {/* Weather & Load Rules Legend */}
          <RiskLegend />
        </aside>

        {/* Right Main Map & Time-Series Heatmap View */}
        <section className="flex-1 flex flex-col gap-4 min-h-[550px]">
          {/* Map Container */}
          <div className="flex-1 min-h-[500px]">
            <MapView
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              currentHeatmapFrame={heatmapData?.frames[currentHour] || null}
              heatmapOpacity={heatmapOpacity}
              heatmapVisible={heatmapVisible}
              onSelectCheckpoint={setSelectedCheckpoint}
            />
          </div>

          {/* 0-48h Corridor Forecast Heatmap Scrubber */}
          {heatmapData && (
            <ForecastSlider
              heatmapData={heatmapData}
              currentHour={currentHour}
              onHourChange={setCurrentHour}
              heatmapOpacity={heatmapOpacity}
              onOpacityChange={setHeatmapOpacity}
              heatmapVisible={heatmapVisible}
              onToggleVisibility={() => setHeatmapVisible(!heatmapVisible)}
            />
          )}

          {/* Checkpoint Telemetry Table */}
          {activeRoute && (
            <CheckpointTable
              route={activeRoute}
              onSelectCheckpoint={setSelectedCheckpoint}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
