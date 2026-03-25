import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * SearchableSelect – Popover + Command combobox
 *
 * Props:
 *   items         – array of objects
 *   value         – current selected id (string)
 *   onValueChange – (id: string) => void
 *   getValue      – (item) => string  (returns item id)
 *   getLabel      – (item) => string  (label shown in list and trigger)
 *   getSearchText – (item) => string  (optional, defaults to getLabel; used for filtering)
 *   placeholder   – string (default "Seleziona...")
 *   emptyText     – string (default "Nessun risultato")
 *   className     – extra classes for the trigger button
 *   disabled      – boolean
 *   clearable     – boolean (shows X to clear value)
 */
export default function SearchableSelect({
  items = [],
  value,
  onValueChange,
  getValue,
  getLabel,
  getSearchText,
  placeholder = 'Seleziona...',
  emptyText = 'Nessun risultato',
  className,
  disabled = false,
  clearable = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedItem = value ? items.find(item => getValue(item) === value) : null;
  const selectedLabel = selectedItem ? getLabel(selectedItem) : null;

  const searchFn = getSearchText || getLabel;

  const filtered = query
    ? items.filter(item => searchFn(item).toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal h-9 px-3 text-sm',
            !selectedLabel && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {clearable && selectedLabel && (
              <X
                className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange('');
                  setOpen(false);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[220px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cerca..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filtered.map(item => {
                const id = getValue(item);
                const label = getLabel(item);
                return (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onValueChange(id);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === id ? 'opacity-100' : 'opacity-0')} />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}