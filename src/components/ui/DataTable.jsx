import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage = "Nessun dato disponibile",
  onRowClick,
  className
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              {columns.map((col, i) => (
                <TableHead key={i} className="font-semibold text-slate-700">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50">
            {columns.map((col, i) => (
              <TableHead 
                key={i} 
                className={cn("font-semibold text-slate-700", col.headerClassName)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow 
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-slate-50 transition-colors"
              )}
            >
              {columns.map((col, j) => (
                <TableCell key={j} className={col.cellClassName}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}