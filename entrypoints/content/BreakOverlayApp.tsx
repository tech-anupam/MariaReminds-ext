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
    if (!isActive) return;

    const pausedHostMedia: HTMLMediaElement[] = [];

    const pauseExistingMedia = () => {
      const mediaList = Array.from(
        document.querySelectorAll<HTMLMediaElement>("video, audio"),
      );
      for (const media of mediaList) {
        if (media.closest?.("[data-wxt-shadow-root]")) continue;
        if (!media.paused) {
          try {
            media.pause();
            pausedHostMedia.push(media);
          } catch {}
        }
      }
    };

    pauseExistingMedia();

    const blockPlayListener = (e: Event) => {
      const target = e.target as HTMLMediaElement | null;
      if (
        target &&
        (target.tagName === "VIDEO" || target.tagName === "AUDIO") &&
        !target.closest?.("[data-wxt-shadow-root]")
      ) {
        try {
          target.pause();
        } catch {}
      }
    };

    window.addEventListener("play", blockPlayListener, true);

    return () => {
      window.removeEventListener("play", blockPlayListener, true);
      for (const media of pausedHostMedia) {
        try {
          media.play().catch(() => void 0);
        } catch {}
      }
    };
  }, [isActive]);

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

  const getElapsedSeconds = useCallback(() => {
    return Math.max(0, (Date.now() - triggeredAt) / 1000);
  }, [triggeredAt]);

  const syncPlayback = useCallback(
    (forceSeek = false) => {
      const video = videoRef.current;
      if (!video || ctx.isInvalid || isCompletingRef.current) return;

      const elapsed = getElapsedSeconds();

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
        if (forceSeek || Math.abs(video.currentTime - elapsed) > 1.8) {
          try {
            video.currentTime = elapsed;
          } catch {}
        }

        video.muted = true;
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch(() => void 0);
        }
      } else {
        video.pause();
      }
    },
    [complete, ctx, getElapsedSeconds],
  );

  useEffect(() => {
    syncPlayback(true);
  }, [syncPlayback]);

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

  useEffect(() => {
    const timeoutDuration = (breakType.suggestedSeconds + 4) * 1000;
    const id = ctx.setTimeout(() => complete(), timeoutDuration);
    return () => window.clearTimeout(id);
  }, [breakType.suggestedSeconds, complete, ctx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [complete]);

  return (
    <div
      className="maria-overlay-root fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 backdrop-blur-md transition-all select-none cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label="Maria break"
      onClick={complete}
    >
      <div
        className="relative flex items-center justify-center w-[min(1280px,92vw)] max-h-[88vh] aspect-video"
        onClick={complete}
      >
        {videoFailed ? (
          <div className="h-full w-full bg-slate-900/60 rounded-2xl border border-white/5" />
        ) : (
          <TransparentCanvasVideo
            videoSrc={videoSrc}
            videoRef={videoRef}
            onLoadedMetadata={() => syncPlayback(true)}
            onCanPlay={() => syncPlayback(true)}
            onEnded={complete}
            onError={() => setVideoFailed(true)}
          />
        )}
      </div>
    </div>
  );
}

function TransparentCanvasVideo({
  videoSrc,
  videoRef,
  onLoadedMetadata,
  onCanPlay,
  onEnded,
  onError,
}: {
  videoSrc: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onLoadedMetadata: () => void;
  onCanPlay: () => void;
  onEnded: () => void;
  onError: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let uvBuffer: WebGLBuffer | null = null;
    let callbackId: number | null = null;
    let animId: number | null = null;
    let isDisposed = false;

    try {
      gl =
        canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) ||
        (canvas.getContext("experimental-webgl", {
          alpha: true,
          premultipliedAlpha: false,
        }) as WebGLRenderingContext | null);
    } catch {}

    if (gl) {
      const vsSource = `
        attribute vec2 a_pos;
        attribute vec2 a_uv;
        varying vec2 v_uv;
        void main() {
          gl_Position = vec4(a_pos, 0.0, 1.0);
          v_uv = a_uv;
        }
      `;

      const fsSource = `
        precision mediump float;
        uniform sampler2D u_tex;
        varying vec2 v_uv;
        void main() {
          vec4 color = texture2D(u_tex, v_uv);
          float maxVal = max(color.r, max(color.g, color.b));
          float alpha = smoothstep(0.035, 0.085, maxVal);
          if (alpha <= 0.002) {
            discard;
          }
          gl_FragColor = vec4(color.rgb, color.a * alpha);
        }
      `;

      const createShader = (type: number, src: string) => {
        const shader = gl!.createShader(type);
        if (!shader) return null;
        gl!.shaderSource(shader, src);
        gl!.compileShader(shader);
        return shader;
      };

      const vs = createShader(gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSource);

      if (vs && fs) {
        program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          gl.useProgram(program);

          positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW,
          );

          const aPos = gl.getAttribLocation(program, "a_pos");
          gl.enableVertexAttribArray(aPos);
          gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

          uvBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
            gl.STATIC_DRAW,
          );

          const aUv = gl.getAttribLocation(program, "a_uv");
          gl.enableVertexAttribArray(aUv);
          gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

          texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

          gl.viewport(0, 0, canvas.width, canvas.height);
        }
      }
    }

    const renderLoop = () => {
      if (isDisposed) return;

      if (video.readyState >= 2) {
        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
        }

        if (gl && program && texture) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            video,
          );
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        } else {
          const ctx2d = canvas.getContext("2d");
          if (ctx2d) {
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }

      if ("requestVideoFrameCallback" in video) {
        callbackId = (video as any).requestVideoFrameCallback(renderLoop);
      } else {
        animId = requestAnimationFrame(renderLoop);
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    canvas.addEventListener("webglcontextlost", onContextLost, false);

    renderLoop();

    return () => {
      isDisposed = true;
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      if (callbackId !== null && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(callbackId);
      }
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [videoRef]);

  return (
    <>
      <video
        ref={videoRef}
        src={videoSrc}
        className="hidden"
        autoPlay
        muted
        loop={false}
        playsInline
        disablePictureInPicture
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onEnded={onEnded}
        onError={onError}
        aria-hidden="true"
        tabIndex={-1}
      />
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="h-full w-full object-contain pointer-events-none drop-shadow-[0_25px_60px_rgba(0,0,0,0.55)]"
      />
    </>
  );
}
