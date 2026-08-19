import { useEffect, useState } from "react";
import type { Property } from "@/lib/types";
import { api } from "@/services/api";
import { navigate } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { X } from "./Icons";

export default function CompareDrawer() {
  const { compareIds, clearCompare } = useStore();
  const [items, setItems] = useState<Property[]>([]);

  useEffect(() => {
    if (compareIds.length === 0) {
      setItems([]);
      return;
    }
    let alive = true;
    api.properties.many(compareIds).then((res) => {
      if (alive && res.ok) setItems(res.data);
    });
    return () => {
      alive = false;
    };
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:w-auto">
      <div className="flex items-center gap-2 rounded-full bg-[#191919] py-2 pl-3 pr-2 text-white shadow-2xl">
        <div className="flex -space-x-2">
          {items.map((p) => (
            <img
              key={p.id}
              src={p.photos[0]?.url}
              alt=""
              className="h-7 w-7 rounded-full border border-white/30 object-cover"
            />
          ))}
          {compareIds.length > items.length &&
            Array.from({ length: compareIds.length - items.length }).map((_, i) => (
              <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/20 text-[10px]">
                …
              </span>
            ))}
        </div>
        <span className="hidden text-xs text-white/70 sm:block">{compareIds.length} selected</span>
        <button
          onClick={() => navigate("/compare")}
          disabled={items.length < 2}
          className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#191919] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Compare{items.length >= 2 ? ` (${items.length})` : ""}
        </button>
        <button
          onClick={clearCompare}
          aria-label="Clear comparison"
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
