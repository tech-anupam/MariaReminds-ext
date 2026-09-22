export type BreakTypeId =
  | 'breathe'
  | 'posture'
  | 'eye-break'
  | 'drink-water'
  | 'stretch'
  | 'gym'
  | 'food'
  | 'posture-check'
  | 'sleep';

export interface BreakType {
  id: BreakTypeId;
  label: string;
  tagline: string;
  description: string;
  video: string;
  audio: string;
  suggestedSeconds: number;
  accent: {
    solid: string;
    soft: string;
    text: string;
    ring: string;
  };
}

export type BreakOrder = 'random' | 'sequential';
export type NotificationStyle = 'system' | 'silent';

export interface MariaSettings {
  enabled: boolean;
  intervalMinutes: number;
  intervalSeconds?: number;
  typeIntervals?: Partial<Record<BreakTypeId, number>>;
  soundEnabled: boolean;
  enabledBreakTypes: BreakTypeId[];
  configuredBreakTypes?: BreakTypeId[];
  breakOrder: BreakOrder;
  notificationStyle: NotificationStyle;
  sequenceCursor: number;
  freezeOnBreak: boolean;
  excludedSites: string[];
  customVideoEnabled: boolean;
}

export interface PendingBreak {
  breakTypeId: BreakTypeId;
  triggeredAt: number;
  targetTabId?: number;
}

export interface MariaStats {
  totalBreaksCompleted: number;
  breaksCompletedToday: number;
  lastCompletedDateKey: string;
  streakDays: number;
  lastStreakDateKey: string;
  lastCompletedTimestamp: number;
}

export interface MariaState {
  settings: MariaSettings;
  pendingBreak: PendingBreak | null;
  nextBreakAt: number | null;
  nextBreakTypeId?: BreakTypeId | null;
  stats: MariaStats;
}

export type MariaMessage =
  | { type: 'COMPLETE_BREAK' }
  | { type: 'DISMISS_BREAK' }
  | { type: 'START_BREAK_NOW'; breakTypeId?: BreakTypeId }
  | { type: 'GET_CURRENT_TAB_ID' }
  | { type: 'SETTINGS_UPDATED' }
  | { type: 'TOGGLE_ENABLED'; enabled: boolean }
  | { type: 'USER_TYPING' };