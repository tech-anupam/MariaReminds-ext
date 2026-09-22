import { browser } from 'wxt/browser';
import type { BreakType, BreakTypeId } from '@/types';

export const BREAK_TYPES: BreakType[] = [
  {
    id: 'drink-water',
    label: 'Drink Water',
    tagline: 'Take a refreshing sip with Maria.',
    description: 'Grab your water bottle and hydrate with Maria. Staying hydrated keeps your mind sharp.',
    video: 'maria-drink-water.webm',
    audio: 'maria-drink-water.mp3',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-cyan-500',
      soft: 'bg-cyan-50',
      text: 'text-cyan-600',
      ring: 'ring-cyan-300'
    }
  },
  {
    id: 'gym',
    label: 'Gym Workout',
    tagline: 'Time for a quick workout stretch!',
    description: 'Stand up and do a few stretches or light exercises. Keep your body moving and energized.',
    video: 'maria-gym.webm',
    audio: 'maria-gym.mp3',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-amber-500',
      soft: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'ring-amber-300'
    }
  },
  {
    id: 'food',
    label: 'Food Break',
    tagline: 'Grab a healthy snack with Maria!',
    description: 'Fuel your body with a nutritious snack. A small bite keeps your energy steady throughout the day.',
    video: 'maria-food.webm',
    audio: 'maria-food.mp3',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-emerald-500',
      soft: 'bg-emerald-50',
      text: 'text-emerald-600',
      ring: 'ring-emerald-300'
    }
  },
  {
    id: 'posture-check',
    label: 'Posture Check',
    tagline: 'Sit up straight, you\'ve got this!',
    description: 'Check your posture and adjust your sitting position. Your back will thank you later.',
    video: 'maria-posture.webm',
    audio: 'maria-posture.mp3',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-violet-500',
      soft: 'bg-violet-50',
      text: 'text-violet-600',
      ring: 'ring-violet-300'
    }
  },
  {
    id: 'sleep',
    label: 'Rest Break',
    tagline: 'Close your eyes and rest for a moment.',
    description: 'Give your eyes and mind a brief rest. Even a short pause can refresh your focus.',
    video: 'maria-sleep.webm',
    audio: 'maria-sleep.mp3',
    suggestedSeconds: 8,
    accent: {
      solid: 'bg-indigo-500',
      soft: 'bg-indigo-50',
      text: 'text-indigo-600',
      ring: 'ring-indigo-300'
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

export function getAudioUrl(breakType?: BreakType): string {
  const file = breakType?.audio || 'maria-drink-water.mp3';
  return (browser.runtime as any).getURL(`videos/${file}`);
}