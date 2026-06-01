import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useCustomTags() {
  const uid = useCurrentUserId();
  const { data: allTags = [], isLoading } = useQuery({
    queryKey: ['customTags', uid],
    queryFn: () => base44.entities.CustomTag.list(),
  });

  const { expenseTags, revenueTags, tagColorMap } = useMemo(() => {
    const colorMap = {};
    allTags.forEach(t => { colorMap[t.name] = t.color; });
    return {
      expenseTags: allTags.filter(t => t.type === 'expense'),
      revenueTags: allTags.filter(t => t.type === 'revenue'),
      tagColorMap: colorMap,
    };
  }, [allTags]);

  return { expenseTags, revenueTags, tagColorMap, isLoading, allTags };
}

/**
 * Returns an inline style object for a tag badge given a color.
 * If the color is a hex/rgb value, use inline style.
 */
export function getTagStyle(color) {
  if (!color) return {};
  return {
    backgroundColor: color + '22',
    color: color,
    borderColor: color + '55',
    border: '1px solid',
  };
}