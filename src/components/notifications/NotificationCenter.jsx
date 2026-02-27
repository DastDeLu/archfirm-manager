import React, { useState } from 'react';
import { Bell, AlertCircle, Calendar, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useKpiData } from '../hooks/useKpiData';
import { KPI_CATEGORIES } from '../lib/kpiDashboard';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { kpis } = useKpiData();

  // Fetch scadenze - sincronizzato con objectives principal
   const { data: objectives = [] } = useQuery({
     queryKey: ['objectives-notifications'],
     queryFn: () => base44.entities.Objective.list(),
     refetchInterval: 10000,
   });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments-notifications'],
    queryFn: () => base44.entities.Installment.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Notification.filter({ 
        recipient_email: user.email,
        is_read: false 
      });
    },
  });

  const today = new Date();
  const next7Days = addDays(today, 7);

  // KPI Critici (rossi)
  const criticalKpis = Object.values(kpis).filter(kpi => kpi.status === 'critical');

  // Obiettivi in scadenza (prossimi 7 giorni) e attivi
  const upcomingObjectives = objectives.filter(obj => {
    if (obj.status !== 'active' || !obj.deadline) return false;
    const deadline = new Date(obj.deadline);
    return isAfter(deadline, today) && isBefore(deadline, next7Days);
  });

  // Installments in scadenza o scaduti
  const overdueInstallments = installments.filter(i => {
    if (i.status !== 'pending' || !i.due_date) return false;
    const dueDate = new Date(i.due_date);
    return isBefore(dueDate, today) || isBefore(dueDate, next7Days);
  });

  const totalNotifications = criticalKpis.length + upcomingObjectives.length + overdueInstallments.length + notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-slate-100 rounded-lg"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          {totalNotifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Notifiche</h3>
          <p className="text-xs text-slate-500 mt-1">
            {totalNotifications} {totalNotifications === 1 ? 'notifica' : 'notifiche'}
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {totalNotifications === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nessuna notifica</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Notifiche da Automazioni */}
              {notifications.map(notif => (
                <div key={notif.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      notif.type === 'error' && 'bg-red-100',
                      notif.type === 'warning' && 'bg-amber-100',
                      notif.type === 'success' && 'bg-green-100',
                      notif.type === 'info' && 'bg-blue-100'
                    )}>
                      <AlertCircle className={cn(
                        'h-4 w-4',
                        notif.type === 'error' && 'text-red-600',
                        notif.type === 'warning' && 'text-amber-600',
                        notif.type === 'success' && 'text-green-600',
                        notif.type === 'info' && 'text-blue-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                      {notif.category && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {notif.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* KPI Critici */}
              {criticalKpis.map(kpi => (
                <div key={kpi.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{kpi.icon}</span>
                        <p className="font-medium text-sm text-slate-900">
                          {KPI_CATEGORIES[kpi.id]}
                        </p>
                      </div>
                      <p className="text-xs text-red-600 font-medium">
                        {kpi.formattedValue} - Critico
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{kpi.target}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Obiettivi in scadenza */}
              {upcomingObjectives.map(obj => (
                <div key={obj.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{obj.name}</p>
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        Scadenza: {format(new Date(obj.deadline), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Installments in scadenza */}
              {overdueInstallments.map(inst => {
                const isOverdue = isBefore(new Date(inst.due_date), today);
                return (
                  <div key={inst.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        isOverdue ? 'bg-red-100' : 'bg-amber-100'
                      )}>
                        <Calendar className={cn(
                          'h-4 w-4',
                          isOverdue ? 'text-red-600' : 'text-amber-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900">
                          Rata {isOverdue ? 'scaduta' : 'in scadenza'}
                        </p>
                        <p className={cn(
                          'text-xs font-medium mt-1',
                          isOverdue ? 'text-red-600' : 'text-amber-600'
                        )}>
                          €{inst.amount?.toLocaleString('it-IT')} - {format(new Date(inst.due_date), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}