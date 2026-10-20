import React from 'react';
import { RouteOption } from '../types';
import { RISK_COLOR_MAP } from '../utils/colors';
import { formatDateTime } from '../utils/formatters';
import { 
  CheckCircle2, 
  Clock, 
  Navigation, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Gauge 
} from 'lucide-react';

interface RouteCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isSelected,
  onSelect,
  accentColor,
}) => {
  const { risk_summary } = route;
  const dist = risk_summary.distribution_pct;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl cursor-pointer transition-all border ${
        isSelected
          ? 'bg-slate-800/95 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Header with Title & Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            {route.name}
          </h3>
        </div>

        {route.is_recommended ? (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            RECOMMENDED
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {route.recommendation_badge}
          </span>
        )}
      </div>

      {/* Rationale explanation banner */}
      <div
        className={`p-2.5 rounded-lg text-xs mb-3 border ${
          route.is_recommended
            ? 'bg-blue-950/40 text-blue-200 border-blue-800/50'
            : risk_summary.no_travel_miles > 0
            ? 'bg-red-950/40 text-red-300 border-red-800/50'
            : 'bg-slate-800/50 text-slate-300 border-slate-700/50'
        }`}
      >
        <p className="line-clamp-2 leading-relaxed">{route.recommendation_rationale}</p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Travel Time
          </span>
          <span className="font-bold text-white text-xs">
            {route.formatted_duration}
          </span>
        </div>

        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
            <Navigation className="w-3 h-3 text-slate-400" /> Distance
          </span>
          <span className="font-bold text-white text-xs">
            {route.distance_miles.toLocaleString()} mi
          </span>
        </div>

        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/40">
          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3 text-slate-400" /> Avg Risk
          </span>
          <span className={`font-bold text-xs ${
            risk_summary.average_risk_score < 1.8
              ? 'text-emerald-400'
              : risk_summary.average_risk_score < 2.8
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}>
            {risk_summary.average_risk_score.toFixed(2)} / 5
          </span>
        </div>
      </div>

      {/* Hazard Mileage Highlights */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 font-semibold ${
            risk_summary.severe_miles > 0 ? 'text-rose-400' : 'text-slate-400'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            {risk_summary.severe_miles} mi Severe
          </span>
          <span className={`font-medium ${
            risk_summary.high_miles > 0 ? 'text-orange-400' : 'text-slate-500'
          }`}>
            {risk_summary.high_miles} mi High
          </span>
        </div>

        {risk_summary.no_travel_miles > 0 && (
          <span className="font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/80 animate-pulse text-[10px]">
            {risk_summary.no_travel_miles} mi NO TRAVEL
          </span>
        )}
      </div>

      {/* Stacked Risk Distribution Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
          {dist.low > 0 && (
            <div
              style={{ width: `${dist.low}%` }}
              className="bg-emerald-500 h-full"
              title={`Low: ${dist.low}% (${risk_summary.low_miles} mi)`}
            />
          )}
          {dist.moderate > 0 && (
            <div
              style={{ width: `${dist.moderate}%` }}
              className="bg-amber-500 h-full"
              title={`Moderate: ${dist.moderate}% (${risk_summary.moderate_miles} mi)`}
            />
          )}
          {dist.high > 0 && (
            <div
              style={{ width: `${dist.high}%` }}
              className="bg-orange-500 h-full"
              title={`High: ${dist.high}% (${risk_summary.high_miles} mi)`}
            />
          )}
          {dist.severe > 0 && (
            <div
              style={{ width: `${dist.severe}%` }}
              className="bg-rose-500 h-full"
              title={`Severe: ${dist.severe}% (${risk_summary.severe_miles} mi)`}
            />
          )}
          {dist.no_travel > 0 && (
            <div
              style={{ width: `${dist.no_travel}%` }}
              className="bg-red-900 h-full"
              title={`No Travel: ${dist.no_travel}% (${risk_summary.no_travel_miles} mi)`}
            />
          )}
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>ETA Dest: {formatDateTime(route.eta_destination)}</span>
          <span>{route.checkpoints.length} Checkpoints</span>
        </div>
      </div>
    </div>
  );
};
