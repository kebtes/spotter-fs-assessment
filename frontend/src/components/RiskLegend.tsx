import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, AlertTriangle, Wind, CloudRain, Snowflake, ShieldAlert } from 'lucide-react';

export const RiskLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg backdrop-blur text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-slate-300 hover:text-white transition hover:bg-slate-800/50"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Info className="w-4 h-4 text-blue-400" />
          Weather & Weight Risk Classification Thresholds
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800 space-y-4">
          {/* Threshold Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2">Hazard</th>
                  <th className="pb-2 text-emerald-400">Low</th>
                  <th className="pb-2 text-amber-400">Moderate</th>
                  <th className="pb-2 text-orange-400">High</th>
                  <th className="pb-2 text-rose-400">Severe</th>
                  <th className="pb-2 text-red-500 font-bold">No Travel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                <tr>
                  <td className="py-2 font-medium flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-blue-400" /> Wind
                  </td>
                  <td className="py-2 text-emerald-400">&lt; 25 mph</td>
                  <td className="py-2 text-amber-400">25–34 mph</td>
                  <td className="py-2 text-orange-400">35–44 mph</td>
                  <td className="py-2 text-rose-400">45–54 mph</td>
                  <td className="py-2 text-red-400 font-bold">&ge; 55 mph</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rain
                  </td>
                  <td className="py-2 text-emerald-400">&lt; 0.10 in/hr</td>
                  <td className="py-2 text-amber-400">0.10–0.25 in/hr</td>
                  <td className="py-2 text-orange-400">0.25–0.50 in/hr</td>
                  <td className="py-2 text-rose-400">0.50–1.00 in/hr</td>
                  <td className="py-2 text-red-400 font-bold">&gt; 1.00 in/hr</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-indigo-300" /> Snow
                  </td>
                  <td className="py-2 text-emerald-400">&lt; 0.5 in/hr</td>
                  <td className="py-2 text-amber-400">0.5–1.0 in/hr</td>
                  <td className="py-2 text-orange-400">1.0–2.0 in/hr</td>
                  <td className="py-2 text-rose-400">2.0–3.0 in/hr</td>
                  <td className="py-2 text-red-400 font-bold">&gt; 3.0 in/hr</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Load Escalation Rules */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Truck Weight Escalation Rules
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li>
                <span className="font-semibold text-rose-400">&ge; 55 mph wind:</span> <span className="text-red-400 font-bold">No Travel</span> for any load weight.
              </li>
              <li>
                <span className="font-semibold text-orange-400">45–54 mph wind + &gt; 30,000 lbs:</span> Escalated from Severe to <span className="text-red-400 font-bold">No Travel</span> (high rollover risk).
              </li>
              <li>
                <span className="font-semibold text-amber-400">35–44 mph wind + &gt; 40,000 lbs:</span> Escalated from High to <span className="text-rose-400 font-bold">Severe</span> (momentum handling hazard).
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
