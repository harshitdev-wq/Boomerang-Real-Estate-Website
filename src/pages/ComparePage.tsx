import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Property } from "@/lib/types";
import { api } from "@/services/api";
import { navigate } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { formatArea, formatPrice, toTitle } from "@/lib/utils";
import { Check, Heart, Loader, X } from "@/components/Icons";

export default function ComparePage() {
  const { compareIds, toggleCompare, favorites, toggleFavorite } = useStore();
  const [items, setItems] = useState<Property[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (compareIds.length === 0) {
      setItems([]);
      return;
    }
    api.properties.many(compareIds).then((res) => {
      if (alive && res.ok) setItems(res.data);
    });
    return () => {
      alive = false;
    };
  }, [compareIds]);

  if (items === null) {
    return (
      <div className="flex justify-center pt-48 pb-24">
        <Loader className="h-5 w-5" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <p className="font-serif text-3xl text-[#191919]">Compare homes side by side</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#191919]/55">
          Tap “Compare” on any listing to add it here — up to 4 homes at once. Add at least two to see
          the full breakdown.
        </p>
        <button
          onClick={() => navigate("/browse")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Find homes
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const rows: { label: string; value: (p: Property) => React.ReactNode }[] = [
    { label: "Price", value: (p) => <span className="font-semibold text-[#191919]">{formatPrice(p)}</span> },
    { label: "Listing type", value: (p) => toTitle(p.listingType) },
    { label: "Property type", value: (p) => toTitle(p.type) },
    { label: "Area", value: (p) => formatArea(p) },
    { label: "Bedrooms", value: (p) => `${p.bedrooms} bd` },
    { label: "Bathrooms", value: (p) => `${p.bathrooms} ba` },
    { label: "Parking", value: (p) => (p.parking === 0 ? "None" : String(p.parking)) },
    { label: "Furnishing", value: (p) => toTitle(p.furnishing) },
    { label: "Year built", value: (p) => String(p.yearBuilt) },
    { label: "Floor", value: (p) => (p.floor === 0 ? "Ground" : `${p.floor} / ${p.totalFloors}`) },
    { label: "Location", value: (p) => `${p.city}, ${p.region}` },
    { label: "Agent", value: (p) => p.agent.name },
  ];

  const topAmenities = Array.from(new Set(items.flatMap((p) => p.amenities))).slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 pt-24 sm:pt-28 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">Compare homes</h1>
          <p className="mt-1 text-sm text-[#191919]/50">
            {items.length} of 4 selected · scroll horizontally on small screens
          </p>
        </div>
        <button
          onClick={() => navigate("/browse")}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#191919]/15 px-4 py-2.5 text-sm font-medium text-[#191919] transition-colors hover:border-[#191919]/40 sm:self-auto"
        >
          Add more
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Table is contained in its own scroll area so the page never overflows */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-10 w-32 bg-white p-3 text-left align-bottom text-xs font-medium text-[#191919]/50">
                Home
              </th>
              {items.map((p) => (
                <th key={p.id} className="min-w-[200px] p-3 text-left align-bottom">
                  <div className="relative overflow-hidden rounded-lg bg-[#F4F3F3]">
                    <img src={p.photos[0]?.url} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
                    <button
                      onClick={() => toggleCompare(p.id)}
                      aria-label={`Remove ${p.title} from compare`}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#191919] shadow-sm transition-colors hover:bg-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 truncate text-[13px] font-semibold text-[#191919]">{p.title}</p>
                  <button
                    onClick={() => navigate(`/property/${p.id}`)}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#191919]/60 transition-colors hover:text-[#191919]"
                  >
                    View listing <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(p.id)}
                    aria-label="Save to favorites"
                    className={`mt-2 flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-200 ${
                      favorites.includes(p.id)
                        ? "border-[#191919] bg-[#191919] text-white"
                        : "border-gray-200 text-[#191919]/50 hover:border-[#191919]/40"
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" filled={favorites.includes(p.id)} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.label} className={ri % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                <td className="sticky left-0 z-10 bg-white p-3 text-xs font-medium text-[#191919]/60">{row.label}</td>
                {items.map((p) => (
                  <td key={p.id} className="p-3 text-[13px] text-[#191919]/80">
                    {row.value(p)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-white">
              <td className="sticky left-0 z-10 bg-white p-3 align-top text-xs font-medium text-[#191919]/60">
                Amenities
              </td>
              {items.map((p) => (
                <td key={p.id} className="p-3 align-top">
                  <div className="space-y-1.5">
                    {topAmenities.map((a) => (
                      <div key={a} className="flex items-center gap-2 text-xs">
                        {p.amenities.includes(a) ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#191919]" />
                            <span className="text-[#191919]">{a}</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 text-[#191919]/25" />
                            <span className="text-[#191919]/30">{a}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {p.amenities.length > topAmenities.length && (
                      <p className="pt-1 text-[11px] text-[#191919]/40">+{p.amenities.length - topAmenities.length} more</p>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[#191919]/40">
        Tip: you can compare up to 4 homes. Remove any column with the ✕ above its photo.
      </p>
    </div>
  );
}
