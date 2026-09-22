import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import type { Runtime, Notifications, Windows } from 'wxt/browser';
import type { MariaMessage, MariaSettings, BreakTypeId } from '@/types';
import { BREAK_TYPES } from '@/lib/breakTypes';
import {
  getSettings,
  updateSettings,
  getPendingBreak,
  setPendingBreak,
  recordBreakCompleted,
  getNextBreakAt,
  getNextBreakTypeId,
  setNextBreakTypeId,
  getBreakDueSince,
  setBreakDueSince
} from '@/lib/storage';
import {
  BREAK_ALARM_NAME,
  TYPING_RECHECK_ALARM_NAME,
  scheduleNextBreak,
  cancelScheduledBreak,
  getBreakAlarm
} from '@/lib/alarms';
import { isUrlExcluded } from '@/lib/exclusions';
import { TYPING_IDLE_MS, MAX_TYPING_DELAY_MS } from '@/lib/typing';

const TYPING_RECHECK_INTERVAL_MS = 5_000;
const lastTypingByTab = new Map<number, number>();
const NOTIFICATION_ID = 'maria-break-notification';
const MAX_BREAK_AGE_MS = 25_000;

function getIntervalSeconds(settings: MariaSettings, breakTypeId?: BreakTypeId): number {
  if (breakTypeId && settings.typeIntervals?.[breakTypeId]) {
    return settings.typeIntervals[breakTypeId]!;
  }
  if (settings.intervalSeconds && settings.intervalSeconds > 0) {
    return settings.intervalSeconds;
  }
  return (settings.intervalMinutes || 30) * 60;
}

async function clearStalePendingBreak(): Promise<void> {
  const pending = await getPendingBreak();
  if (pending && Date.now() - pending.triggeredAt > MAX_BREAK_AGE_MS) {
    await setPendingBreak(null);
    browser.notifications.clear(NOTIFICATION_ID);
  }
}

async function injectIntoExistingTabs(): Promise<void> {
  const manifest = browser.runtime.getManifest();
  const declaredScripts = manifest.content_scripts ?? [];
  if (declaredScripts.length === 0) return;

  const tabs = await browser.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || !tab.url) return;
      if (!/^https?:\/\//.test(tab.url)) return;

      for (const script of declaredScripts) {
        try {
          if (script.css?.length) {
            await browser.scripting.insertCSS({
              target: { tabId: tab.id, allFrames: false },
              files: script.css
            });
          }
          if (script.js?.length) {
            await browser.scripting.executeScript({
              target: { tabId: tab.id, allFrames: false },
              files: script.js
            });
          }
        } catch {
        }
      }
    })
  );
}

