/**
 * Leaflet map with custom price-pin markers, lightweight grid clustering,
 * popup previews, approximate-location handling and graceful degradation
 * (no network → markers still render on a plain canvas with a notice).
 * Uses OpenStreetMap tiles — no API key required.
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/lib/types";
import { compactPrice, formatArea } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { Alert } from "./Icons";

interface MapViewProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  single?: boolean;
  onBoundsChange?: (bounds: { n: number; s: number; e: number; w: number } | null) => void;
  className?: string;
}

const CLUSTER_ZOOM = 12;

export default function MapView({ properties, center, zoom, single, onBoundsChange, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [failed, setFailed] = useState(false);
  const [tilesDegraded, setTilesDegraded] = useState(false);
  const onBoundsRef = useRef(onBoundsChange);
  onBoundsRef.current = onBoundsChange;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let map: L.Map;
    try {
      map = L.map(el, {
        zoomControl: false,
        scrollWheelZoom: !single,
        dragging: !single,
        touchZoom: !single,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      });
      tiles.on("tileerror", () => setTilesDegraded(true));
      tiles.addTo(map);
      const layerGroup = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layerGroup;
    } catch {
      setFailed(true);
      return;
    }

    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    map.on("moveend", () => {
      if (!onBoundsRef.current) return;
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const b = map.getBounds();
        onBoundsRef.current?.({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() });
      }, 500);
    });

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (moveTimer) clearTimeout(moveTimer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [single]);

  // Initial view
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (center) map.setView(center, zoom ?? 13);
    else if (properties.length === 1) {
      map.setView([properties[0].displayLat, properties[0].displayLng], zoom ?? 13);
    } else if (properties.length > 0) {
      const lats = properties.map((p) => p.displayLat);
      const lngs = properties.map((p) => p.displayLng);
      const b = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      );
      map.fitBounds(b.pad(0.15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.length > 0 ? "items" : "empty", center?.[0], center?.[1]]);

  // Markers with simple grid clustering below CLUSTER_ZOOM
  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;

    const render = () => {
      group.clearLayers();
      const zoom = map.getZoom();
      if (zoom < CLUSTER_ZOOM && !single && properties.length > 6) {
        const cell = 0.35;
        const clusters = new Map<string, { lat: number; lng: number; count: number; ids: string[] }>();
        for (const p of properties) {
          const key = `${Math.round(p.displayLat / cell)},${Math.round(p.displayLng / cell)}`;
          const c = clusters.get(key) ?? { lat: p.displayLat, lng: p.displayLng, count: 0, ids: [] };
          c.lat = (c.lat * c.count + p.displayLat) / (c.count + 1);
          c.lng = (c.lng * c.count + p.displayLng) / (c.count + 1);
          c.count += 1;
          c.ids.push(p.id);
          clusters.set(key, c);
        }
        for (const c of clusters.values()) {
          const icon = L.divIcon({
            className: "br-cluster",
            html: `<div class="c">${c.count}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });
          const marker = L.marker([c.lat, c.lng], { icon });
          marker.on("click", () => map.setView([c.lat, c.lng], Math.min(zoom + 2, 16)));
          group.addLayer(marker);
        }
        return;
      }

      for (const p of properties) {
        const icon = L.divIcon({
          className: "br-pin",
          html: `<div class="pin">${compactPrice(p)}</div>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([p.displayLat, p.displayLng], { icon });
        const approximate = !p.exactLocation
          ? `<div class="text-[11px] text-[#191919]/50 mt-1">Approximate location — exact address shared on inquiry</div>`
          : "";
        marker.bindPopup(
          `<div>
            <img src="${p.photos[0]?.url ?? ""}" alt="" class="h-28 w-full object-cover" onerror="this.style.display='none'" />
            <div class="p-3">
              <div class="text-[11px] font-semibold text-[#191919]">${compactPrice(p)}</div>
              <div class="text-[13px] font-medium text-[#191919] truncate mt-0.5">${p.title}</div>
              <div class="text-[11px] text-[#191919]/55">${p.city}, ${p.region} · ${p.bedrooms} bd · ${formatArea(p)}</div>
              ${approximate}
              <button data-open="${p.id}" class="mt-2 w-full rounded-md bg-[#191919] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#191919]/90">View listing</button>
            </div>
          </div>`,
          { className: "br-popup", closeButton: false, minWidth: 220 },
        );
        marker.on("popupopen", (e) => {
          const el = (e.popup as L.Popup).getElement();
          el?.querySelector("[data-open]")?.addEventListener("click", () => navigate(`/property/${p.id}`));
        });
        group.addLayer(marker);
      }
    };

    render();
    map.on("zoomend", render);
    return () => {
      map.off("zoomend", render);
    };
  }, [properties, single]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-[#F4F3F3] ${className ?? "h-64"}`}>
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <Alert className="h-5 w-5 text-[#191919]/40" />
          <p className="text-sm text-[#191919]/60">The map couldn't load right now.</p>
          <p className="text-xs text-[#191919]/40">Properties are still available in the list view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-0 ${className ?? "h-64"}`}>
      <div ref={containerRef} className="h-full w-full" />
      {tilesDegraded && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-[500] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] text-[#191919]/70 shadow-sm">
          Map tiles unavailable — markers shown at approximate positions
        </div>
      )}
    </div>
  );
}
