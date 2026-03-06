import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useCustomTags() {
  const { data: allTags = [], isLoading } = useQuery({
    queryKey: ['customTags'],
    queryFn: () => base44.entities.CustomTag.list(),
  });

  const expenseTags = allTags.filter(t => t.type === 'expense');
  const revenueTags = allTags.filter(t => t.type === 'revenue');

  // Map tag name -> color
  const tagColorMap = {};
  allTags.forEach(t => {
    tagColorMap[t.name] = t.color;
  });

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