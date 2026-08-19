/**
 * 3D / virtual-tour experiences.
 * - has360: built-in WebGL equirectangular panorama viewer (lazy — the
 *   texture is only created after the user taps "Start 360° tour").
 * - tourUrl: external virtual-tour URL (Matterport/Kuula style) embedded
 *   in an iframe, loaded on demand.
 * Any failure (no WebGL, CORS-blocked image, unreachable URL) falls back to
 * the normal photo gallery — a broken viewer is never shown.
 */
import { useEffect, useRef, useState } from "react";
import { Alert, ExternalLink, Loader, X } from "./Icons";

const VERT = `
attribute vec2 aPos;
varying vec3 vDir;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
  vDir = vec3(aPos.x * 1.6, aPos.y, -1.0);
}`;

const FRAG = `
precision mediump float;
varying vec3 vDir;
uniform sampler2D uTex;
uniform mat3 uView;
const float PI = 3.14159265358979;
void main() {
  vec3 d = normalize(uView * vDir);
  float phi = atan(d.z, d.x);
  float theta = acos(clamp(d.y, -1.0, 1.0));
  vec2 uv = vec2(0.5 + phi / (2.0 * PI), theta / PI);
  gl_FragColor = texture2D(uTex, uv);
}`;

function createShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("shader compile");
  return sh;
}

function PanoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported" | "error">("loading");
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
    } catch {
      gl = null;
    }
    if (!gl) {
      setStatus("unsupported");
      return;
    }
    let raf = 0;
    let disposed = false;

    try {
      const program = gl.createProgram();
      if (!program) throw new Error("program");
      const vs = createShader(gl, gl.VERTEX_SHADER, VERT);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(program);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const uView = gl.getUniformLocation(program, "uView");
      const uTex = gl.getUniformLocation(program, "uTex");

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      };
      img.onerror = () => setStatus("error");
      img.src = src;

      let yaw = 0;
      let pitch = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let vx = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.min(2048, Math.max(2, Math.round(canvas.clientWidth * dpr)));
        canvas.height = Math.min(2048, Math.max(2, Math.round(canvas.clientHeight * dpr)));
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      const onDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        vx = dx * 0.005;
        yaw += dx * 0.005;
        pitch = Math.max(-1.45, Math.min(1.45, pitch + dy * 0.005));
      };
      const onUp = () => {
        dragging = false;
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const frame = () => {
        if (disposed) return;
        if (!dragging) {
          yaw += vx;
          vx *= 0.94;
        }
        const cp = Math.cos(pitch);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const sp = Math.sin(pitch);
        // rotation: first yaw around Y, then pitch around X
        const m = [
          cy, 0, sy,
          sy * sp, cp, -cy * sp,
          -sy * cp, sp, cy * cp,
        ];
        gl.clearColor(0.95, 0.95, 0.95, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1i(uTex, 0);
        gl.uniformMatrix3fv(uView, false, m);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        if (tex) gl.deleteTexture(tex);
        if (buf) gl.deleteBuffer(buf);
        if (program) gl.deleteProgram(program);
      };
    } catch {
      setStatus("error");
    }
  }, [src]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#191919]">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">360° tour — drag to look around</span>
        <button
          onClick={onClose}
          aria-label="Close tour"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1">
        {status === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-white/80">
            <Loader className="h-5 w-5 border-white/30 border-t-white" /> Preparing 360° view…
          </div>
        )}
        {(status === "unsupported" || status === "error") && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Alert className="h-6 w-6 text-white/50" />
            <p className="text-sm text-white/80">
              {status === "unsupported"
                ? "This device doesn't support WebGL, so the 360° tour can't run."
                : "The 360° panorama failed to load."}
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#191919] transition-colors hover:bg-white/90"
            >
              Back to photos
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="h-full w-full touch-none" style={{ display: status === "ready" ? "block" : "none" }} />
      </div>
    </div>
  );
}

export default function VirtualTour({
  has360,
  panoSrc,
  tourUrl,
}: {
  has360?: boolean;
  panoSrc?: string;
  tourUrl?: string;
}) {
  const [mode, setMode] = useState<"pano" | "external" | null>(null);
  const [loading, setLoading] = useState(false);
  const [extError, setExtError] = useState(false);

  if (!has360 && !tourUrl) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-[#F4F3F3] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-xl text-[#191919]">Step inside before you visit</h3>
          <p className="mt-1 text-sm text-[#191919]/60 max-w-md">
            Explore this home in 3D right here — no headset needed. Works with mouse and touch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {has360 && (
            <button
              onClick={() => {
                setLoading(true);
                setMode("pano");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#191919] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90"
            >
              Start 360° tour
            </button>
          )}
          {tourUrl && (
            <button
              onClick={() => {
                setLoading(true);
                setMode("external");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#191919]/20 bg-white px-4 py-2.5 text-sm font-medium text-[#191919] transition-colors duration-200 hover:bg-[#F4F3F3]"
            >
              Open virtual tour
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {mode === "pano" && has360 && panoSrc && <PanoViewer src={panoSrc} onClose={() => setMode(null)} />}

      {mode === "external" && tourUrl && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#191919]">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">Virtual tour</span>
            <button
              onClick={() => {
                setMode(null);
                setExtError(false);
              }}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex-1 bg-[#F4F3F3]">
            {loading && !extError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2">
                <Loader /> Loading virtual tour…
              </div>
            )}
            {extError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Alert className="h-6 w-6 text-[#191919]/40" />
                <p className="text-sm text-[#191919]/70">
                  The external virtual tour couldn't be loaded. Browse the photos instead.
                </p>
                <button
                  onClick={() => {
                    setMode(null);
                    setExtError(false);
                  }}
                  className="rounded-lg bg-[#191919] px-4 py-2 text-sm font-medium text-white"
                >
                  Back to photos
                </button>
              </div>
            )}
            <iframe
              src={tourUrl}
              title="Virtual tour"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="h-full w-full"
              style={{ display: extError ? "none" : "block" }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setExtError(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
