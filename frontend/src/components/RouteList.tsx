import React from 'react';
import { RouteOption } from '../types';
import { RouteCard } from './RouteCard';
import { ROUTE_LINE_COLORS } from '../utils/colors';
import { ShieldCheck, Layers } from 'lucide-react';

interface RouteListProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          Evaluated Route Options ({routes.length})
        </h2>
        <span className="text-[11px] text-slate-400">
          Ranked by safety preference
        </span>
      </div>

      <div className="space-y-3">
        {routes.map((route, idx) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={route.id === selectedRouteId}
            onSelect={() => onSelectRoute(route.id)}
            accentColor={ROUTE_LINE_COLORS[idx % ROUTE_LINE_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
};