export default defineBackground(() => {

  async function ensureInitialized(): Promise<void> {
    await clearStalePendingBreak();
    const settings = await getSettings();
    if (!settings.enabled || settings.enabledBreakTypes.length === 0) {
      await cancelScheduledBreak();
      return;
    }

    const pending = await getPendingBreak();
    if (pending) {
      if (Date.now() - pending.triggeredAt > MAX_BREAK_AGE_MS) {
        await setPendingBreak(null);
      } else {
        return;
      }
    }

    const nextBreakAt = await getNextBreakAt();
    const alarm = await getBreakAlarm();
    const nextType = await peekNextBreakTypeId();
    await setNextBreakTypeId(nextType);
    const intervalSec = getIntervalSeconds(settings, nextType);

    if (!alarm || !nextBreakAt || nextBreakAt <= Date.now()) {
      await scheduleNextBreak(intervalSec);
    }
  }

  browser.runtime.onInstalled.addListener(async () => {
    await clearStalePendingBreak();
    await injectIntoExistingTabs();
    await ensureInitialized();
  });

  browser.runtime.onStartup.addListener(async () => {
    await clearStalePendingBreak();
    await injectIntoExistingTabs();
    await ensureInitialized();
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== BREAK_ALARM_NAME && alarm.name !== TYPING_RECHECK_ALARM_NAME) {
      return;
    }
    await triggerBreak();
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    lastTypingByTab.delete(tabId);
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const pending = await getPendingBreak();
    if (!pending) return;
    if (Date.now() - pending.triggeredAt > MAX_BREAK_AGE_MS) {
      await setPendingBreak(null);
      return;
    }
    try {
      await browser.tabs.sendMessage(activeInfo.tabId, {
        type: 'BREAK_TRIGGERED',
        pendingBreak: pending
      });
    } catch {
      try {
        await browser.scripting.executeScript({
          target: { tabId: activeInfo.tabId },
          files: ['content-scripts/content.js']
        });
        await browser.tabs.sendMessage(activeInfo.tabId, {
          type: 'BREAK_TRIGGERED',
          pendingBreak: pending
        });
      } catch {}
    }
  });

  async function peekNextBreakTypeId(): Promise<BreakTypeId> {
    const settings = await getSettings();
    const pool = BREAK_TYPES.filter((b) =>
      settings.enabledBreakTypes.includes(b.id)
    );
    const safePool = pool.length > 0 ? pool : (settings.configuredBreakTypes && settings.configuredBreakTypes.length > 0 ? BREAK_TYPES.filter(b => settings.configuredBreakTypes!.includes(b.id)) : BREAK_TYPES);
    if (settings.breakOrder === 'sequential') {
      const index = settings.sequenceCursor % safePool.length;
      return safePool[index].id;
    }
    const random = safePool[Math.floor(Math.random() * safePool.length)];
    return random.id;
  }

  async function pickNextBreakTypeId(preferredId?: BreakTypeId): Promise<BreakTypeId> {
    if (preferredId) return preferredId;
    const storedNext = await getNextBreakTypeId();
    const settings = await getSettings();
    const pool = BREAK_TYPES.filter((b) =>
      settings.enabledBreakTypes.includes(b.id)
    );
    const safePool = pool.length > 0 ? pool : (settings.configuredBreakTypes && settings.configuredBreakTypes.length > 0 ? BREAK_TYPES.filter(b => settings.configuredBreakTypes!.includes(b.id)) : BREAK_TYPES);

    if (storedNext && safePool.some((b) => b.id === storedNext)) {
      if (settings.breakOrder === 'sequential') {
        const index = safePool.findIndex((b) => b.id === storedNext);
        await updateSettings({ sequenceCursor: (index + 1) % safePool.length });
      }
      return storedNext;
    }

    if (settings.breakOrder === 'sequential') {
      const index = settings.sequenceCursor % safePool.length;
      await updateSettings({ sequenceCursor: (index + 1) % safePool.length });
      return safePool[index].id;
    }

    const random = safePool[Math.floor(Math.random() * safePool.length)];
    return random.id;
  }

  async function getFocusedActiveTab() {
    const [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    return tab;
  }

  async function triggerBreak(options: { bypassTypingCheck?: boolean; force?: boolean; breakTypeId?: BreakTypeId } = {}): Promise<void> {
    const settings = await getSettings();
    if ((!settings.enabled || settings.enabledBreakTypes.length === 0) && !options.force) {
      await setBreakDueSince(null);
      await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);
      return;
    }

    if (!options.force) {
      const existingPending = await getPendingBreak();
      if (existingPending && Date.now() - existingPending.triggeredAt < MAX_BREAK_AGE_MS) {
        return;
      }
    }

    const allTabs = await browser.tabs.query({});
    let activeTab = await getFocusedActiveTab();

    if (options.force && (!activeTab?.url || !/^https?:\/\//.test(activeTab.url))) {
      const eligibleTab = allTabs.find((t) => t.url && /^https?:\/\//.test(t.url));
      if (eligibleTab?.id !== undefined) {
        activeTab = eligibleTab;
        try {
          await browser.tabs.update(eligibleTab.id, { active: true });
        } catch {}
      }
    }

    const targetTabId = activeTab?.id;
    const dueSince = (await getBreakDueSince()) ?? Date.now();

    if (!options.force) {
      if (activeTab?.url && isUrlExcluded(activeTab.url, settings.excludedSites)) {
        await setBreakDueSince(dueSince);
        await browser.alarms.create(TYPING_RECHECK_ALARM_NAME, {
          when: Date.now() + TYPING_RECHECK_INTERVAL_MS
        });
        return;
      }

      if (!options.bypassTypingCheck && targetTabId !== undefined) {
        const lastTyping = lastTypingByTab.get(targetTabId);
        const isTyping = !!lastTyping && Date.now() - lastTyping < TYPING_IDLE_MS;

        if (isTyping) {
          const stillWithinCeiling = Date.now() - dueSince < MAX_TYPING_DELAY_MS;

          if (stillWithinCeiling) {
            await setBreakDueSince(dueSince);
            await browser.alarms.create(TYPING_RECHECK_ALARM_NAME, {
              when: Date.now() + TYPING_RECHECK_INTERVAL_MS
            });
            return;
          }
        }
      }
    }

    await setBreakDueSince(null);
    await browser.alarms.clear(TYPING_RECHECK_ALARM_NAME);

    const breakTypeId = await pickNextBreakTypeId(options.breakTypeId);
    const pendingBreak = { breakTypeId, triggeredAt: Date.now(), targetTabId };
    await setPendingBreak(pendingBreak);

    const breakType = BREAK_TYPES.find((b) => b.id === breakTypeId) ?? BREAK_TYPES[0];
    void playOffscreenAudio(`videos/${breakType.audio}`);

    for (const t of allTabs) {
      if (t.id !== undefined && t.url && /^https?:\/\//.test(t.url)) {
        browser.tabs.sendMessage(t.id, { type: 'BREAK_TRIGGERED', pendingBreak }).catch(() => void 0);
      }
    }

    if (settings.notificationStyle === 'system') {
      const notificationOptions: Notifications.CreateNotificationOptions = {
        type: 'basic',
        iconUrl: (browser.runtime as any).getURL('/icon-128.png'),
        title: `Maria: Time for a ${breakType.label.toLowerCase()} break`,
        message: breakType.tagline,
        priority: 1
      };

      if ((import.meta as any).env?.FIREFOX) {
        browser.notifications.create(NOTIFICATION_ID, notificationOptions);
      } else {
        browser.notifications.create(NOTIFICATION_ID, {
          ...notificationOptions,
          buttons: [{ title: 'Start break' }],
          silent: !settings.soundEnabled
        } as Notifications.CreateNotificationOptions);
      }
    }
  }

  browser.notifications.onButtonClicked.addListener(
    async (notifId, buttonIndex) => {
      if (notifId !== NOTIFICATION_ID) return;
      browser.notifications.clear(NOTIFICATION_ID);
      if (buttonIndex === 0) {
        await focusActiveWindow();
      }
    }
  );

  browser.notifications.onClicked.addListener(async (notifId) => {
    if (notifId !== NOTIFICATION_ID) return;
    browser.notifications.clear(NOTIFICATION_ID);
    await focusActiveWindow();
  });

  async function focusActiveWindow(): Promise<void> {
    const current = await browser.windows.getLastFocused({
      windowTypes: ['normal']
    } as Windows.GetAllGetInfoType);
    if (current?.id !== undefined) {
      browser.windows.update(current.id, { focused: true });
    }
  }

  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      handleMessage(message as MariaMessage, sender).then((response) => {
        sendResponse(response);
      });
      return true;
    }
  );

  async function handleMessage(message: MariaMessage, sender: Runtime.MessageSender): Promise<any> {
    switch (message.type) {
      case 'COMPLETE_BREAK':
        await completeBreak();
        return;
      case 'DISMISS_BREAK':
        await setPendingBreak(null);
        await stopOffscreenAudio();
        browser.notifications.clear(NOTIFICATION_ID);
        return;
      case 'START_BREAK_NOW':
        await cancelScheduledBreak();
        await stopOffscreenAudio();
        await injectIntoExistingTabs();
        await new Promise((r) => setTimeout(r, 120));
        await triggerBreak({ bypassTypingCheck: true, force: true, breakTypeId: message.breakTypeId });
        setTimeout(async () => {
          const pending = await getPendingBreak();
          if (!pending) return;
          const tabs = await browser.tabs.query({});
          for (const t of tabs) {
            if (t.id !== undefined && t.url && /^https?:\/\//.test(t.url)) {
              browser.tabs.sendMessage(t.id, { type: 'BREAK_TRIGGERED', pendingBreak: pending }).catch(() => void 0);
            }
          }
        }, 280);
        return;
      case 'GET_CURRENT_TAB_ID':
        void ensureInitialized();
        return { tabId: sender.tab?.id };
      case 'USER_TYPING':
        if (sender.tab?.id !== undefined) {
          lastTypingByTab.set(sender.tab.id, Date.now());
        }
        return;
      case 'SETTINGS_UPDATED': {
        await clearStalePendingBreak();
        const settings = await getSettings();
        const pending = await getPendingBreak();
        const dueSince = await getBreakDueSince();
        if (!settings.enabled || settings.enabledBreakTypes.length === 0) {
          await cancelScheduledBreak();
        } else if (!pending && dueSince === null) {
          const nextType = await peekNextBreakTypeId();
          await setNextBreakTypeId(nextType);
          await scheduleNextBreak(getIntervalSeconds(settings, nextType));
        }
        return;
      }
      case 'TOGGLE_ENABLED': {
        await updateSettings({ enabled: message.enabled });
        if (message.enabled) {
          const settings = await getSettings();
          if (settings.enabledBreakTypes.length > 0) {
            const nextType = await peekNextBreakTypeId();
            await setNextBreakTypeId(nextType);
            await scheduleNextBreak(getIntervalSeconds(settings, nextType));
          } else {
            await cancelScheduledBreak();
          }
        } else {
          await cancelScheduledBreak();
          await setPendingBreak(null);
          await stopOffscreenAudio();
          browser.notifications.clear(NOTIFICATION_ID);
        }
        return;
      }
    }
  }

  let fallbackAudio: HTMLAudioElement | null = null;

  async function playOffscreenAudio(src: string = 'videos/maria-drink-water.mp3'): Promise<void> {
    const settings = await getSettings();
    if (!settings.soundEnabled) return;
    try {
      const offscreen = (chrome as any).offscreen;
      if (offscreen) {
        const hasDoc = await offscreen.hasDocument?.();
        if (!hasDoc) {
          await offscreen.createDocument({
            url: 'offscreen.html',
            reasons: [offscreen.Reason.AUDIO_PLAYBACK],
            justification: 'Play mindful break audio'
          });
        }
        await browser.runtime.sendMessage({ type: 'PLAY_AUDIO', src });
        return;
      }
    } catch (err) {
      console.warn('Offscreen audio playback notice:', err);
    }
    // Firefox fallback: play audio directly in background
    try {
      if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio = null; }
      const audioUrl = (browser.runtime as any).getURL(src);
      fallbackAudio = new Audio(audioUrl);
      fallbackAudio.volume = 1;
      await fallbackAudio.play();
      fallbackAudio.onended = () => { fallbackAudio = null; };
    } catch (err) {
      console.warn('Fallback audio playback notice:', err);
    }
  }

  async function stopOffscreenAudio(): Promise<void> {
    try {
      await browser.runtime.sendMessage({ type: 'STOP_AUDIO' });
    } catch {}
    if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio = null; }
  }

  async function completeBreak(): Promise<void> {
    const pending = await getPendingBreak();
    await setPendingBreak(null);
    await stopOffscreenAudio();
    browser.notifications.clear(NOTIFICATION_ID);

    if (pending) {
      await recordBreakCompleted(pending.triggeredAt);
    }

    const settings = await getSettings();
    if (settings.enabled && settings.enabledBreakTypes.length > 0) {
      const nextType = await peekNextBreakTypeId();
      await setNextBreakTypeId(nextType);
      await scheduleNextBreak(getIntervalSeconds(settings, nextType));
    }
  }

  void ensureInitialized();
});
