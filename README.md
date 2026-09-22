<div align="center">

<img src="public/icon-128.png" width="76" height="76" alt="MariaRemindsUs Icon" />

# MariaRemindsUs

**Cross-browser mindfulness extension delivering animated break cues across open tabs.**

<p>
  <a href="https://streamable.com/x6fy8m"><img src="https://img.shields.io/badge/DEMO-WATCH_VIDEO-E11D48?style=for-the-badge&logo=youtube&logoColor=white" alt="Demo Video" /></a>
  <a href="https://github.com/tech-anupam/MariaReminds-ext/releases"><img src="https://img.shields.io/github/v/release/tech-anupam/MariaReminds-ext?style=for-the-badge&color=2563EB&label=RELEASE" alt="Release" /></a>
  <a href="https://github.com/tech-anupam/MariaReminds-ext/stargazers"><img src="https://img.shields.io/github/stars/tech-anupam/MariaReminds-ext?style=for-the-badge&color=D97706&label=STARS" alt="Stars" /></a>
  <a href="https://github.com/tech-anupam/MariaReminds-ext/blob/main/package.json"><img src="https://img.shields.io/badge/MANIFEST-V3-111827?style=for-the-badge" alt="Manifest V3" /></a>
  <a href="https://discord.gg/MNCdjVcbtc"><img src="https://img.shields.io/badge/COMMUNITY-DISCORD-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Google_Chrome-Compatible-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome" />
  <img src="https://img.shields.io/badge/Microsoft_Edge-Compatible-0078D7?style=flat-square&logo=microsoftedge&logoColor=white" alt="Edge" />
  <img src="https://img.shields.io/badge/Mozilla_Firefox-Compatible-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox" />
</p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/WXT_Framework-0.19-7C3AED?style=flat-square" alt="WXT" />
  <img src="https://img.shields.io/badge/FFmpeg_Pipeline-VP9_60fps-007808?style=flat-square&logo=ffmpeg&logoColor=white" alt="FFmpeg" />
</p>

</div>

***

## Overview

MariaRemindsUs is an open-source productivity and wellness browser extension built on modern web extension standards (Manifest V3). It injects lightweight, hardware-accelerated 60 FPS alpha-transparent animations into your active browsing sessions when interval alarms fire, cueing ergonomic adjustments and hydration breaks without breaking your workflow.

---

## Supported Reminder Types

<table>
  <thead>
    <tr>
      <th align="center">Icon</th>
      <th align="left">Action Type</th>
      <th align="left">Format & Profile</th>
      <th align="left">Default Duration</th>
      <th align="left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="https://api.iconify.design/lucide:droplets.svg?color=%230284c7" width="24" height="24" alt="Water" /></td>
      <td><strong>Hydration</strong></td>
      <td>WebM (VP9, Alpha 60 FPS)</td>
      <td>8 seconds</td>
      <td>Hydration reminder prompting a water break.</td>
    </tr>
    <tr>
      <td align="center"><img src="https://api.iconify.design/lucide:dumbbell.svg?color=%23d97706" width="24" height="24" alt="Gym" /></td>
      <td><strong>Workout / Gym</strong></td>
      <td>WebM (VP9, Alpha 60 FPS)</td>
      <td>8 seconds</td>
      <td>Light physical activation and muscle stretch sequence.</td>
    </tr>
    <tr>
      <td align="center"><img src="https://api.iconify.design/lucide:utensils.svg?color=%23059669" width="24" height="24" alt="Food" /></td>
      <td><strong>Nutrition / Food</strong></td>
      <td>WebM (VP9, Alpha 60 FPS)</td>
      <td>8 seconds</td>
      <td>Nutritional pause cue to prevent prolonged fasting at desks.</td>
    </tr>
    <tr>
      <td align="center"><img src="https://api.iconify.design/lucide:activity.svg?color=%237c3aed" width="24" height="24" alt="Posture" /></td>
      <td><strong>Ergonomics / Posture</strong></td>
      <td>WebM (VP9, Dual-Key Alpha 60 FPS)</td>
      <td>8 seconds</td>
      <td>Spinal realignment and ergonomic posture correction check.</td>
    </tr>
    <tr>
      <td align="center"><img src="https://api.iconify.design/lucide:moon.svg?color=%234f46e5" width="24" height="24" alt="Sleep" /></td>
      <td><strong>Rest / Ocular Break</strong></td>
      <td>WebM (VP9, Alpha 60 FPS)</td>
      <td>8 seconds</td>
      <td>Ocular relaxation and brief mental reset sequence.</td>
    </tr>
  </tbody>
