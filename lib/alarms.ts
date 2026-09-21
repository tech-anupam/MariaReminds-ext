import type { Alarms } from 'wxt/browser';
import { browser } from 'wxt/browser';
import { setNextBreakAt, setBreakDueSince } from './storage';

export const BREAK_ALARM_NAME = 'maria-break-alarm';
export const TYPING_RECHECK_ALARM_NAME = 'maria-typing-recheck-alarm';

export async function scheduleNextBreak(totalSeconds: number): Promise<number> {
  await browser.alarms.clear(BREAK_ALARM_NAME);
  await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
  await setBreakDueSince(null);

  // If a very small number like 5 is passed, treat as seconds; minimum 5 seconds
  const safeSeconds = Math.max(5, totalSeconds);
  const when = Date.now() + safeSeconds * 1000;

  await browser.alarms.create(BREAK_ALARM_NAME, { when });
  await setNextBreakAt(when);
  return when;
}

export async function cancelScheduledBreak(): Promise<void> {
  await browser.alarms.clear(BREAK_ALARM_NAME);
  await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
  await setNextBreakAt(null);
  await setBreakDueSince(null);
}

export async function getBreakAlarm(): Promise<Alarms.Alarm | undefined> {
  return browser.alarms.get(BREAK_ALARM_NAME);
}