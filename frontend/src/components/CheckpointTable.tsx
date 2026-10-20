import React, { useState } from 'react';
import { RouteOption, Checkpoint } from '../types';
import { formatDateTime } from '../utils/formatters';
import { ChevronDown, ChevronUp, Table, Wind, CloudRain, Snowflake, AlertCircle, ShieldAlert } from 'lucide-react';

interface CheckpointTableProps {
  route: RouteOption;
  onSelectCheckpoint?: (checkpoint: Checkpoint) => void;
}

export const CheckpointTable: React.FC<CheckpointTableProps> = ({ route, onSelectCheckpoint }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!route || !route.checkpoints || route.checkpoints.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-750 rounded-xl overflow-hidden shadow-lg text-xs">
      {/* Header Accordion Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:text-white transition bg-slate-800/40 hover:bg-slate-800/70"
      >
        <span className="flex items-center gap-2 font-bold text-slate-200">
          <Table className="w-4 h-4 text-blue-400" />
          Checkpoint Telemetry Log ({route.checkpoints.length} Checkpoints along {route.name})
        </span>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>{isExpanded ? 'Hide table' : 'View all checkpoints'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Table Body */}
      {isExpanded && (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 text-[11px] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Mile</th>
                <th className="py-2.5 px-3">ETA</th>
                <th className="py-2.5 px-3">Wind (mph)</th>
                <th className="py-2.5 px-3">Rain (in/hr)</th>
                <th className="py-2.5 px-3">Snow (in/hr)</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Driver Advisory / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {route.checkpoints.map((cp) => (
                <tr
                  key={cp.index}
                  onClick={() => onSelectCheckpoint && onSelectCheckpoint(cp)}
                  className="hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <td className="py-2 px-3 font-bold text-white">
                    {cp.distance_from_origin_miles.toFixed(1)} mi
                  </td>
                  <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                    {formatDateTime(cp.eta_iso)}
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    <span className="font-semibold">{cp.weather.wind_speed_mph}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({cp.weather.wind_gusts_mph}g)</span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {cp.weather.rain_in_per_hr.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {cp.weather.snow_in_per_hr.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      style={{
                        backgroundColor: `${cp.risk.color}25`,
                        color: cp.risk.color,
                        borderColor: `${cp.risk.color}50`,
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    >
                      {cp.risk.overall_level}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-sans text-xs max-w-xs truncate" title={cp.risk.summary_reason}>
                    {cp.risk.wind.active_load_rule && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold mr-1.5">
                        <ShieldAlert className="w-3 h-3" /> Load Rule:
                      </span>
                    )}
                    {cp.risk.summary_reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