</table>

---

## Highlights

### Non-Disruptive Fullscreen Architecture
- **In-DOM Shadow Root Overlay**: Uses high z-index isolated Shadow DOM (`z-index: 2147483647`).
- **No Fullscreen Exit**: Operates within active fullscreen video elements (YouTube, Netflix, Twitch) without triggering `document.exitFullscreen()`.
- **Background Media Ducking**: Pauses background tab audio and HTML5 media elements during active breaks, then restores playback state on dismissal.

### Dual-Chroma Keying & Delogo Pipeline
- Custom FFmpeg spatial filtering pipeline removing solid backgrounds (both black `#000000` and white `#FFFFFF` regions) into `yuva420p` pixel format with alpha channel.
- Complete removal of AI watermark artifacts via localized spatial interpolation filters.
- Re-encoded at steady 60 frames per second using `libvpx-vp9` with low-latency decoding profiles.

### Browser Support
- **Chrome, Microsoft Edge & Chromium Engines**
- **Mozilla Firefox** 

---

## Technical Stack

| Layer | Component | Description |
|:---|:---|:---|
| **Core Framework** | WXT 0.19 + Vite | Next-generation WebExtension development framework |
| **User Interface** | React 18 + Tailwind CSS 3 | Modular component architecture with reactive state stores |
| **Type Safety** | TypeScript 5.6 | Strict type contracts across messaging and storage boundaries |
| **Media Pipeline** | FFmpeg 8.1 (VP9, Opus/MP3) | Hardware-accelerated alpha video decoding and multi-channel audio |
| **Isolation** | Web Components Shadow DOM | Stylesheet and DOM encapsulation protecting host webpage styles |

---

## Structure

```
RemindMeMaria-Ext/
├── entrypoints/
│   ├── background.ts          # Central background coordinator (alarms, events)
│   ├── content/
│   │   ├── index.tsx          # Shadow DOM injection layer
│   │   └── BreakOverlayApp.tsx # Alpha-blended overlay video component
│   ├── popup/
│   │   ├── main.tsx           # React mounting point
│   │   └── App.tsx            # Settings, interval selector, routine toggles
│   └── offscreen/             # Chromium offscreen audio executor
├── components/                # Reusable UI widgets and vector icons
├── lib/
│   ├── alarms.ts              # Browser alarm scheduling service
│   ├── audio.ts               # Web Audio API procedural chime synthesizers
│   ├── breakTypes.ts          # Break registry and metadata mapping
│   ├── exclusions.ts          # Domain exclusion and whitelist matching
│   ├── storage.ts             # Strongly-typed browser.storage layer
│   └── typing.ts              # Typing cadence detection engine
├── public/
│   └── videos/                # Processed 60 FPS alpha WebM assets and audio files
└── wxt.config.ts              # Multi-target build and manifest configuration
```

---

## Build & Installation

### Development Environment

```bash
# Clone the repository
git clone https://github.com/tech-anupam/MariaReminds-ext.git
cd MariaReminds-ext

# Install dependencies
npm install


### Production Build

```bash
# Compile production artifacts for Chrome / Edge
npm run build

# Compile production artifacts for Firefox
npm run build:firefox

# Generate distribution archive (.zip)
npm run zip
```

---

## Maintainer & Community

- **Developer**: [Anupam Jha](https://github.com/tech-anupam)
- **Portfolio**: [anupambuilds.store](https://anupambuilds.store)
- **Discord Community**: [discord.gg/MNCdjVcbtc](https://discord.gg/MNCdjVcbtc)
- **Repository**: [github.com/tech-anupam/MariaReminds-ext](https://github.com/tech-anupam/MariaReminds-ext)

---

<div align="center">
  <sub>Licensed under the MIT License. Copyright (c) Anupam Jha.</sub>
</div>
