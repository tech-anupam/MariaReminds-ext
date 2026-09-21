import { getBreakType, getVideoUrl } from "@/lib/breakTypes";
import { isUrlExcluded } from "@/lib/exclusions";
import { sendToBackground } from "@/lib/messaging";
import {
  getCustomVideo,
  getFullState,
  STORAGE_KEYS,
  subscribeToState,
} from "@/lib/storage";
import type { MariaState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import type { ContentScriptContext } from "wxt/client";

const MAX_BREAK_AGE_MS = 25_000;

export default function BreakOverlayApp({
  ctx,
  shadowHost,
  shadow,
}: {
  ctx: ContentScriptContext;
  shadowHost?: HTMLElement;
  shadow?: ShadowRoot;
}) {
  const [state, setState] = useState<MariaState | null>(null);
  const [customVideoDataUrl, setCustomVideoDataUrl] = useState<string | null>(
    null,
  );

  // Initial load and storage subscription
  useEffect(() => {
    if (ctx.isInvalid) return;
    getFullState().then((s) => {
      if (!ctx.isInvalid) setState(s);
    });
    const unsubscribe = subscribeToState((s) => {
      if (!ctx.isInvalid) setState(s);
    });
    const stopOnInvalidated = ctx.onInvalidated(unsubscribe);
    return () => {
      unsubscribe();
      stopOnInvalidated();
    };
  }, [ctx]);

  // Tab switching: sync full state when this tab becomes visible or focused
  useEffect(() => {
    if (ctx.isInvalid) return;

    const refreshState = () => {
      getFullState().then((s) => {
        if (!ctx.isInvalid) setState(s);
      });
    };

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshState();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
    };
  }, [ctx]);

  // Custom video storage listener
  useEffect(() => {
    if (ctx.isInvalid) return;
    getCustomVideo().then((url) => {
      if (!ctx.isInvalid) setCustomVideoDataUrl(url);
    });
    const onStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== "local") return;
      if (!(STORAGE_KEYS.customVideo in changes)) return;
      const next = changes[STORAGE_KEYS.customVideo]?.newValue;
      if (!ctx.isInvalid) {
        setCustomVideoDataUrl(typeof next === "string" ? next : null);
      }
    };
    browser.storage.onChanged.addListener(onStorageChange);
    const stopOnInvalidated = ctx.onInvalidated(() =>
      browser.storage.onChanged.removeListener(onStorageChange),
    );
    return () => {
      browser.storage.onChanged.removeListener(onStorageChange);
      stopOnInvalidated();
    };
  }, [ctx]);

  // Background broadcast listener
  useEffect(() => {
    if (ctx.isInvalid) return;
    const onMessage = (msg: any) => {
      if (msg?.type === "BREAK_TRIGGERED") {
        getFullState().then((s) => {
          if (!ctx.isInvalid) setState(s);
        });
      }
    };
    browser.runtime.onMessage.addListener(onMessage);
    const stopOnInvalidated = ctx.onInvalidated(() => {
      try {
        browser.runtime.onMessage.removeListener(onMessage);
      } catch {}
    });
    return () => {
      try {
        browser.runtime.onMessage.removeListener(onMessage);
      } catch {}
      stopOnInvalidated();
    };
  }, [ctx]);

  const pendingBreak = state?.pendingBreak;
  const breakType = pendingBreak
    ? getBreakType(pendingBreak.breakTypeId)
    : undefined;

  const isStaleOrInvalid =
    !!pendingBreak &&
    (!breakType || Date.now() - pendingBreak.triggeredAt > MAX_BREAK_AGE_MS);

  const isExcluded =
    !!state &&
    isUrlExcluded(window.location.href, state.settings.excludedSites);

  const isActive =
    !!pendingBreak && !!breakType && !isStaleOrInvalid && !isExcluded;

  // Manage Shadow Host visibility, pointer events, and document scroll locking
  useEffect(() => {
    const shadowHtml = (shadow || shadowHost?.shadowRoot)?.querySelector(
      "html",
    ) as HTMLElement | null;

    if (isActive) {
      if (shadowHost) {
        shadowHost.style.display = "block";
        shadowHost.style.pointerEvents = "auto";
      }
      if (shadowHtml) {
        shadowHtml.style.display = "block";
        shadowHtml.style.pointerEvents = "auto";
      }
      const prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";

      return () => {
        if (shadowHost) {
          shadowHost.style.display = "none";
          shadowHost.style.pointerEvents = "none";
        }
        if (shadowHtml) {
          shadowHtml.style.display = "none";
          shadowHtml.style.pointerEvents = "none";
        }
        document.documentElement.style.overflow = prevOverflow;
      };
    } else {
      if (shadowHost) {
        shadowHost.style.display = "none";
        shadowHost.style.pointerEvents = "none";
      }
      if (shadowHtml) {
        shadowHtml.style.display = "none";
        shadowHtml.style.pointerEvents = "none";
      }
      document.documentElement.style.overflow = "";
    }
  }, [isActive, shadowHost, shadow]);

  useEffect(() => {
    if (isStaleOrInvalid && !ctx.isInvalid) {
      sendToBackground({ type: "COMPLETE_BREAK" });
    }
  }, [isStaleOrInvalid, pendingBreak?.triggeredAt, ctx]);

  useEffect(() => {
    if (!pendingBreak) return;
    const exitIfFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => void 0);
      }
    };
    exitIfFullscreen();

    document.addEventListener("fullscreenchange", exitIfFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", exitIfFullscreen);
  }, [pendingBreak?.triggeredAt]);

  if (!isActive) return null;

  const useCustomVideo =
    state?.settings.customVideoEnabled === true && customVideoDataUrl != null;
  const videoSrc = useCustomVideo
    ? customVideoDataUrl!
    : getVideoUrl(breakType);

  return (
    <BreakVideo
      key={`${pendingBreak.triggeredAt}-${breakType.id}`}
      ctx={ctx}
      breakType={breakType}
      triggeredAt={pendingBreak.triggeredAt}
      videoSrc={videoSrc}
      useCustomVideo={useCustomVideo}
    />
  );
}

