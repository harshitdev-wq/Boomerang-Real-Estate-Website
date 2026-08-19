import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Property } from "@/lib/types";
import { api } from "@/services/api";
import { useHashRoute, navigate } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { displayAddress, formatArea, formatDate, formatPrice, propertyLocation, timeAgo, toTitle, initials } from "@/lib/utils";
import PhotoGallery from "@/components/PhotoGallery";
import MapView from "@/components/MapView";
import VirtualTour from "@/components/VirtualTour";
import { InquiryModal, VisitModal, ReportModal, shareProperty } from "@/components/Modals";
import { Alert, Bath, Bed, Building, Calendar, Car, Check, Clock, Eye, Flag, Heart, Mail, Phone, Ruler, Share } from "@/components/Icons";

interface Similar {
  property: Property;
  score: number;
  reasons: string[];
}

export default function PropertyPage() {
  const route = useHashRoute();
  const id = route.params.id ?? "";
  const { favorites, toggleFavorite, compareIds, toggleCompare, user, toast } = useStore();
  const [property, setProperty] = useState<Property | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");
  const [similar, setSimilar] = useState<Similar[] | null>(null);
  const [modal, setModal] = useState<"inquiry" | "visit" | "report" | null>(null);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setProperty(null);
    api.properties.get(id).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setProperty(res.data);
        setStatus("ok");
      } else if (res.error.status === 404) {
        setStatus("notfound");
      } else {
        setStatus("error");
      }
    });
    api.properties.similar(id).then((res) => {
      if (alive && res.ok) setSimilar(res.data);
    });
    window.scrollTo({ top: 0 });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 pt-24 pb-16">
        <div className="h-8 w-40 animate-pulse rounded bg-[#F4F3F3]" />
        <div className="mt-6 aspect-[16/9] animate-pulse rounded-xl bg-[#F4F3F3]" />
        <div className="mt-6 h-6 w-3/4 animate-pulse rounded bg-[#F4F3F3]" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[#F4F3F3]" />
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <p className="font-serif text-3xl text-[#191919]">This listing is no longer available</p>
        <p className="mt-3 text-sm text-[#191919]/50 leading-relaxed">
          It may have been sold, rented, or removed by its owner. New homes are added every week.
        </p>
        <button
          onClick={() => navigate("/browse")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Browse other homes
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (status === "error" || !property) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <Alert className="h-6 w-6 text-[#191919]/40" />
        <p className="mt-3 text-sm text-[#191919]/60">We couldn't load this listing. Check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const p = property;
  const isFav = favorites.includes(p.id);
  const inCompare = compareIds.includes(p.id);
  const isOwner = user?.id === p.agentId || user?.role === "admin";

  const facts: [string, string][] = [
    ["Property type", toTitle(p.type)],
    ["Listing type", toTitle(p.listingType)],
    ["Year built", String(p.yearBuilt)],
    ["Floor", p.floor === 0 ? "Ground" : `Floor ${p.floor} of ${p.totalFloors}`],
    ["Furnishing", toTitle(p.furnishing)],
    ["Parking", p.parking === 0 ? "None" : `${p.parking} ${p.parking === 1 ? "space" : "spaces"}`],
    ["Status", toTitle(p.status)],
    ["Listed", formatDate(p.createdAt)],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 pt-24 sm:pt-28 pb-16">
      <button
        onClick={() => navigate("/browse")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#191919]/50 transition-colors hover:text-[#191919]"
      >
        ← Back to browse
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        {/* Left column */}
        <div className="min-w-0">
          <PhotoGallery items={p.photos} title={p.title} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {p.demo && (
              <span className="rounded-full bg-[#F4F3F3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#191919]/60">
                Demo listing
              </span>
            )}
            <span className="rounded-full bg-[#F4F3F3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#191919]/60">
              {toTitle(p.type)}
            </span>
            <span className="rounded-full bg-[#F4F3F3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#191919]/60">
              For {p.listingType}
            </span>
            {p.status !== "published" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                {toTitle(p.status)}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">{p.title}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-[#191919]/55">
            {!p.exactLocation && <Alert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#191919]/40" />}
            {displayAddress(p)}
            {!p.exactLocation && <span className="text-[#191919]/40">(exact address shared on inquiry)</span>}
          </p>

          <p className="mt-4 text-2xl font-semibold tracking-tight text-[#191919]">{formatPrice(p)}</p>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-y border-gray-100 py-3.5 text-sm text-[#191919]/70">
            <span className="flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-[#191919]/40" /> {p.bedrooms} bd
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="h-4 w-4 text-[#191919]/40" /> {p.bathrooms} ba
            </span>
            <span className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-[#191919]/40" /> {formatArea(p)}
            </span>
            <span className="flex items-center gap-1.5">
              <Car className="h-4 w-4 text-[#191919]/40" /> {p.parking}
            </span>
            <span className="flex items-center gap-1.5">
              <Building className="h-4 w-4 text-[#191919]/40" /> {p.yearBuilt}
            </span>
          </div>

          <div className="mt-6">
            <h2 className="font-serif text-xl text-[#191919]">About this home</h2>
            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-[#191919]/70 whitespace-pre-line">{p.description}</p>
          </div>

          <div className="mt-8">
            <VirtualTour has360={p.has360} panoSrc={p.panoSrc} tourUrl={p.tourUrl} />
          </div>

          {p.amenities.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl text-[#191919]">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-[#191919]/70"
                  >
                    <Check className="h-3 w-3 text-[#191919]/40" />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-serif text-xl text-[#191919]">Facts &amp; figures</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 bg-white px-4 py-3">
                  <span className="text-xs text-[#191919]/50">{k}</span>
                  <span className="text-sm font-medium text-[#191919]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-serif text-xl text-[#191919]">Location</h2>
            <p className="mt-2 text-sm text-[#191919]/55">{propertyLocation(p)}</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
              <MapView properties={[p]} single className="h-72" />
            </div>
          </div>

          {similar !== null && similar.length > 0 && (
            <div className="mt-10">
              <h2 className="font-serif text-xl text-[#191919]">You may also like</h2>
              <p className="mt-1 text-xs text-[#191919]/45">
                Recommended by a transparent score: location 30% · price 25% · type 20% · area 15% · bedrooms 10%
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {similar.map((s) => (
                  <button
                    key={s.property.id}
                    onClick={() => navigate(`/property/${s.property.id}`)}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#F4F3F3]">
                      <img
                        src={s.property.photos[0]?.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-[#191919]/85 px-2 py-0.5 text-[11px] font-medium text-white">
                        {formatPrice(s.property)}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-[#191919]">{s.property.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.reasons.slice(0, 2).map((r) => (
                          <span key={r} className="rounded-full bg-[#F4F3F3] px-2 py-0.5 text-[10px] font-medium text-[#191919]/60">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — agent card */}
        <div className="min-w-0">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191919] text-sm font-semibold text-white">
                {initials(p.agent.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#191919]">{p.agent.name}</p>
                <p className="truncate text-xs text-[#191919]/50">{p.agent.agency}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-[#191919]/70">
              <a href={`tel:${p.agent.phone}`} className="flex items-center gap-2 transition-colors hover:text-[#191919]">
                <Phone className="h-4 w-4 text-[#191919]/40" /> {p.agent.phone}
              </a>
              <a href={`mailto:${p.agent.email}`} className="flex items-center gap-2 transition-colors hover:text-[#191919]">
                <Mail className="h-4 w-4 text-[#191919]/40" /> {p.agent.email}
              </a>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => setModal("inquiry")}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#191919] px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90"
              >
                Send inquiry
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setModal("visit")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#191919]/15 px-4 py-3 text-sm font-medium text-[#191919] transition-colors duration-200 hover:border-[#191919]/40"
              >
                <Calendar className="h-4 w-4" />
                Request a visit
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => toggleFavorite(p.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                  isFav ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/70 hover:border-[#191919]/40"
                }`}
              >
                <Heart className="h-3.5 w-3.5" filled={isFav} />
                {isFav ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => toggleCompare(p.id)}
                className={`flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                  inCompare ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/70 hover:border-[#191919]/40"
                }`}
              >
                {inCompare ? "In compare" : "Compare"}
              </button>
              <button
                onClick={() => void shareProperty(p, toast)}
                aria-label="Share"
                className="flex w-10 items-center justify-center rounded-lg border border-gray-200 text-[#191919]/70 transition-colors duration-200 hover:border-[#191919]/40"
              >
                <Share className="h-4 w-4" />
              </button>
            </div>

            {isOwner && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-[#191919]/50">
                <Eye className="h-3.5 w-3.5" /> {p.views} views · updated {timeAgo(p.updatedAt)}
              </p>
            )}

            <button
              onClick={() => setModal("report")}
              className="mt-5 flex items-center gap-1.5 text-xs text-[#191919]/40 transition-colors hover:text-[#191919]"
            >
              <Flag className="h-3.5 w-3.5" /> Report this listing
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-[#F4F3F3] p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-[#191919]">
              <Clock className="h-4 w-4 text-[#191919]/40" /> Visits are pre-screened
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#191919]/55">
              Every visit request is reviewed by the agent, and scheduling conflicts are caught automatically.
            </p>
          </div>
        </div>
      </div>

      {modal === "inquiry" && <InquiryModal property={p} onClose={() => setModal(null)} />}
      {modal === "visit" && <VisitModal property={p} onClose={() => setModal(null)} />}
      {modal === "report" && <ReportModal property={p} onClose={() => setModal(null)} />}
    </div>
  );
}
