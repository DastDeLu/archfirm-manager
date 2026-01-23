import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend, 
  trendValue,
  className,
  iconClassName,
  valueClassName
}) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn("text-2xl font-bold text-slate-900", valueClassName)}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend === 'up' ? "text-emerald-600" : "text-red-500"
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-3 rounded-xl",
            iconClassName || "bg-slate-100"
          )}>
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        )}
      </div>
    </div>
  );
}