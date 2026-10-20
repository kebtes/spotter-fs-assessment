import React from 'react';
import { Truck, CloudLightning, ShieldCheck, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              TruckSafe <span className="text-blue-400 font-semibold text-sm">RouteIQ</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Weather Engine
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Intelligent heavy-duty routing balancing weather hazards, rollover aerodynamics, and travel time
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Django REST + Open-Meteo</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <CloudLightning className="w-3.5 h-3.5 text-cyan-400" />
          <span>48h Corridor Radar</span>
        </div>
      </div>
    </header>
  );
};
