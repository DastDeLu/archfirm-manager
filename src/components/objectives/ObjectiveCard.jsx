import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Calendar, Edit, Target, AlertCircle, Trash2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  calculateObjectiveStatus, 
  formatValue, 
  getStatusColor, 
  getStatusIcon 
} from './objectiveLogic';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS } from '../lib/kpiDashboard';

export default function ObjectiveCard({ objective, onEdit, onUpdateProgress, onDelete }) {
  const { status, percentage, message } = calculateObjectiveStatus(objective);
  const colors = getStatusColor(status);
  const icon = getStatusIcon(status);

  const daysRemaining = differenceInDays(
    new Date(objective.deadline),
    new Date()
  );

  const isOverdue = daysRemaining < 0;

  return (
    <Card className={cn('border-2 transition-all hover:shadow-lg', colors.border, colors.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {icon}
              {objective.name}
            </CardTitle>
            {objective.category && (
              <Badge variant="outline" className="mt-2 text-xs">
                {CATEGORY_LABELS[objective.category] || objective.category}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(objective)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete()}
              className="h-8 w-8 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Valori */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Attuale</p>
            <p className="text-lg font-bold text-slate-900">
              {formatValue(objective.current_value, objective.unit_type)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Target</p>
            <p className="text-lg font-bold text-slate-900">
              {formatValue(objective.target_value, objective.unit_type)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className={colors.text}>Progresso</span>
            <span className="font-semibold">{percentage.toFixed(1)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Deadline */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">
              {format(new Date(objective.deadline), 'dd MMM yyyy', { locale: it })}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              isOverdue ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100'
            )}
          >
            {isOverdue 
              ? `Scaduto ${Math.abs(daysRemaining)}g fa` 
              : `${daysRemaining}g rimanenti`
            }
          </Badge>
        </div>

        {/* Status Message */}
        <div className={cn('p-2 rounded-lg text-xs font-medium flex items-center gap-2', colors.badge)}>
          {status === 'on_track' && <Target className="h-3 w-3" />}
          {status === 'at_risk' && <TrendingDown className="h-3 w-3" />}
          {status === 'off_track' && <AlertCircle className="h-3 w-3" />}
          {message}
        </div>

        {/* Update Progress Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onUpdateProgress(objective)}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Aggiorna Progresso
        </Button>

        {/* Description */}
        {objective.description && (
          <p className="text-xs text-slate-500 pt-2 border-t">
            {objective.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}