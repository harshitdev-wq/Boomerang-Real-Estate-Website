/**
 * Server-side search pipeline: filtering → relevance scoring → sorting → pagination.
 * Runs over the full dataset in the data layer — the client only ever receives the
 * current page (plus pagination metadata). Queries are validated before this runs
 * (validateSearchParams → 400 on bad input).
 */
import type { Paginated, Property, SearchParams } from "@/lib/types";

function relevance(q: string, p: Property): number {
  const needle = q.toLowerCase();
  const fields: [string, number][] = [
    [p.title, 3],
    [p.city, 2],
    [p.description, 1],
    [p.address, 1],
    [p.region, 1],
    [p.type, 1],
  ];
  let score = 0;
  for (const [text, weight] of fields) {
    const t = text.toLowerCase();
    if (t.includes(needle)) score += weight * (t.startsWith(needle) ? 1.5 : 1);
  }
  return score;
}

export function runSearch(all: Property[], params: SearchParams): Paginated<Property> {
  let items = all.filter((p) => p.status === "published");

  const q = params.q?.trim().toLowerCase();
  if (q) {
    const scored = items
      .map((p) => ({ p, s: relevance(q, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    items = scored.map((x) => x.p);
  }

  if (params.city) {
    const c = params.city.toLowerCase();
    items = items.filter((p) => p.city.toLowerCase().includes(c));
  }
  if (params.type) items = items.filter((p) => p.type === params.type);
  if (params.listingType) items = items.filter((p) => p.listingType === params.listingType);
  if (params.priceMin != null) items = items.filter((p) => p.price >= params.priceMin!);
  if (params.priceMax != null) items = items.filter((p) => p.price <= params.priceMax!);
  if (params.beds != null) items = items.filter((p) => p.bedrooms >= params.beds!);
  if (params.baths != null) items = items.filter((p) => p.bathrooms >= params.baths!);
  if (params.areaMin != null) items = items.filter((p) => p.area >= params.areaMin!);
  if (params.areaMax != null) items = items.filter((p) => p.area <= params.areaMax!);
  if (params.furnishing) items = items.filter((p) => p.furnishing === params.furnishing);
  if (params.amenities.length > 0)
    items = items.filter((p) => params.amenities.every((a) => p.amenities.includes(a)));
  if (params.parkingOnly) items = items.filter((p) => p.parking > 0);
  if (params.bounds) {
    const b = params.bounds;
    items = items.filter(
      (p) =>
        p.displayLat >= b.s && p.displayLat <= b.n && p.displayLng >= b.w && p.displayLng <= b.e,
    );
  }

  switch (params.sort) {
    case "price_asc":
      items = [...items].sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      items = [...items].sort((a, b) => b.price - a.price);
      break;
    case "newest":
      items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "oldest":
      items = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    default:
      // relevance: order already set by keyword scoring; without a query,
      // newest-first is the sensible default.
      if (!q) items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.limit;
  return { page, limit: params.limit, total, total_pages: totalPages, items: items.slice(start, start + params.limit) };
}
