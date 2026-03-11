import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomTags } from '../hooks/useCustomTags';
import { useChartTagFilter } from '../hooks/useChartTagFilter';

export default function ChartTagFilterSettings() {
  const { revenueTags, expenseTags } = useCustomTags();
  const { excludedTags, toggleTag, resetFilter } = useChartTagFilter();

  const allTags = [
    ...revenueTags.map(t => ({ ...t, type: 'revenue' })),
    ...expenseTags.map(t => ({ ...t, type: 'expense' })),
  ];

  const excludedCount = excludedTags.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tag nei Grafici</CardTitle>
            <CardDescription>Scegli quali tag includere nei grafici di Dashboard e Guadagni</CardDescription>
          </div>
          {excludedCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilter}>
              Mostra tutti ({excludedCount} nascosti)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allTags.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun tag configurato. Vai alla scheda "Gestione Tag".</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allTags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2">
                <Checkbox
                  id={`chart-tag-${tag.id}`}
                  checked={!excludedTags.includes(tag.name)}
                  onCheckedChange={() => toggleTag(tag.name)}
                />
                <Label htmlFor={`chart-tag-${tag.id}`} className="flex items-center gap-1.5 cursor-pointer">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                  <Badge variant="outline" className="text-xs py-0 px-1 ml-1">
                    {tag.type === 'revenue' ? 'R' : 'S'}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        )}
        {allTags.length > 0 && (
          <p className="text-xs text-slate-400 mt-4">
            R = Ricavi · S = Spese · Deseleziona per nascondere dai grafici
          </p>
        )}
      </CardContent>
    </Card>
  );
}