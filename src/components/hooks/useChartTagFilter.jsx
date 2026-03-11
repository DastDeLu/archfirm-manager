import { useState, useCallback } from 'react';

const STORAGE_KEY = 'archfirm_chart_excluded_tags';

/**
 * Hook per gestire il filtro tag nei grafici.
 * Persiste le scelte in localStorage (chiave: archfirm_chart_excluded_tags).
 * Usato in Dashboard, Guadagni e Impostazioni.
 */
export function useChartTagFilter() {
  const [excludedTags, setExcludedTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const toggleTag = useCallback((tagName) => {
    setExcludedTags(prev => {
      const next = prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFilter = useCallback(() => {
    setExcludedTags([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { excludedTags, toggleTag, resetFilter };
}