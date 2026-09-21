# Suzu

## Privacy

Suzu runs entirely on your device. There is no backend, no account system, no analytics, and no network requests. All settings, streak data, mood state, and optional custom clips are stored in `chrome.storage.local` inside your browser profile. The extension never sends your browsing data, break history, or uploaded media to any server.

## Overview

Suzu is an anime companion break reminder for Chrome, Edge, and Firefox. A toolbar popup controls reminders, sound, exclusions, streaks, and mood. During a break, a full-tab overlay plays a local video clip with optional audio on the focused tab only.

Credit: Suzu by Anupam Jha (tech-anupam)

## Features

- Five break types: breathing, posture, eye rest, hydration, stretch
- Typing pause detection before showing the overlay
- Domain exclusion list
- Popup settings: interval, sound, freeze on break, exclusions, streak and mood, custom webm upload
- Mood sets (neutral, happy, tired) driven by break streaks
- Cross-tab sync via shared storage timestamps

## Development

```bash
npm install
npm run dev
```

Load the unpacked extension from `.output/chrome-mv3` (or the Firefox build folder) in your browser developer tools.

Production build:

```bash
npm run build
```

## Asset workflow

Placeholder icons, webm clips, and mp3 audio are generated into `public/` by `npm run generate-assets` (also runs on postinstall).

Replace placeholders with production assets:

1. Lock one Suzu character reference image before generating clips.
2. Generate each break clip from that reference with image-to-video. Use one continuous idle motion per clip.
3. Clean loop boundaries in post so loops do not jump at the seam.
4. Strip baked-in audio from video files. Audio lives in `public/clips/audio/` separately.
5. Re-encode for exact seek:

```bash
ffmpeg -i in.mp4 -c:v libvpx-vp9 -g 1 -crf 30 -b:v 0 -an out.webm
```

6. Name clips `{breakType}-{mood}.webm` under `public/clips/` where break types are breathing, posture, eye, hydration, stretch and moods are neutral, happy, tired.
7. Name audio `{breakType}.mp3` under `public/clips/audio/`.

Custom uploads in the popup should follow the same webm re-encode rules for smooth seeking.

## Project structure

```
entrypoints/background.ts       alarms, tab focus, break state
entrypoints/content/            overlay video and audio sync
entrypoints/popup/              settings UI
components/                     shared UI pieces
lib/                            storage, alarms, exclusions, mood, typing, clips
types/                          shared TypeScript types
public/                         icons, clips, audio
scripts/generate-assets.mjs     placeholder asset generator
```

---

Suzu by Anupam Jha (tech-anupam)
