import React from 'react';
import { PresetTrip } from '../types';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';

interface QuickPresetsProps {
  presets: PresetTrip[];
  onSelect: (preset: PresetTrip) => void;
  isLoading: boolean;
}

export const QuickPresets: React.FC<QuickPresetsProps> = ({ presets, onSelect, isLoading }) => {
  if (!presets || presets.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Curated Trucking Corridors</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            disabled={isLoading}
            onClick={() => onSelect(preset)}
            className="text-left p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700/60 hover:border-blue-500/50 transition group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium text-xs text-white group-hover:text-blue-400 transition truncate">
                {preset.title}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
              {preset.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
