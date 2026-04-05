import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function YearSelect({
  value,
  onValueChange,
  years,
  className = 'w-36',
  includeAll = false,
  allLabel = 'Tutti gli anni',
  allValue = 0,
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = years ?? [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Select value={String(value)} onValueChange={(next) => onValueChange(Number(next))}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value={String(allValue)}>{allLabel}</SelectItem>
        )}
        {yearOptions.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
