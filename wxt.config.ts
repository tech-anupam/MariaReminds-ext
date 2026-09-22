import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'MariaRemindsUs - Break Reminder',
    short_name: 'MariaRemindsUs',
    description:
      'MariaRemindsUs: Mindful water, gym, food, posture, and sleep break reminders with synchronized video across tabs. Works on Chrome, Edge, and Firefox.',
    version: '3.0.0',
    permissions: ['storage', 'alarms', 'notifications', 'scripting', 'tabs', 'offscreen'],
    host_permissions: ['<all_urls>'],
    action: {
      default_icon: {
        '16': 'icon-16.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png',
      },
      default_title: 'MariaRemindsUs - Break Reminder',
    },
    icons: {
      '16': 'icon-16.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png',
    },
    web_accessible_resources: [
      {
        resources: [
          'videos/*',
          'videos/*.webm',
          'videos/*.mp4',
          'videos/*.mp3',
          '*.mp4',
          '*.webm',
          '*.webp',
          '*.png',
          '*.mp3',
        ],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    build: {
      modulePreload: false,
    },
    optimizeDeps: {
      entries: ['entrypoints/**/*.html'],
    },
  }),
});
