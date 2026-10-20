import React, { useState, useEffect, useRef } from 'react';
import { LocationPoint } from '../types';
import { searchLocations } from '../services/api';
import { 
  MapPin, 
  Flag, 
  Calendar, 
  Weight, 
  Ruler, 
  ArrowUpDown, 
  Search, 
  Loader2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

interface InputFormProps {
  origin: LocationPoint;
  destination: LocationPoint;
  departureTime: string;
  loadWeightLbs: number;
  samplingIntervalMiles: number;
  isLoading: boolean;
  onOriginChange: (loc: LocationPoint) => void;
  onDestinationChange: (loc: LocationPoint) => void;
  onDepartureTimeChange: (time: string) => void;
  onLoadWeightChange: (weight: number) => void;
  onSamplingIntervalChange: (interval: number) => void;
  onSubmit: () => void;
}

export const InputForm: React.FC<InputFormProps> = ({
  origin,
  destination,
  departureTime,
  loadWeightLbs,
  samplingIntervalMiles,
  isLoading,
  onOriginChange,
  onDestinationChange,
  onDepartureTimeChange,
  onLoadWeightChange,
  onSamplingIntervalChange,
  onSubmit,
}) => {
  // Autocomplete state
  const [originQuery, setOriginQuery] = useState(origin.label || '');
  const [destQuery, setDestQuery] = useState(destination.label || '');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showOriginMenu, setShowOriginMenu] = useState(false);
  const [showDestMenu, setShowDestMenu] = useState(false);

  // Sync internal search query if prop changes
  useEffect(() => {
    if (origin.label) setOriginQuery(origin.label);
  }, [origin.label]);

  useEffect(() => {
    if (destination.label) setDestQuery(destination.label);
  }, [destination.label]);

  // Debounce search origin
  useEffect(() => {
    if (!originQuery || originQuery === origin.label) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(originQuery);
      setOriginSuggestions(results);
    }, 250);
    return () => clearTimeout(timer);
  }, [originQuery, origin.label]);

  // Debounce search destination
  useEffect(() => {
    if (!destQuery || destQuery === destination.label) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchLocations(destQuery);
      setDestSuggestions(results);
    }, 250);
    return () => clearTimeout(timer);
  }, [destQuery, destination.label]);

  // Quick departure helpers
  const setQuickDeparture = (offsetHours: number, hourTarget?: number) => {
    const d = new Date();
    if (hourTarget !== undefined) {
      d.setDate(d.getDate() + (offsetHours > 0 ? 1 : 0));
      d.setHours(hourTarget, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + offsetHours);
    }
    // format as YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    onDepartureTimeChange(localISOTime);
  };

  const handleSwap = () => {
    const tempOrig = { ...origin };
    const tempDest = { ...destination };
    onOriginChange(tempDest);
    onDestinationChange(tempOrig);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 text-xs"
    >
      {/* Origin & Destination Inputs */}
      <div className="space-y-2 relative">
        {/* Origin */}
        <div className="relative">
          <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400" /> Origin
          </label>
          <div className="relative">
            <input
              type="text"
              value={originQuery}
              onChange={(e) => {
                setOriginQuery(e.target.value);
                setShowOriginMenu(true);
              }}
              onFocus={() => setShowOriginMenu(true)}
              placeholder="e.g. Chicago, IL"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          {showOriginMenu && originSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {originSuggestions.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    onOriginChange({
                      label: item.label,
                      latitude: item.latitude,
                      longitude: item.longitude,
                    });
                    setOriginQuery(item.label);
                    setShowOriginMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700/80 transition flex items-center justify-between border-b border-slate-700/50 last:border-0"
                >
                  <span className="font-medium truncate">{item.label}</span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-end -my-1 pr-2 z-10 relative">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Origin & Destination"
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination */}
        <div className="relative">
          <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-emerald-400" /> Destination
          </label>
          <div className="relative">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setShowDestMenu(true);
              }}
              onFocus={() => setShowDestMenu(true)}
              placeholder="e.g. Denver, CO"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          {showDestMenu && destSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {destSuggestions.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    onDestinationChange({
                      label: item.label,
                      latitude: item.latitude,
                      longitude: item.longitude,
                    });
                    setDestQuery(item.label);
                    setShowDestMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-700/80 transition flex items-center justify-between border-b border-slate-700/50 last:border-0"
                >
                  <span className="font-medium truncate">{item.label}</span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Departure Date/Time */}
      <div>
        <label className="block text-slate-400 font-medium mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Departure Date & Time
          </span>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setQuickDeparture(0)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setQuickDeparture(2)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              +2 hrs
            </button>
            <button
              type="button"
              onClick={() => setQuickDeparture(1, 6)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Tmrw 6am
            </button>
          </div>
        </label>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => onDepartureTimeChange(e.target.value)}
          className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        />
      </div>

      {/* Load Weight */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-slate-400 font-medium flex items-center gap-1.5">
            <Weight className="w-3.5 h-3.5 text-amber-400" /> Load Weight (lbs)
          </label>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {loadWeightLbs.toLocaleString()} lbs
          </span>
        </div>

        {/* Weight presets */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[
            { label: '15k Empty', val: 15000 },
            { label: '32k Med', val: 32000 },
            { label: '42k Heavy', val: 42000 },
            { label: '78k Max', val: 78000 },
          ].map((preset) => (
            <button
              type="button"
              key={preset.val}
              onClick={() => onLoadWeightChange(preset.val)}
              className={`py-1 px-1 rounded text-center transition font-medium text-[10px] ${
                loadWeightLbs === preset.val
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={5000}
          max={80000}
          step={1000}
          value={loadWeightLbs}
          onChange={(e) => onLoadWeightChange(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>5,000 lbs</span>
          <span className="text-amber-400">&gt;30k (Severe Wind Esc.)</span>
          <span className="text-rose-400">&gt;40k (High Wind Esc.)</span>
          <span>80,000 lbs</span>
        </div>
      </div>

      {/* Sampling Interval */}
      <div>
        <label className="block text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-indigo-400" /> Weather Sampling Interval
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[10, 25, 50].map((interval) => (
            <button
              type="button"
              key={interval}
              onClick={() => onSamplingIntervalChange(interval)}
              className={`py-1.5 rounded-lg border text-center transition font-medium ${
                samplingIntervalMiles === interval
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Every {interval} mi
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing Corridors & Weather...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Calculate 3 Safe Routes
          </>
        )}
      </button>
    </form>
  );
};
