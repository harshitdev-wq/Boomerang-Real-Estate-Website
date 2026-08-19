/**
 * Hero background: plays the CloudFront video once while capturing every
 * frame to offscreen canvases (requestVideoFrameCallback when available),
 * then switches to a canvas and loops the captured frames forward→reverse
 * ("boomerang") at 30fps — forever.
 *
 * Fallbacks: if frame capture is impossible (CORS, WebGL-less encoders,
 * short clip), the video falls back to a native loop.
 */
import { useEffect, useRef, useState } from "react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4";
const CAP_W = 960;
const FPS = 30;

interface Frame {
  bitmap?: ImageBitmap;
  canvas?: HTMLCanvasElement;
}

export default function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const display = canvasRef.current;
    if (!video || !display) return;

    const frames: Frame[] = [];
    const bitmaps: ImageBitmap[] = [];
    let cancelled = false;
    let captureDone = false;
    let nativeLoopActive = false;
    let kicked = false;
    let rvfcHandle = 0;
    let rafHandle = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let lastT = -1;
    let lastCaptureAt = 0;

    const cap = document.createElement("canvas");
    const capCtx = cap.getContext("2d");
    const dctx = display.getContext("2d");

    const startNativeLoop = () => {
      if (cancelled || nativeLoopActive) return;
      nativeLoopActive = true;
      try {
        video.loop = true;
        video.play().catch(() => undefined);
      } catch {
        /* ignore */
      }
    };

    // Raw-canvas fallback (used when CORS blocks bitmap encoding). Capped at
    // 120 small frames (~30MB) to keep memory bounded.
    const pushRaw = () => {
      if (!capCtx || frames.length >= 120) return;
      const c = document.createElement("canvas");
      const scale = Math.min(1, 400 / cap.width);
      c.width = Math.max(2, Math.round(cap.width * scale));
      c.height = Math.max(2, Math.round(cap.height * scale));
      c.getContext("2d")?.drawImage(cap, 0, 0, c.width, c.height);
      frames.push({ canvas: c });
    };

    const captureFrame = () => {
      if (cancelled || !capCtx || !video.videoWidth) return;
      const scale = Math.min(1, CAP_W / video.videoWidth);
      const w = Math.max(2, Math.round(video.videoWidth * scale));
      const h = Math.max(2, Math.round(video.videoHeight * scale));
      if (cap.width !== w || cap.height !== h) {
        cap.width = w;
        cap.height = h;
      }
      try {
        capCtx.drawImage(video, 0, 0, w, h);
      } catch {
        startNativeLoop();
        return;
      }
      try {
        cap.toBlob(async (blob) => {
          if (cancelled) return;
          if (blob && typeof createImageBitmap === "function") {
            try {
              const bmp = await createImageBitmap(blob);
              if (cancelled) {
                bmp.close();
                return;
              }
              bitmaps.push(bmp);
              frames.push({ bitmap: bmp });
            } catch {
              pushRaw();
            }
          } else {
            pushRaw();
          }
        }, "image/jpeg", 0.72);
      } catch {
        pushRaw();
      }
    };

    const startBoomerang = () => {
      if (cancelled || !dctx) return;
      display.width = cap.width;
      display.height = cap.height;
      setCanvasReady(true);
      let i = 0;
      let dir = 1;
      timer = setInterval(() => {
        const frame = frames[i];
        if (!frame || !dctx) return;
        dctx.clearRect(0, 0, display.width, display.height);
        if (frame.bitmap) dctx.drawImage(frame.bitmap, 0, 0);
        else if (frame.canvas) dctx.drawImage(frame.canvas, 0, 0);
        i += dir;
        if (i >= frames.length) {
          i = Math.max(0, frames.length - 2);
          dir = -1;
        } else if (i < 0) {
          i = 1;
          dir = 1;
        }
      }, Math.round(1000 / FPS));
    };

    const finalizeCapture = () => {
      if (cancelled || captureDone) return;
      captureDone = true;
      if (frames.length >= 2) startBoomerang();
      else startNativeLoop();
    };

    const onFrame = () => {
      if (cancelled) return;
      if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.05)) {
        finalizeCapture();
        return;
      }
      const t = video.currentTime;
      if (t !== lastT) {
        lastT = t;
        const now = performance.now();
        if (now - lastCaptureAt >= 1000 / FPS) {
          lastCaptureAt = now;
          captureFrame();
        }
      }
      schedule();
    };

    const schedule = () => {
      if (video.requestVideoFrameCallback) rvfcHandle = video.requestVideoFrameCallback(() => onFrame());
      else rafHandle = requestAnimationFrame(onFrame);
    };

    const kickOff = () => {
      if (cancelled || kicked) return;
      kicked = true;
      video.play().catch(() => undefined);
      schedule();
    };

    const onVideoError = () => {
      // CORS refused? Retry without the crossOrigin attribute — frames then
      // take the raw-canvas path (tainted canvases still render fine).
      try {
        video.crossOrigin = "";
        video.load();
        video.play().catch(() => undefined);
      } catch {
        /* ignore */
      }
    };

    video.addEventListener("ended", finalizeCapture);
    video.addEventListener("error", onVideoError);
    if (video.readyState >= 2) kickOff();
    else video.addEventListener("loadeddata", kickOff, { once: true });
    const onInteract = () => {
      if (!cancelled && video.paused && !captureDone && !nativeLoopActive) {
        video.play().catch(() => undefined);
      }
    };
    window.addEventListener("pointerdown", onInteract);

    return () => {
      cancelled = true;
      video.removeEventListener("ended", finalizeCapture);
      video.removeEventListener("error", onVideoError);
      window.removeEventListener("pointerdown", onInteract);
      if (video.cancelVideoFrameCallback && rvfcHandle) video.cancelVideoFrameCallback(rvfcHandle);
      cancelAnimationFrame(rafHandle);
      if (timer) clearInterval(timer);
      video.pause();
      for (const b of bitmaps) b.close();
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        autoPlay
        className={`h-full w-full object-cover object-top ${canvasReady ? "hidden" : "block"}`}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className={`h-full w-full object-cover object-top ${canvasReady ? "block" : "hidden"}`}
        aria-hidden="true"
      />
    </>
  );
}
