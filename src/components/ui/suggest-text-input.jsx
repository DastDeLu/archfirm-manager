import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * SuggestTextInput – Input with autocomplete suggestions from a list of strings.
 *
 * Props:
 *   value         – current string value
 *   onChange      – (value: string) => void
 *   suggestions   – string[] (all possible suggestions)
 *   minLength     – number (default 1) – minimum chars before showing suggestions
 *   maxItems      – number (default 15)
 *   placeholder   – string
 *   className     – extra Input classes
 *   id, required  – passed through to Input
 */
export default function SuggestTextInput({
  value = '',
  onChange,
  suggestions = [],
  minLength = 1,
  maxItems = 15,
  placeholder,
  className,
  id,
  required,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = value.length >= minLength
    ? suggestions
        .filter(s => s && s.toLowerCase().includes(value.toLowerCase()) && s !== value)
        .slice(0, maxItems)
    : [];

  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        required={required}
        value={value}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        {...rest}
      />
      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-52 overflow-auto text-sm">
          {filtered.map((s, i) => (
            <li
              key={i}
              className={cn(
                'px-3 py-2 cursor-pointer hover:bg-slate-50 text-slate-800',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}