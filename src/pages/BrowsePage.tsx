import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { MapBounds, Paginated, Property, SearchParams, SortKey } from "@/lib/types";
import { AMENITIES, EMPTY_SEARCH, SORT_OPTIONS } from "@/lib/types";
import { api } from "@/services/api";
import { useHashRoute } from "@/lib/router";
import PropertyCard from "@/components/PropertyCard";
import MapView from "@/components/MapView";
import { Filter, Grid, Loader, MapIcon, Search, X } from "@/components/Icons";

const CITIES = ["Austin", "Portland", "Denver", "Chicago", "Seattle", "Asheville"];
const TYPES = ["house", "apartment", "condo", "townhouse", "loft", "studio", "villa", "duplex"];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#191919] placeholder:text-[#191919]/35 outline-none transition-colors focus:border-[#191919]";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40 disabled:opacity-30"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
            p === page ? "bg-[#191919] text-white" : "border border-gray-200 text-[#191919]/70 hover:border-[#191919]/40"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40 disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm">
      <div className="aspect-[4/3] animate-pulse rounded-t-xl bg-[#F4F3F3]" />
      <div className="space-y-2 p-4">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#F4F3F3]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#F4F3F3]" />
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const route = useHashRoute();
  const [filters, setFilters] = useState<SearchParams>(() => {
    const q = route.query;
    return {
      ...EMPTY_SEARCH,
      q: q.get("q") ?? "",
      city: q.get("city") ?? "",
      type: (q.get("type") as SearchParams["type"]) ?? "",
      listingType: (q.get("listingType") as SearchParams["listingType"]) ?? "",
    };
  });
  const [view, setView] = useState<"grid" | "map">(() => (route.query.get("view") === "map" ? "map" : "grid"));
  const [data, setData] = useState<Paginated<Property> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);

  const debounced = useDebounced(filters, 350);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.properties.search(debounced).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) setData(res.data);
      else setError(res.error.message);
    });
    return () => {
      alive = false;
    };
  }, [debounced]);

  const patch = (p: Partial<SearchParams>) => setFilters((f) => ({ ...f, ...p, page: 1 }));
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.q) n++;
    if (filters.city) n++;
    if (filters.type) n++;
    if (filters.listingType) n++;
    if (filters.priceMin != null || filters.priceMax != null) n++;
    if (filters.beds != null || filters.baths != null) n++;
    if (filters.areaMin != null || filters.areaMax != null) n++;
    if (filters.furnishing) n++;
    if (filters.amenities.length) n++;
    if (filters.parkingOnly) n++;
    if (filters.bounds) n++;
    return n;
  }, [filters]);

  const clearAll = () => setFilters({ ...EMPTY_SEARCH, limit: filters.limit });

  const toggleAmenity = (a: string) =>
    setFilters((f) => ({
      ...f,
      page: 1,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">City</label>
        <select className={inputCls} value={filters.city} onChange={(e) => patch({ city: e.target.value })}>
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Deal type</label>
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#F4F3F3] p-1">
          {(["", "sale", "rent", "lease"] as const).map((t) => (
            <button
              key={t}
              onClick={() => patch({ listingType: t })}
              className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                filters.listingType === t ? "bg-white text-[#191919] shadow-sm" : "text-[#191919]/50"
              }`}
            >
              {t || "All"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Property type</label>
        <select className={inputCls} value={filters.type} onChange={(e) => patch({ type: e.target.value as SearchParams["type"] })}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Min price</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            placeholder="Any"
            value={filters.priceMin ?? ""}
            onChange={(e) => patch({ priceMin: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Max price</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            placeholder="Any"
            value={filters.priceMax ?? ""}
            onChange={(e) => patch({ priceMax: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Bedrooms</label>
        <div className="flex gap-1">
          {[null, 1, 2, 3, 4].map((b) => (
            <button
              key={String(b)}
              onClick={() => patch({ beds: b })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                filters.beds === b ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"
              }`}
            >
              {b === null ? "Any" : `${b}+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Bathrooms</label>
        <div className="flex gap-1">
          {[null, 1, 2, 3].map((b) => (
            <button
              key={String(b)}
              onClick={() => patch({ baths: b })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                filters.baths === b ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"
              }`}
            >
              {b === null ? "Any" : `${b}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Min area</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            placeholder="Any"
            value={filters.areaMin ?? ""}
            onChange={(e) => patch({ areaMin: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Max area</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            placeholder="Any"
            value={filters.areaMax ?? ""}
            onChange={(e) => patch({ areaMax: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Furnishing</label>
        <select
          className={inputCls}
          value={filters.furnishing}
          onChange={(e) => patch({ furnishing: e.target.value as SearchParams["furnishing"] })}
        >
          <option value="">Any</option>
          <option value="furnished">Furnished</option>
          <option value="semi-furnished">Semi-furnished</option>
          <option value="unfurnished">Unfurnished</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#191919]/70">
        <input
          type="checkbox"
          checked={filters.parkingOnly}
          onChange={(e) => patch({ parkingOnly: e.target.checked })}
          className="h-4 w-4 accent-[#191919]"
        />
        Parking included
      </label>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#191919]/60">Amenities</label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map((a) => (
            <button
              key={a}
              onClick={() => toggleAmenity(a)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 ${
                filters.amenities.includes(a)
                  ? "border-[#191919] bg-[#191919] text-white"
                  : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-[#191919]/60 transition-colors hover:border-[#191919]/40"
        >
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );

  const results = data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-14 pt-24 sm:pt-28 pb-16">
      {/* Header row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">Browse homes</h1>
          <p className="mt-1 text-sm text-[#191919]/50">
            {loading ? "Searching…" : data ? `${data.total.toLocaleString("en-US")} ${data.total === 1 ? "home" : "homes"} found` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/35" />
            <input
              className={`${inputCls} pl-9 pr-8 sm:w-64`}
              placeholder="Search homes, cities…"
              value={filters.q}
              onChange={(e) => patch({ q: e.target.value })}
            />
            {filters.q && (
              <button
                onClick={() => patch({ q: "" })}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#191919]/40 hover:text-[#191919]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            className={inputCls}
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as SortKey })}
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg bg-[#F4F3F3] p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "grid" ? "bg-white shadow-sm text-[#191919]" : "text-[#191919]/50"}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("map")}
              aria-label="Map view"
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${view === "map" ? "bg-white shadow-sm text-[#191919]" : "text-[#191919]/50"}`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex lg:gap-8">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {filterPanel}
          </div>
        </aside>

        {/* Mobile filter toggle (raised above the compare drawer) */}
        <div className="fixed bottom-20 left-4 z-40 lg:hidden">
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#191919] px-4 py-2.5 text-xs font-semibold text-white shadow-2xl"
          >
            <Filter className="h-4 w-4" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
        {filtersOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setFiltersOpen(false)}>
            <div className="absolute inset-0 bg-[#191919]/40" />
            <div
              className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#191919]">Filters</p>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="p-1 text-[#191919]/50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterPanel}
              <button
                onClick={() => setFiltersOpen(false)}
                className="mt-5 w-full rounded-lg bg-[#191919] px-4 py-3 text-sm font-medium text-white"
              >
                Show results
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="min-w-0 flex-1">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                onClick={() => setFilters((f) => ({ ...f }))}
                className="mt-3 rounded-lg bg-[#191919] px-4 py-2 text-xs font-medium text-white"
              >
                Retry
              </button>
            </div>
          )}

          {!error && view === "map" && (
            <div className="relative h-[60vh] overflow-hidden rounded-xl border border-gray-200 lg:h-[calc(100vh-11rem)]">
              <MapView
                properties={results}
                className="h-full"
                onBoundsChange={(b) => {
                  if (b) setPendingBounds(b);
                }}
              />
              {pendingBounds && (
                <button
                  onClick={() => patch({ bounds: pendingBounds })}
                  className="absolute left-1/2 top-3 z-[500] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#191919] px-4 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-[#191919]/90"
                >
                  Search this area
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              {filters.bounds && (
                <button
                  onClick={() => patch({ bounds: null })}
                  className="absolute right-3 top-3 z-[500] rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-[#191919]/70 shadow-md transition-colors hover:text-[#191919]"
                >
                  Clear area search
                </button>
              )}
            </div>
          )}

          {!error && view === "grid" && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
                : results.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
              <p className="font-serif text-xl text-[#191919]">No homes match those filters</p>
              <p className="mt-2 text-sm text-[#191919]/50">Try widening the price range or clearing some filters.</p>
              <button
                onClick={clearAll}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
              >
                Clear all filters
              </button>
            </div>
          )}

          {!error && loading && view === "map" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
              <Loader className="h-5 w-5" />
            </div>
          )}

          {!error && view === "grid" && data && !loading && (
            <div className="mt-10">
              <Pagination page={data.page} totalPages={data.total_pages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
            </div>
          )}

          {/* Side list under the map on small screens */}
          {!error && view === "map" && (
            <div className="mt-5">
              <p className="mb-3 text-xs text-[#191919]/50">
                Showing {results.length} of {data?.total ?? 0} — pan and search areas of the map above.
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
