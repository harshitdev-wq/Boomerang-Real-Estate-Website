import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Property } from "@/lib/types";
import { compactPrice, displayAddress, formatArea } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { Heart } from "./Icons";

export default function PropertyCard({ property }: { property: Property }) {
  const { favorites, toggleFavorite, compareIds, toggleCompare } = useStore();
  const [imgError, setImgError] = useState(false);
  const primary = property.photos[0];
  const isFav = favorites.includes(property.id);
  const inCompare = compareIds.includes(property.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F4F3F3]">
        {primary && !imgError ? (
          <img
            src={primary.url}
            alt={primary.alt || property.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[#191919]/30">
            No photo available
          </div>
        )}
        {property.demo && (
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#191919]/70">
            Demo
          </span>
        )}
        <button
          onClick={() => toggleFavorite(property.id)}
          aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
          className={`absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-colors duration-200 ${
            isFav ? "text-[#191919]" : "text-[#191919]/50 hover:text-[#191919]"
          }`}
        >
          <Heart className="h-4 w-4" filled={isFav} />
        </button>
        <span className="absolute bottom-2 left-2 rounded-full bg-[#191919]/85 px-2 py-1 text-[11px] font-medium text-white">
          {compactPrice(property)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="truncate text-[15px] font-medium text-[#191919]">{property.title}</h3>
        <p className="truncate text-xs text-[#191919]/55">{displayAddress(property)}</p>
        <div className="flex items-center gap-2 text-xs text-[#191919]/70">
          <span>{property.bedrooms} bd</span>
          <span className="text-[#191919]/30">·</span>
          <span>{property.bathrooms} ba</span>
          <span className="text-[#191919]/30">·</span>
          <span>{formatArea(property)}</span>
          <span className="text-[#191919]/30">·</span>
          <span className="capitalize">{property.listingType}</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-2.5">
          <button
            onClick={() => toggleCompare(property.id)}
            className={`text-xs font-medium transition-colors duration-200 ${
              inCompare ? "text-[#191919]" : "text-[#191919]/55 hover:text-[#191919]"
            }`}
          >
            {inCompare ? "In compare ✓" : "Compare"}
          </button>
          <button
            onClick={() => navigate(`/property/${property.id}`)}
            className="flex items-center gap-1 text-xs font-semibold text-[#191919] transition-all duration-200 hover:gap-1.5"
          >
            View
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
