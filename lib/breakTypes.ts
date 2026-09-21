import { browser } from 'wxt/browser';
import type { BreakType, BreakTypeId } from '@/types';

export const BREAK_TYPES: BreakType[] = [
  {
    id: 'drink-water',
    label: 'Drink Water',
    tagline: 'Take a refreshing sip with Maria.',
    description:
      'Grab your water bottle and hydrate with Maria. Staying hydrated keeps your mind sharp.',
    video: 'maria-drink-water.webm',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-cyan-500',
      soft: 'bg-cyan-50',
      text: 'text-cyan-600',
      ring: 'ring-cyan-300'
    }
  }
];

export const BREAK_TYPE_MAP: Record<BreakTypeId, BreakType> = BREAK_TYPES.reduce(
  (acc, bt) => {
    acc[bt.id] = bt;
    return acc;
  },
  {} as Record<BreakTypeId, BreakType>
);

export function getBreakType(id?: BreakTypeId | string): BreakType {
  if (id && BREAK_TYPE_MAP[id as BreakTypeId]) {
    return BREAK_TYPE_MAP[id as BreakTypeId];
  }
  return BREAK_TYPES[0];
}

export function getVideoUrl(breakType?: BreakType): string {
  const file = breakType?.video || 'maria-drink-water.webm';
  return (browser.runtime as any).getURL(`videos/${file}`);
}