import CreditFooter from "@/components/CreditFooter";
import Switch from "@/components/Switch";
import Timer from "@/components/Timer";
import { playHydrationChime } from "@/lib/audio";
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
import type { MariaState } from "@/types";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";

const PRESET_INTERVALS: { label: string; seconds: number }[] = [
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
];

/* Pure SVG Icons (No Emojis) */
function SettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
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

function WaterDropIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
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

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 mt-4 text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">
      {children}
    </p>
  );
}

function TimeIntervalPicker({
  valueSeconds,
  onChange,
}: {
  valueSeconds: number;
  onChange: (seconds: number) => void;
}) {
  const [hours, setHours] = useState(() => Math.floor(valueSeconds / 3600));
  const [minutes, setMinutes] = useState(() => Math.floor((valueSeconds % 3600) / 60));
  const [seconds, setSeconds] = useState(() => valueSeconds % 60);

  useEffect(() => {
    setHours(Math.floor(valueSeconds / 3600));
    setMinutes(Math.floor((valueSeconds % 3600) / 60));
    setSeconds(valueSeconds % 60);
  }, [valueSeconds]);

  const handleApplyHms = () => {
    const total =
      (Number(hours) || 0) * 3600 +
      (Number(minutes) || 0) * 60 +
      (Number(seconds) || 0);
    if (total >= 5) {
      onChange(total);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyHms();
    }
  };

  return (
    <div className="space-y-2">
      {/* Segmented Presets */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/60">
        {PRESET_INTERVALS.map((preset) => {
          const active = valueSeconds === preset.seconds;
          return (
            <button
              key={preset.seconds}
              type="button"
              onClick={() => onChange(preset.seconds)}
              aria-pressed={active}
              className={`h-[28px] rounded-lg text-[11.5px] font-semibold transition-all ${
                active
                  ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-900/5 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Direct Stepper Input */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="number"
            min={0}
            max={24}
            value={hours === 0 ? "" : hours}
            onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
            onKeyDown={handleKeyDown}
            placeholder="0"
            aria-label="Hours"
            className="w-full bg-transparent text-center text-[13px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
          />
          <span className="ml-0.5 text-[11px] font-bold text-slate-400">h</span>
        </div>

        <span className="text-[13px] font-bold text-slate-300">:</span>

        <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="number"
            min={0}
            max={59}
            value={minutes === 0 ? "" : minutes}
            onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
            onKeyDown={handleKeyDown}
            placeholder="0"
            aria-label="Minutes"
            className="w-full bg-transparent text-center text-[13px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
          />
          <span className="ml-0.5 text-[11px] font-bold text-slate-400">m</span>
        </div>

        <span className="text-[13px] font-bold text-slate-300">:</span>

        <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="number"
            min={0}
            max={59}
            value={seconds === 0 ? "" : seconds}
            onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
            onKeyDown={handleKeyDown}
            placeholder="0"
            aria-label="Seconds"
            className="w-full bg-transparent text-center text-[13px] font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
          />
          <span className="ml-0.5 text-[11px] font-bold text-slate-400">s</span>
        </div>

        <button
          type="button"
          onClick={handleApplyHms}
          className="h-[32px] rounded-xl border border-slate-200 bg-white px-3 text-[11.5px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.96] transition-all"
        >
          Set
        </button>
      </div>
    </div>
  );
}

export default function Popup() {
  const [state, setState] = useState<MariaState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [siteInput, setSiteInput] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [customVideoDataUrl, setCustomVideoDataUrl] = useState<string | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFullState().then((s) => {
      setState(s);
      if (s.settings.enabled && (!s.nextBreakAt || s.nextBreakAt <= Date.now())) {
        sendToBackground({ type: "SETTINGS_UPDATED" });
      }
    });
    return subscribeToState(setState);
  }, []);

  useEffect(() => {
    getCustomVideo().then(setCustomVideoDataUrl);
    const onStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (!(STORAGE_KEYS.customVideo in changes)) return;
      const next = changes[STORAGE_KEYS.customVideo]?.newValue;
      setCustomVideoDataUrl(typeof next === "string" ? next : null);
    };
    browser.storage.onChanged.addListener(onStorageChange);
    return () => {
      try {
        browser.storage.onChanged.removeListener(onStorageChange);
      } catch {}
    };
  }, []);

  if (!state) {
    return (
      <div className="flex h-[280px] w-[320px] items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { settings, nextBreakAt, stats } = state;

  const currentIntervalSec =
    settings.intervalSeconds && settings.intervalSeconds > 0
      ? settings.intervalSeconds
      : (settings.intervalMinutes || 30) * 60;

  const handleSetIntervalSeconds = async (seconds: number) => {
    const safeSeconds = Math.max(5, seconds);
    await updateSettings({
      intervalSeconds: safeSeconds,
      intervalMinutes: Math.max(1, Math.round(safeSeconds / 60)),
    });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleToggleSound = async () => {
    const next = !settings.soundEnabled;
    await updateSettings({ soundEnabled: next });
    if (next) {
      playHydrationChime();
    }
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  const handleStartBreakNow = async () => {
    setIsStartingBreak(true);
    await sendToBackground({ type: "START_BREAK_NOW" });
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;
    setVideoUploadError(null);
    if (file.size > 3 * 1024 * 1024) {
      setVideoUploadError("File too large. Maximum is 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await setCustomVideo(dataUrl);
      } catch {
        setVideoUploadError("Storage limit reached. Try a smaller .webm video.");
        return;
      }
      setCustomVideoDataUrl(dataUrl);
      await updateSettings({ customVideoEnabled: true });
      await sendToBackground({ type: "SETTINGS_UPDATED" });
    };
    reader.onerror = () => {
      setVideoUploadError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomVideo = async () => {
    await setCustomVideo(null);
    setCustomVideoDataUrl(null);
    await updateSettings({ customVideoEnabled: false });
    await sendToBackground({ type: "SETTINGS_UPDATED" });
  };

  // Settings Screen
  if (settingsOpen) {
    return (
      <div className="w-[320px] bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
        {/* Header */}
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

        <div className="max-h-[460px] overflow-y-auto px-4 py-3 space-y-4">
          {/* Active Reminder Badge */}
          <div>
            <SectionLabel>Current Routine</SectionLabel>
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <WaterDropIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-blue-950">Maria: Drink Water</p>
                <p className="text-[11px] text-blue-800/70">8-second hydration break</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div>
            <SectionLabel>Audio & Effects</SectionLabel>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  {settings.soundEnabled ? (
                    <SpeakerIcon className="h-4 w-4 text-blue-600" />
                  ) : (
                    <SpeakerXIcon className="h-4 w-4 text-slate-400" />
                  )}
                  <div>
                    <p className="text-[12.5px] font-semibold text-slate-800">Break Chime</p>
                    <p className="text-[10.5px] text-slate-400">Play pleasant hydration sound</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playHydrationChime()}
                    title="Test chime"
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    Test
                  </button>
                  <Switch
                    checked={settings.soundEnabled}
                    onChange={handleToggleSound}
                    label="Toggle sound"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Excluded Sites */}
          <div>
            <SectionLabel>Excluded Websites</SectionLabel>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5">
              <p className="text-[11px] text-slate-500">
                Breaks will not trigger on these sites:
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
                  placeholder="e.g. youtube.com"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addExcludedSite}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-slate-800 active:scale-[0.96] transition-all"
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
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                    >
                      <span>{site}</span>
                      <button
                        type="button"
                        onClick={() => removeExcludedSite(site)}
                        aria-label={`Remove ${site}`}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Animation Upload */}
          <div>
            <SectionLabel>Custom Video</SectionLabel>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-800">
                  {customVideoDataUrl ? "Custom Animation Active" : "Default: Maria"}
                </span>
                {customVideoDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomVideo}
                    className="text-[11px] font-semibold text-red-500 hover:underline"
                  >
                    Reset to Maria
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 transition-all"
              >
                {customVideoDataUrl ? "Upload different .webm (max 3MB)" : "Upload custom .webm (max 3MB)"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/webm"
                className="hidden"
                onChange={handleVideoUpload}
              />
              {videoUploadError && (
                <p className="text-[11px] font-medium text-red-500">{videoUploadError}</p>
              )}
            </div>
          </div>
        </div>

        <CreditFooter />
      </div>
    );
  }

  // Main UI
  return (
    <div className="w-[320px] bg-gradient-to-b from-slate-50 via-white to-sky-50/30 text-slate-800 font-sans antialiased overflow-hidden">
      {/* Top App Bar */}
      <div className="flex h-12 items-center justify-between border-b border-slate-200/70 px-4 bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
            <WaterDropIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight text-slate-900 leading-tight">
              Maria
            </h1>
            <p className="text-[10px] font-medium text-slate-400 leading-none">
              Hydration Reminder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={settings.soundEnabled ? "Mute audio" : "Enable chime"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {settings.soundEnabled ? (
              <SpeakerIcon className="h-4 w-4 text-blue-600" />
            ) : (
              <SpeakerXIcon className="h-4 w-4" />
            )}
          </button>

          {/* Preferences */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Preferences"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Main Status & Countdown Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  settings.enabled
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                    : "bg-slate-300"
                }`}
              />
              <span className="text-[12px] font-semibold text-slate-700">
                {settings.enabled ? "Reminders Active" : "Reminders Paused"}
              </span>
            </div>

            <Switch
              checked={settings.enabled}
              onChange={(enabled) =>
                sendToBackground({
                  type: "TOGGLE_ENABLED",
                  enabled,
                })
              }
              label="Toggle reminders"
            />
          </div>

          {/* Countdown Clock Display */}
          <div className="pt-3.5 pb-2 text-center">
            {settings.enabled ? (
              nextBreakAt && nextBreakAt > Date.now() ? (
                <div>
                  <Timer
                    targetTimestamp={nextBreakAt}
                    onReachZero={() => sendToBackground({ type: "START_BREAK_NOW" })}
                    className="block text-[32px] font-extrabold tracking-tight tabular-nums text-slate-900"
                  />
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    until your next water break
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1">
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[22px]">
                    <WaterDropIcon className="h-6 w-6" />
                    <span>Break Time</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-blue-700/80">
                    Take a refreshing sip with Maria
                  </p>
                </div>
              )
            ) : (
              <div>
                <span className="block text-[26px] font-bold tracking-tight text-slate-400">
                  Paused
                </span>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  Turn reminders on to resume
                </p>
              </div>
            )}
          </div>

          {/* Daily Progress Counters (Pure SVG Icons) */}
          <div className="mt-3 flex items-center justify-around rounded-xl bg-slate-50 p-2 border border-slate-100 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <CheckCircleIcon className="h-3.5 w-3.5 text-blue-600" />
              <span>{stats?.breaksCompletedToday ?? 0} today</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <FlameIcon className="h-3.5 w-3.5 text-amber-500" />
              <span>{stats?.streakDays ?? 0}d streak</span>
            </div>
          </div>
        </div>

        {/* Remind Interval Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Interval
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              {formatDuration(currentIntervalSec)}
            </span>
          </div>

          <TimeIntervalPicker
            valueSeconds={currentIntervalSec}
            onChange={handleSetIntervalSeconds}
          />
        </div>

        {/* Hero "Take a break now" Action Button */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={handleStartBreakNow}
            disabled={isStartingBreak}
            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-[13px] font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-150 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg active:scale-[0.98] disabled:opacity-75"
          >
            <PlayIcon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            <span>{isStartingBreak ? "Starting Maria break…" : "Take a break now"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}