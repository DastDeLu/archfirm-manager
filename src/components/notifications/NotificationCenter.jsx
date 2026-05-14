import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Calendar, TrendingDown, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useKpiData } from '../hooks/useKpiData';
import { KPI_CATEGORIES } from '../lib/kpiDashboard';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrency } from '../lib/formatters';
import { createPageUrl } from '../../utils';

// Abbreviazioni categorie fee per notifiche
const FEE_CATEGORY_ABBREV = {
  'Progettazione': 'PG',
  'Direzione Lavori': 'DL',
  'Provvigioni': 'PV',
  'Pratiche Burocratiche': 'PB',
};

const getFeeCategoryAbbreviation = (category) =>
  FEE_CATEGORY_ABBREV[category] || (category || '').substring(0, 2).toUpperCase();

const DISMISSED_STORAGE_KEY = 'notification-dismissed-ids';

const loadDismissed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { kpis } = useKpiData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState(loadDismissed);

  const dismissLocal = (id) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  };

  const dismissDbNotification = async (id, e) => {
    e?.stopPropagation();
    await base44.entities.Notification.update(id, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
  };

  useEffect(() => {
    // cleanup: nothing for now
  }, []);

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

  const { data: fees = [] } = useQuery({
    queryKey: ['fees-notifications'],
    queryFn: () => base44.entities.Fee.list(),
  });

  const feeMap = React.useMemo(() => new Map(fees.map(f => [f.id, f])), [fees]);

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
  const next30Days = addDays(today, 30);

  // KPI Critici (rossi)
  const criticalKpis = Object.values(kpis).filter(kpi => kpi.status === 'critical' && !dismissedIds.has(`kpi:${kpi.id}`));

  // Obiettivi in scadenza (prossimi 7 giorni) e attivi
  const upcomingObjectives = objectives.filter(obj => {
    if (obj.status !== 'active' || !obj.deadline) return false;
    if (dismissedIds.has(`objective:${obj.id}`)) return false;
    const deadline = new Date(obj.deadline);
    return isAfter(deadline, today) && isBefore(deadline, next7Days);
  });

  // Installments in scadenza o scaduti: pending|overdue, escluso paid|cancelled, due_date passata o entro 30gg
  const overdueInstallments = installments.filter(i => {
    if (!['pending', 'overdue'].includes(i.status) || !i.due_date) return false;
    if (dismissedIds.has(`installment:${i.id}`)) return false;
    const dueDate = new Date(i.due_date);
    return isBefore(dueDate, today) || isBefore(dueDate, next30Days);
  });

  const totalNotifications = criticalKpis.length + upcomingObjectives.length + overdueInstallments.length + notifications.length;

  const navigateAndClose = (targetUrl) => {
    if (!targetUrl) return;
    navigate(targetUrl);
    setOpen(false);
  };

  const getEntityUrl = (entityType, entityId) => {
    if (!entityType || !entityId) return null;
    const normalizedType = String(entityType).toLowerCase();
    if (normalizedType === 'client') return createPageUrl(`Clients?clientId=${entityId}`);
    if (normalizedType === 'project') return createPageUrl(`Projects?projectId=${entityId}`);
    if (normalizedType === 'fee') return createPageUrl(`Fees?feeId=${entityId}`);
    if (normalizedType === 'revenue') return createPageUrl(`Revenues?revenueId=${entityId}`);
    if (normalizedType === 'expense') return createPageUrl(`Expenses?expenseId=${entityId}`);
    if (normalizedType === 'objective') return createPageUrl(`Objectives?objectiveId=${entityId}`);
    if (normalizedType === 'installment') {
      const inst = installments.find(i => i.id === entityId);
      if (inst?.fee_id) return createPageUrl(`Fees?feeId=${inst.fee_id}&installmentId=${entityId}`);
      return createPageUrl(`Fees?installmentId=${entityId}`);
    }
    return null;
  };

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
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateAndClose(notif.action_url || getEntityUrl(notif.related_entity_type, notif.related_entity_id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateAndClose(notif.action_url || getEntityUrl(notif.related_entity_type, notif.related_entity_id));
                    }
                  }}
                  className="relative p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <button
                    type="button"
                    onClick={(e) => dismissDbNotification(notif.id, e)}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Elimina notifica"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-start gap-3 pr-5">
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
                <div
                  key={kpi.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateAndClose(createPageUrl('Objectives'))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateAndClose(createPageUrl('Objectives'));
                    }
                  }}
                  className="relative p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); dismissLocal(`kpi:${kpi.id}`); }}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Elimina notifica"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-start gap-3 pr-5">
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
                <div
                  key={obj.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateAndClose(createPageUrl(`Objectives?objectiveId=${obj.id}`))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateAndClose(createPageUrl(`Objectives?objectiveId=${obj.id}`));
                    }
                  }}
                  className="relative p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); dismissLocal(`objective:${obj.id}`); }}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    aria-label="Elimina notifica"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-start gap-3 pr-5">
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
                const fee = feeMap.get(inst.fee_id);
                const clientName = fee?.client_name || 'Cliente';
                const categoryAbbrev = fee ? getFeeCategoryAbbreviation(fee.category) : '';
                const targetUrl = createPageUrl(`Fees?feeId=${inst.fee_id || ''}&installmentId=${inst.id}`);
                return (
                  <div
                    key={inst.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateAndClose(targetUrl)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateAndClose(targetUrl);
                      }
                    }}
                    className="relative p-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dismissLocal(`installment:${inst.id}`); }}
                      className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Elimina notifica"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-3 pr-5">
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {clientName}
                          </p>
                          {categoryAbbrev && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                              {categoryAbbrev}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Rata {isOverdue ? 'scaduta' : 'in scadenza'}
                        </p>
                        <p className={cn(
                          'text-xs font-medium mt-1',
                          isOverdue ? 'text-red-600' : 'text-amber-600'
                        )}>
                          {formatCurrency(inst.amount || 0)} · {format(new Date(inst.due_date), 'dd MMM yyyy', { locale: it })}
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