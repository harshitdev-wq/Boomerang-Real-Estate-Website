import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Property } from "@/lib/types";
import { EMPTY_SEARCH } from "@/lib/types";
import { api } from "@/services/api";
import { navigate, consumePendingScroll } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import Hero from "@/components/Hero";
import PropertyCard from "@/components/PropertyCard";
import MapView from "@/components/MapView";
import { Loader, MapPin } from "@/components/Icons";

const CITIES = ["", "Austin", "Portland", "Denver", "Chicago", "Seattle", "Asheville"];

const selectCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#191919] outline-none transition-colors focus:border-[#191919]";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-0 shadow-sm">
      <div className="aspect-[4/3] animate-pulse rounded-t-xl bg-[#F4F3F3]" />
      <div className="space-y-2 p-4">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#F4F3F3]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#F4F3F3]" />
      </div>
    </div>
  );
}

const SELL_STEPS = [
  { num: "01", title: "Create your listing", desc: "Photos, details, and a fair asking price — drafts stay private." },
  { num: "02", title: "Pass moderation", desc: "A human reviewer checks every submission before it goes live." },
  { num: "03", title: "Go live & talk to buyers", desc: "Inquiries, visit requests, and performance — in one dashboard." },
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Property[] | null>(null);
  const [mapProps, setMapProps] = useState<Property[] | null>(null);
  const { user, setAuthMode } = useStore();
  const [city, setCity] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    let alive = true;
    const pending = consumePendingScroll();
    if (pending) requestAnimationFrame(() => document.getElementById(pending)?.scrollIntoView());
    api.properties.search({ ...EMPTY_SEARCH, limit: 6, sort: "newest" }).then((res) => {
      if (alive && res.ok) setFeatured(res.data.items);
    });
    api.properties.search({ ...EMPTY_SEARCH, limit: 50, sort: "newest" }).then((res) => {
      if (alive && res.ok) setMapProps(res.data.items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const quickSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    navigate(`/browse${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const goList = () => {
    if (user && (user.role === "agent" || user.role === "admin")) navigate("/new");
    else setAuthMode(user ? "register" : "signin");
  };

  return (
    <div>
      <Hero />

      {/* ---------------- Browse / featured ---------------- */}
      <section id="browse" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 sm:px-6 md:px-14 py-16 sm:py-20 md:py-24">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">The market</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">
              Fresh on the market
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c || "All cities"}
                </option>
              ))}
            </select>
            <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Property type">
              <option value="">All types</option>
              {["house", "apartment", "condo", "townhouse", "loft", "studio", "villa", "duplex"].map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={quickSearch}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured === null
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : featured.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
        {featured && featured.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-[#191919]/60">No listings yet — check back soon.</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("/browse")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#191919]/15 px-5 py-2.5 text-sm font-medium text-[#191919] transition-colors duration-200 hover:border-[#191919]/40"
          >
            Browse all homes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ---------------- Explore / map ---------------- */}
      <section id="explore" className="scroll-mt-24 bg-[#F4F3F3] py-16 sm:py-20 md:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">Explore</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">
            Every home, on the map
          </h2>
          <p className="mt-3 max-w-md text-sm text-[#191919]/60 leading-relaxed">
            Pan across the market, zoom into a neighborhood, and tap any pin for a quick preview.
            Private addresses stay approximate until you connect with the agent.
          </p>
        </div>
        <div className="relative mx-auto mt-8 h-[56vh] min-h-[380px] w-full max-w-7xl overflow-hidden rounded-xl px-4 sm:px-6 md:px-14">
          {mapProps === null ? (
            <div className="flex h-full items-center justify-center rounded-xl bg-white">
              <Loader className="h-5 w-5" />
            </div>
          ) : (
            <MapView properties={mapProps} className="h-full rounded-xl shadow-sm" />
          )}
          <button
            onClick={() => navigate("/browse?view=map")}
            className="absolute bottom-4 right-6 sm:right-10 inline-flex items-center gap-2 rounded-lg bg-[#191919] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors duration-200 hover:bg-[#191919]/90"
          >
            Open map search
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ---------------- Sell ---------------- */}
      <section id="sell" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 sm:px-6 md:px-14 py-16 sm:py-20 md:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium">For agents</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl tracking-tight text-[#191919] leading-tight">
              Bring your listing to
              <br />
              more buyers
            </h2>
            <div className="mt-8 flex flex-col gap-2 sm:gap-3">
              {SELL_STEPS.map((s) => (
                <div
                  key={s.num}
                  className="group flex items-center gap-4 bg-[#F4F3F3] px-4 sm:px-6 py-3.5 sm:py-4 transition-all duration-200 hover:bg-[#eaeaea]"
                >
                  <span className="text-sm text-[#191919]/40 tabular-nums">{s.num}</span>
                  <span className="mx-2 text-[#191919]/30">/</span>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-[15px] font-medium text-[#191919]">{s.title}</p>
                    <p className="mt-0.5 text-xs sm:text-sm text-[#191919]/50 truncate">{s.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gray-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-700" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
            <p className="font-serif text-2xl text-[#191919]">List with Boomerang</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#191919]/70 leading-relaxed">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#191919]/40" />
                Map placement, 3D tours, and video walkthroughs for every listing.
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#191919]/40" />
                Inquiries, visit requests, and listing performance in one dashboard.
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#191919]/40" />
                Every submission is checked by a human moderator before going live.
              </li>
            </ul>
            <button
              onClick={goList}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] px-6 py-3.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90"
            >
              List A Property
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-xs text-[#191919]/40">
              {user && (user.role === "agent" || user.role === "admin")
                ? "You're signed in as an agent — you can start right away."
                : "Agent accounts get instant access — no invite required in this demo."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
