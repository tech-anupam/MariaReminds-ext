import CreditFooter from "@/components/CreditFooter";
import Switch from "@/components/Switch";
import Timer from "@/components/Timer";
import { playHydrationChime } from "@/lib/audio";
import { BREAK_TYPES, getBreakType } from "@/lib/breakTypes";
import { normalizeDomain } from "@/lib/exclusions";
import { formatDuration } from "@/lib/format";
import { sendToBackground } from "@/lib/messaging";
import {
  getCustomVideo,
  getFullState,
  setCustomVideo,
  STORAGE_KEYS,
  subscribeToState,
  updateSettings,
} from "@/lib/storage";
import type { BreakTypeId, MariaState } from "@/types";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";

/* ─────────── Minimal Clean SVG Icons ─────────── */

function WaterIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function DumbbellIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-1.34 1.34a2 2 0 0 0 0 2.83l1 1a2 2 0 0 0 2.83 0l1.34-1.34a2 2 0 0 0 0-2.83z" />
      <path d="m3 3 1 1a2 2 0 0 0 2.83 0L8.17 2.66a2 2 0 0 0 0-2.83l-1-1a2 2 0 0 0-2.83 0L3 0.17a2 2 0 0 0 0 2.83z" />
      <path d="m18 15 3 3" />
      <path d="m6 9-3-3" />
    </svg>
  );
}

function UtensilsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  );
}

function SpineIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 7v13" />
      <path d="M9 10h6" />
      <path d="M8 14h8" />
      <path d="M9 18h6" />
    </svg>
  );
}

function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function SpeakerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerXIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function SettingsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const ROUTINE_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  'drink-water': WaterIcon,
  'gym': DumbbellIcon,
  'food': UtensilsIcon,
  'posture-check': SpineIcon,
  'sleep': MoonIcon,
};

const ROUTINE_THEMES: Record<string, { badge: string; accent: string; bar: string; iconBg: string; text: string }> = {
  'drink-water': { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', accent: 'accent-cyan-600', bar: 'bg-cyan-500', iconBg: 'bg-cyan-50 text-cyan-600', text: 'text-cyan-700' },
  'gym': { badge: 'bg-amber-50 text-amber-700 border-amber-200', accent: 'accent-amber-600', bar: 'bg-amber-500', iconBg: 'bg-amber-50 text-amber-600', text: 'text-amber-700' },
  'food': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'accent-emerald-600', bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700' },
  'posture-check': { badge: 'bg-violet-50 text-violet-700 border-violet-200', accent: 'accent-violet-600', bar: 'bg-violet-500', iconBg: 'bg-violet-50 text-violet-600', text: 'text-violet-700' },
  'sleep': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', accent: 'accent-indigo-600', bar: 'bg-indigo-500', iconBg: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-700' },
};

function getRoutineTheme(id: string) {
  return ROUTINE_THEMES[id] || { badge: 'bg-blue-50 text-blue-700 border-blue-200', accent: 'accent-blue-600', bar: 'bg-blue-500', iconBg: 'bg-blue-50 text-blue-600', text: 'text-blue-700' };
}

/* ─────────── Single Reminder Card Component ─────────── */

