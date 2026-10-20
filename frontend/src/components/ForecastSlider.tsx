import React, { useState, useEffect } from 'react';
import { HeatmapData, HeatmapFrame } from '../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CloudLightning, 
  Eye, 
  EyeOff, 
  Sliders, 
  Clock 
} from 'lucide-react';

interface ForecastSliderProps {
  heatmapData: HeatmapData | null;
  currentHour: number;
  onHourChange: (hour: number) => void;
  heatmapOpacity: number;
  onOpacityChange: (opacity: number) => void;
  heatmapVisible: boolean;
  onToggleVisibility: () => void;
}

export const ForecastSlider: React.FC<ForecastSliderProps> = ({
  heatmapData,
  currentHour,
  onHourChange,
  heatmapOpacity,
  onOpacityChange,
  heatmapVisible,
  onToggleVisibility,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const maxHours = heatmapData?.max_hours || 48;
  const currentFrame: HeatmapFrame | undefined = heatmapData?.frames[currentHour];

  // Auto-play animation loop (advances 1 hour every 250ms)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onHourChange(currentHour >= maxHours ? 0 : currentHour + 1);
    }, 280);

    return () => clearInterval(interval);
  }, [isPlaying, maxHours, currentHour, onHourChange]);

  if (!heatmapData || heatmapData.frames.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur space-y-3">
      {/* Header with Title & Live Time Display */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <CloudLightning className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                0–48 Hour Corridor Forecast Heatmap
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                +{currentHour}h
              </span>
              {isPlaying && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  ANIMATING
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {currentFrame?.formatted_time || 'Select hour'}
            </p>
          </div>
        </div>

        {/* Live Weather Metrics for Current Hour */}
        {currentFrame && (
          <div className="flex items-center gap-2.5 text-[11px] font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 hidden md:inline">Corridor:</span>
            <span className={`font-bold ${currentFrame.max_wind_mph && currentFrame.max_wind_mph >= 35 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
              💨 {currentFrame.max_wind_mph ?? 12} mph
            </span>
            <span className="text-cyan-300">
              🌧️ {currentFrame.max_rain_in ?? 0} in/hr
            </span>
            <span className="text-indigo-300">
              ❄️ {currentFrame.max_snow_in ?? 0} in/hr
            </span>
          </div>
        )}

        {/* Heatmap Visibility & Opacity Toggle */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={onToggleVisibility}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition font-medium text-[11px] ${
              heatmapVisible
                ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {heatmapVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Heatmap {heatmapVisible ? 'ON' : 'OFF'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Opacity:</span>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={heatmapOpacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-16 h-1 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Scrubber Controls */}
      <div className="flex items-center gap-3">
        {/* Play / Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause animation' : 'Play 48h timeline'}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition shadow-md ${
            isPlaying
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Reset Button */}
        <button
          onClick={() => {
            setIsPlaying(false);
            onHourChange(0);
          }}
          title="Reset to Departure Time (0h)"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Range Slider */}
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={maxHours}
            step={1}
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              onHourChange(parseInt(e.target.value, 10));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          {/* Hour markers */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
            {[0, 6, 12, 18, 24, 30, 36, 42, 48].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onHourChange(h);
                }}
                className={`hover:text-indigo-400 transition ${
                  currentHour === h ? 'text-indigo-400 font-bold' : ''
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