function BreakVideo({
  ctx,
  breakType,
  triggeredAt,
  videoSrc,
  useCustomVideo,
}: {
  ctx: ContentScriptContext;
  breakType: ReturnType<typeof getBreakType>;
  triggeredAt: number;
  videoSrc: string;
  useCustomVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const isCompletingRef = useRef(false);

  const complete = useCallback(() => {
    if (ctx.isInvalid || isCompletingRef.current) return;
    isCompletingRef.current = true;
    sendToBackground({ type: "COMPLETE_BREAK" });
  }, [ctx]);

  // Compute how many seconds have elapsed since the break started globally
  const getElapsedSeconds = useCallback(() => {
    return Math.max(0, (Date.now() - triggeredAt) / 1000);
  }, [triggeredAt]);

  // Sync playback time and play smoothly
  const syncPlayback = useCallback(
    (forceSeek = false) => {
      const video = videoRef.current;
      if (!video || ctx.isInvalid || isCompletingRef.current) return;

      const elapsed = getElapsedSeconds();

      // If video has already elapsed past its duration, complete break
      if (
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        elapsed >= video.duration
      ) {
        complete();
        return;
      }

      const isVisible = document.visibilityState === "visible";

      if (isVisible) {
        // Only seek on mount, metadata load, or when tab becomes visible after being hidden
        // Never seek during continuous playback to ensure 60fps smoothness with zero stutters
        if (forceSeek || Math.abs(video.currentTime - elapsed) > 1.8) {
          try {
            video.currentTime = elapsed;
          } catch {}
        }

        // Muted video in webpage avoids Chrome autoplay policy blocks
        // (audio is played seamlessly by the extension offscreen document)
        video.muted = true;
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch(() => void 0);
        }
      } else {
        // Background tab: pause to save 100% CPU/GPU decoding resources
        video.pause();
      }
    },
    [complete, ctx, getElapsedSeconds],
  );

  // Sync immediately on mount
  useEffect(() => {
    syncPlayback(true);
  }, [syncPlayback]);

  // Handle visibility changes across tabs
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncPlayback(true);
      } else {
        videoRef.current?.pause();
      }
    };
    const onFocus = () => {
      syncPlayback(true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncPlayback]);

  // Safety timeout: complete break after duration + 4s buffer
  useEffect(() => {
    const timeoutDuration = (breakType.suggestedSeconds + 4) * 1000;
    const id = ctx.setTimeout(() => complete(), timeoutDuration);
    return () => window.clearTimeout(id);
  }, [breakType.suggestedSeconds, complete, ctx]);

  // Escape key dismisses the break
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complete]);

  const sourceVideo = (
    <video
      ref={videoRef}
      src={videoSrc}
      className="h-full w-full object-contain pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      style={{
        display: videoFailed ? "none" : "block",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
      autoPlay
      muted
      loop={false}
      playsInline
      disablePictureInPicture
      onLoadedMetadata={() => syncPlayback(true)}
      onCanPlay={() => syncPlayback(true)}
      onEnded={complete}
      onError={() => setVideoFailed(true)}
      aria-hidden="true"
      tabIndex={-1}
    />
  );

  return (
    <div
      className="maria-overlay-root fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/75 backdrop-blur-md transition-all select-none cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label={
        useCustomVideo ? "Break time" : `Maria break: ${breakType.label}`
      }
      onClick={complete}
      style={{ willChange: "opacity" }}
    >
      {/* Centered Large 60 FPS Video Display (Pure video, no distracting text/options) */}
      <div
        className="relative flex items-center justify-center w-[min(1280px,92vw)] max-h-[88vh] aspect-video"
        onClick={() => {
          // Allow clicking video container to also dismiss
          complete();
        }}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      >
        {videoFailed ? (
          <div className="h-full w-full bg-slate-900/60 rounded-2xl border border-white/5" />
        ) : (
          sourceVideo
        )}
      </div>
    </div>
  );
}