const QUICK_INTERVAL_PRESETS = [
  { label: "10s", seconds: 10 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
];

function ReminderCard({
  breakType,
  isEnabled,
  globalEnabled,
  isUpcomingNext,
  intervalSeconds,
  onToggle,
  onIntervalChange,
  onTriggerNow,
  onDelete,
}: {
  breakType: ReturnType<typeof getBreakType>;
  isEnabled: boolean;
  globalEnabled: boolean;
  isUpcomingNext: boolean;
  intervalSeconds: number;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (seconds: number) => void;
  onTriggerNow: () => void;
  onDelete: () => void;
}) {
  const IconComp = ROUTINE_ICONS[breakType.id] || WaterIcon;
  const theme = getRoutineTheme(breakType.id);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHours, setCustomHours] = useState(() => Math.floor(intervalSeconds / 3600));
  const [customMinutes, setCustomMinutes] = useState(() => Math.floor((intervalSeconds % 3600) / 60));
  const [customSeconds, setCustomSeconds] = useState(() => intervalSeconds % 60);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    setCustomHours(Math.floor(intervalSeconds / 3600));
    setCustomMinutes(Math.floor((intervalSeconds % 3600) / 60));
    setCustomSeconds(intervalSeconds % 60);
  }, [intervalSeconds]);

  const handleApplyCustomTime = () => {
    const total =
      (Number(customHours) || 0) * 3600 +
      (Number(customMinutes) || 0) * 60 +
      (Number(customSeconds) || 0);
    if (total >= 5) {
      onIntervalChange(total);
      setShowCustomInput(false);
    }
  };

  const handlePreviewAudio = () => {
    try {
      setIsPlayingAudio(true);
      const audioUrl = (browser.runtime as any).getURL(`videos/${breakType.audio}`);
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const isPresetActive = (secs: number) => !showCustomInput && intervalSeconds === secs;
  const isCardActive = isEnabled && globalEnabled;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-3.5 relative ${
        isCardActive
          ? isUpcomingNext
            ? "bg-white border-blue-300 shadow-[0_4px_16px_rgba(37,99,235,0.08)] ring-1 ring-blue-200/60"
            : "bg-white border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          : "bg-slate-50/70 border-slate-200/60 opacity-60"
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0 transition-colors ${isCardActive ? theme.iconBg : "bg-slate-100 text-slate-400"}`}>
            <IconComp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`text-[12.5px] font-bold leading-tight truncate ${isCardActive ? "text-slate-800" : "text-slate-500"}`}>
                {breakType.label}
              </h3>
              {isCardActive && isUpcomingNext && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Next
                </span>
              )}
              {!isEnabled && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 border border-slate-200/80">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Every {formatDuration(intervalSeconds)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {globalEnabled && (
            <button
              type="button"
              onClick={onTriggerNow}
              title={`Test ${breakType.label} break now`}
              aria-label={`Test ${breakType.label} now`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors active:scale-90"
            >
              <PlayIcon className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Configure interval & sound"
            aria-label={`Settings for ${breakType.label}`}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90 ${
              isSettingsOpen
                ? "bg-slate-200 text-slate-800"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </button>

          <Switch
            checked={isEnabled}
            onChange={onToggle}
            label={`Toggle ${breakType.label}`}
          />
        </div>
      </div>

      {/* Expandable Settings Drawer per Reminder */}
      {isSettingsOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500">
              Reminder Schedule
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold border ${theme.badge}`}>
              Every {formatDuration(intervalSeconds)}
            </span>
          </div>

          {/* Preset Buttons & Custom Toggle */}
          <div className="flex items-center gap-1">
            {QUICK_INTERVAL_PRESETS.map((p) => {
              const active = isPresetActive(p.seconds);
              return (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    onIntervalChange(p.seconds);
                  }}
                  className={`h-[24px] flex-1 rounded-lg text-[10px] font-bold transition-all ${
                    active
                      ? `${theme.iconBg} font-extrabold shadow-2xs ring-1 ring-slate-900/5`
                      : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className={`h-[24px] px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                showCustomInput
                  ? `${theme.iconBg} font-extrabold shadow-2xs ring-1 ring-slate-900/5`
                  : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Time Input Form */}
          {showCustomInput ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1 shadow-2xs focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={customHours === 0 ? "" : customHours}
                  onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  aria-label="Hours"
                  className="w-full bg-transparent text-center text-[11px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
                />
                <span className="ml-0.5 text-[10px] font-bold text-slate-400">h</span>
              </div>

              <span className="text-[11px] font-bold text-slate-300">:</span>

              <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1 shadow-2xs focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={customMinutes === 0 ? "" : customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  aria-label="Minutes"
                  className="w-full bg-transparent text-center text-[11px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
                />
                <span className="ml-0.5 text-[10px] font-bold text-slate-400">m</span>
              </div>

              <span className="text-[11px] font-bold text-slate-300">:</span>

              <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1 shadow-2xs focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={customSeconds === 0 ? "" : customSeconds}
                  onChange={(e) => setCustomSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  aria-label="Seconds"
                  className="w-full bg-transparent text-center text-[11px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
                />
                <span className="ml-0.5 text-[10px] font-bold text-slate-400">s</span>
              </div>

              <button
                type="button"
                onClick={handleApplyCustomTime}
                className="h-[28px] rounded-xl bg-slate-900 px-3 text-[10.5px] font-bold text-white shadow-2xs hover:bg-slate-800 active:scale-95 transition-all"
              >
                Set
              </button>
            </div>
          ) : (
            /* Smooth Range Slider from 10s to 2h */
            <div className="space-y-1 pt-0.5">
              <input
                type="range"
                min={10}
                max={7200}
                step={10}
                value={intervalSeconds}
                onChange={(e) => onIntervalChange(parseInt(e.target.value, 10))}
                aria-label={`${breakType.label} interval`}
                className={`w-full h-1.5 bg-slate-100 rounded-lg cursor-pointer ${theme.accent}`}
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5">
                <span>10s</span>
                <span>15m</span>
                <span>30m</span>
                <span>1h</span>
                <span>2h</span>
              </div>
            </div>
          )}

          {/* Extra Routine Settings (Sound Preview & Remove) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePreviewAudio}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
            >
              <SpeakerIcon className={`h-3.5 w-3.5 ${isPlayingAudio ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
              <span>{isPlayingAudio ? "Playing..." : "Preview Sound"}</span>
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 hover:underline active:scale-95 transition-all"
            >
              <TrashIcon className="h-3 w-3" />
              <span>Remove Routine</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Main Application ─────────── */

export default function Popup() {
  const [state, setState] = useState<MariaState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [isStartingBreak, setIsStartingBreak] = useState(false);

  useEffect(() => {
    getFullState().then((s) => {
      setState(s);
      if (s.settings.enabled && (!s.nextBreakAt || s.nextBreakAt <= Date.now())) {
        sendToBackground({ type: "SETTINGS_UPDATED" });
      }
    });
    return subscribeToState(setState);
  }, []);

  if (!state) {
    return (
      <div className="flex h-[320px] w-[340px] items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { settings, nextBreakAt, stats } = state;
  const configuredBreakIds =
    settings.configuredBreakTypes ??
    settings.enabledBreakTypes ??
    BREAK_TYPES.map((b) => b.id);
  const activeBreakIds = settings.enabledBreakTypes || [];

  // Available routines that can be added
  const availableToAdd = BREAK_TYPES.filter((bt) => !configuredBreakIds.includes(bt.id));

  const handleGlobalToggle = async (enabled: boolean) => {
    await sendToBackground({ type: "TOGGLE_ENABLED", enabled });
  };

  const handleToggleSound = async () => {
    const next = !settings.soundEnabled;
    await updateSettings({ soundEnabled: next });
    if (next) playHydrationChime();
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleToggleRoutine = async (id: BreakTypeId) => {
    const isCurrentlyEnabled = activeBreakIds.includes(id);
    const next = isCurrentlyEnabled
      ? activeBreakIds.filter((t) => t !== id)
      : [...activeBreakIds, id];

    await updateSettings({ enabledBreakTypes: next });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleDeleteRoutine = async (id: BreakTypeId) => {
    const nextConfigured = configuredBreakIds.filter((t) => t !== id);
    const nextActive = activeBreakIds.filter((t) => t !== id);
    await updateSettings({
      configuredBreakTypes: nextConfigured,
      enabledBreakTypes: nextActive,
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleAddRoutine = async (id: BreakTypeId) => {
    if (configuredBreakIds.includes(id)) return;
    const nextConfigured = [...configuredBreakIds, id];
    const nextActive = activeBreakIds.includes(id) ? activeBreakIds : [...activeBreakIds, id];
    await updateSettings({
      configuredBreakTypes: nextConfigured,
      enabledBreakTypes: nextActive,
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
    setAddModalOpen(false);
  };

  const handleIntervalChange = async (id: BreakTypeId, seconds: number) => {
    const typeIntervals = { ...(settings.typeIntervals || {}), [id]: seconds };
    await updateSettings({
      typeIntervals,
      intervalSeconds: seconds,
      intervalMinutes: Math.round(seconds / 60),
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleStartBreakNow = async (breakTypeId?: BreakTypeId) => {
    setIsStartingBreak(true);
    await sendToBackground({ type: "START_BREAK_NOW", breakTypeId });
    setTimeout(() => setIsStartingBreak(false), 2000);
  };

  const addExcludedSite = async () => {
    const normalized = normalizeDomain(siteInput);
    if (!normalized) {
      setSiteError("Enter a valid domain, e.g. youtube.com");
      return;
    }
    if (settings.excludedSites.includes(normalized)) {
      setSiteError(`${normalized} is already excluded`);
      return;
    }
    await updateSettings({ excludedSites: [...settings.excludedSites, normalized] });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
    setSiteInput("");
    setSiteError(null);
  };

  const removeExcludedSite = async (site: string) => {
    await updateSettings({
      excludedSites: settings.excludedSites.filter((s) => s !== site),
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  /* ─────────── Preferences / Settings View ─────────── */
  if (settingsOpen) {
    return (
      <div className="w-[340px] bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
        <div className="flex h-12 items-center justify-between border-b border-slate-200/80 bg-white px-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Back"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <ArrowLeftIcon />
          </button>
          <h2 className="text-[13px] font-bold text-slate-800">Preferences</h2>
          <div className="w-8" />
        </div>

        <div className="max-h-[460px] overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
          {/* Excluded Sites */}
          <div>
            <p className="mb-2 text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">
              Excluded Sites
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5">
              <p className="text-[11px] text-slate-500">
                Breaks will not trigger on these domains:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={siteInput}
                  onChange={(e) => {
                    setSiteInput(e.target.value);
                    if (siteError) setSiteError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExcludedSite();
                    }
                  }}
                  placeholder="e.g. figma.com"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addExcludedSite}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-slate-800 active:scale-[0.96] transition-all"
                >
                  Add
                </button>
              </div>

              {siteError && (
                <p className="text-[11px] font-medium text-red-500">{siteError}</p>
              )}

              {settings.excludedSites.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {settings.excludedSites.map((site) => (
                    <span
                      key={site}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <span>{site}</span>
                      <button
                        type="button"
                        onClick={() => removeExcludedSite(site)}
                        aria-label={`Remove ${site}`}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <CreditFooter />
      </div>
    );
  }

  /* ─────────── Main Clean Dashboard ─────────── */
  return (
    <div className="w-[340px] bg-slate-50/70 text-slate-800 font-sans antialiased overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="flex h-12 items-center justify-between border-b border-slate-200/80 px-4 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <WaterIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight text-slate-900 leading-tight">
              Maria
            </h1>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-none">
              {!settings.enabled
                ? "All Paused"
                : activeBreakIds.length === 0
                ? "No active routines"
                : `${activeBreakIds.length} active routine${activeBreakIds.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleSound}
            title={settings.soundEnabled ? "Mute audio" : "Enable chime"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {settings.soundEnabled ? (
              <SpeakerIcon className="h-4 w-4 text-blue-600" />
            ) : (
              <SpeakerXIcon className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Preferences"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>

          <Switch
            checked={settings.enabled}
            onChange={handleGlobalToggle}
            label="Toggle all reminders"
          />
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 space-y-3 max-h-[460px] overflow-y-auto scrollbar-thin">
        {/* Next Break Banner */}
        {settings.enabled ? (
          activeBreakIds.length > 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3 flex items-center justify-between shadow-[0_2px_10px_rgba(37,99,235,0.06)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800/70 leading-none">
                      Next break
                    </p>
                    {state.nextBreakTypeId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9.5px] font-extrabold text-blue-800 border border-blue-200/60 shadow-2xs">
                        {getBreakType(state.nextBreakTypeId).label}
                      </span>
                    )}
                  </div>
                  {nextBreakAt && nextBreakAt > Date.now() ? (
                    <Timer
                      targetTimestamp={nextBreakAt}
                      onReachZero={() =>
                        sendToBackground({
                          type: "START_BREAK_NOW",
                          breakTypeId: state.nextBreakTypeId,
                        })
                      }
                      className="text-[15px] font-extrabold text-blue-950 tabular-nums leading-tight"
                    />
                  ) : (
                    <span className="text-[13px] font-bold text-blue-900">Due Now</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleStartBreakNow(state.nextBreakTypeId)}
                disabled={isStartingBreak}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <PlayIcon className="h-3 w-3" />
                <span>{isStartingBreak ? "Starting..." : "Trigger"}</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-[11.5px] font-bold text-amber-900 leading-tight">All Reminders Paused</p>
                  <p className="text-[10px] text-amber-700/90 mt-0.5">Toggle on a routine or create a reminder</p>
                </div>
              </div>
              {availableToAdd.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="rounded-lg bg-amber-600 px-2 py-1 text-[10.5px] font-bold text-white hover:bg-amber-700 active:scale-95 transition-all"
                >
                  + Add
                </button>
              )}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3 text-center">
            <p className="text-[11.5px] font-semibold text-slate-500">Maria breaks are currently paused</p>
          </div>
        )}

        {/* Reminders List Header */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Routines ({configuredBreakIds.length})
          </span>
          {availableToAdd.length > 0 && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline active:scale-95 transition-all"
            >
              <PlusIcon className="h-3 w-3" />
              <span>Add Reminder</span>
            </button>
          )}
        </div>

        {/* Routine Cards or Empty State */}
        {configuredBreakIds.length === 0 ? (
          /* Clean Empty State when NO reminders are set */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/80 p-6 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
              <PlusIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">No Reminders Set</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] mx-auto">
                Create a reminder to get mindful video breaks with Maria
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create a Reminder</span>
            </button>
          </div>
        ) : (
          /* List of configured Reminder Cards */
          <div className="space-y-2.5">
            {configuredBreakIds.map((id) => {
              const bt = getBreakType(id);
              const customInterval =
                settings.typeIntervals?.[id] ??
                (settings.intervalSeconds && settings.intervalSeconds > 0
                  ? settings.intervalSeconds
                  : (settings.intervalMinutes || 30) * 60);

              const isRoutineEnabled = activeBreakIds.includes(id);
              const isNext = isRoutineEnabled && (state.nextBreakTypeId === id || activeBreakIds.length === 1);

              return (
                <ReminderCard
                  key={id}
                  breakType={bt}
                  isEnabled={isRoutineEnabled}
                  globalEnabled={settings.enabled}
                  isUpcomingNext={isNext}
                  intervalSeconds={customInterval}
                  onToggle={() => handleToggleRoutine(id)}
                  onIntervalChange={(sec) => handleIntervalChange(id, sec)}
                  onTriggerNow={() => sendToBackground({ type: "START_BREAK_NOW", breakTypeId: id })}
                  onDelete={() => handleDeleteRoutine(id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add Reminder Sheet / Modal */}
      {addModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col justify-end transition-opacity">
          <div className="bg-white rounded-t-3xl p-4 shadow-2xl border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-[13.5px] font-bold text-slate-800">
                Choose a Routine to Add
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {availableToAdd.map((bt) => {
                const IconComp = ROUTINE_ICONS[bt.id] || WaterIcon;
                const theme = getRoutineTheme(bt.id);

                return (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => handleAddRoutine(bt.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme.iconBg}`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {bt.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {bt.tagline}
                        </p>
                      </div>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <PlusIcon className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <CreditFooter />
    </div>
  );
}