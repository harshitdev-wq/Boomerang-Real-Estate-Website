import type { Property } from "./types";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
  );
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const priceFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatPrice(property: Pick<Property, "price" | "currency" | "listingType">): string {
  const base = priceFmt.format(property.price);
  return property.listingType === "sale" ? base : `${base} /mo`;
}

/** Compact price for map pins: $1.2M, $3.4K */
export function compactPrice(p: Pick<Property, "price" | "listingType">): string {
  const suffix = p.listingType === "sale" ? "" : "/mo";
  const price = p.price;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M${suffix}`;
  if (price >= 10_000) return `$${Math.round(price / 1000)}K${suffix}`;
  return `$${price.toLocaleString("en-US")}${suffix}`;
}

export function formatArea(p: Pick<Property, "area" | "areaUnit">): string {
  return `${p.area.toLocaleString("en-US")} ${p.areaUnit}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function toTitle(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function propertyLocation(p: Property): string {
  const cityLine = `${p.city}, ${p.region}`;
  return p.exactLocation ? `${p.address}, ${cityLine}` : `${cityLine} · approximate location`;
}

/** Full address is never exposed for approximate-location listings. */
export function displayAddress(p: Property): string {
  if (!p.exactLocation) return p.city + ", " + p.region;
  return p.address + ", " + p.city + ", " + p.region + " " + p.postalCode;
}
