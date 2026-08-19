import { useCallback, useEffect, useState } from "react";
import type { MediaItem } from "@/lib/types";
import { ChevronLeft, ChevronRight, Loader, X } from "./Icons";

interface GalleryProps {
  items: MediaItem[];
  title: string;
}

export default function PhotoGallery({ items, title }: GalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const current = items[active];

  const next = useCallback(() => {
    setActive((a) => (a + 1) % Math.max(1, items.length));
    setLoading(true);
  }, [items.length]);

  const prev = useCallback(() => {
    setActive((a) => (a - 1 + Math.max(1, items.length)) % Math.max(1, items.length));
    setLoading(true);
  }, [items.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, next, prev]);

  if (items.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#F4F3F3] text-sm text-[#191919]/30">
        No photos available
      </div>
    );
  }

  const markError = (i: number) => setImgErrors((prev) => new Set(prev).add(i));
  const renderItem = (item: MediaItem, i: number, className: string) => {
    if (imgErrors.has(i))
      return (
        <div className={`flex items-center justify-center bg-[#F4F3F3] text-xs text-[#191919]/30 ${className}`}>
          Image unavailable
        </div>
      );
    if (item.kind === "video")
      return (
        <video
          key={item.id}
          src={item.url}
          controls
          preload="none"
          className={className}
          onError={() => markError(i)}
        >
          Your browser doesn't support video playback.
        </video>
      );
    return (
      <img
        key={item.id}
        src={item.url}
        alt={item.alt || title}
        loading={i === 0 ? "eager" : "lazy"}
        className={className}
        onError={() => markError(i)}
      />
    );
  };

  return (
    <div className="min-w-0">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#F4F3F3]">
        {loading && items[active].kind === "image" && !imgErrors.has(active) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader className="h-5 w-5" />
          </div>
        )}
        {renderItem(
          current,
          active,
          "h-full w-full object-cover cursor-zoom-in",
        )}
        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#191919] shadow-sm transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#191919] shadow-sm transition-colors hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-2 right-2 z-20 rounded-full bg-[#191919]/80 px-2 py-0.5 text-[11px] font-medium text-white">
              {active + 1} / {items.length}
            </span>
          </>
        )}
        <button
          onClick={() => setLightbox(true)}
          className="absolute bottom-2 left-2 z-20 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#191919] shadow-sm transition-colors hover:bg-white"
        >
          Expand
        </button>
      </div>

      {items.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => {
                setActive(i);
                setLoading(true);
              }}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors duration-200 ${
                i === active ? "border-[#191919]" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              {item.kind === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-[#F4F3F3] text-[10px] font-semibold text-[#191919]/50">
                  Video
                </div>
              ) : (
                <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#191919]/95 p-4">
          <button
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex w-full max-w-5xl items-center justify-center">
            {renderItem(current, active, "max-h-[78vh] max-w-full object-contain")}
          </div>
          {items.length > 1 && (
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={prev}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-white/70">
                {active + 1} / {items.length}
              </span>
              <button
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
