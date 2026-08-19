import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Furnishing, ListingType, MediaItem, PropertyInput, PropertyType } from "@/lib/types";
import { AMENITIES, CURRENCIES, FURNISHING_OPTIONS, LISTING_TYPES, PROPERTY_TYPES } from "@/lib/types";
import { api } from "@/services/api";
import { navigate, useHashRoute } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { validatePropertyInput } from "@/lib/validation";
import { uid } from "@/lib/utils";
import { Loader, Plus, X } from "@/components/Icons";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#191919] placeholder:text-[#191919]/35 outline-none transition-colors focus:border-[#191919]";
const labelCls = "mb-1.5 block text-xs font-medium text-[#191919]/60";
const MAX_MEDIA = 24;
const MAX_FILE = 8 * 1024 * 1024;

/** Downscale uploaded images client-side (image optimization) before storage. */
function downscaleImage(file: File, maxW: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(2, Math.round(img.width * scale));
      const h = Math.max(2, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(objUrl);
      c.toBlob(
        (b) => {
          if (b) resolve(URL.createObjectURL(b));
          else reject(new Error("encode failed"));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("image load failed"));
    };
    img.src = objUrl;
  });
}

const EMPTY: PropertyInput = {
  title: "",
  description: "",
  type: "house",
  listingType: "sale",
  price: 0,
  currency: "USD",
  area: 0,
  areaUnit: "sqft",
  bedrooms: 1,
  bathrooms: 1,
  parking: 0,
  floor: 0,
  totalFloors: 1,
  yearBuilt: 2010,
  furnishing: "unfurnished",
  amenities: [],
  address: "",
  city: "",
  region: "",
  country: "USA",
  postalCode: "",
  lat: 0,
  lng: 0,
  exactLocation: true,
  photos: [],
  tourUrl: "",
};

export default function ListingForm() {
  const route = useHashRoute();
  const editId = route.query.get("edit") ?? "";
  const { user, setAuthMode, toast } = useStore();
  const [form, setForm] = useState<PropertyInput>(EMPTY);
  const [videoUrl, setVideoUrl] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

  const allowed = user && (user.role === "agent" || user.role === "admin");

  useEffect(() => {
    if (!editId) return;
    let alive = true;
    api.properties.get(editId).then((res) => {
      if (!alive) return;
      setLoadingEdit(false);
      if (res.ok && (user?.id === res.data.agentId || user?.role === "admin")) {
        const p = res.data;
        setForm({
          title: p.title,
          description: p.description,
          type: p.type,
          listingType: p.listingType,
          price: p.price,
          currency: p.currency,
          area: p.area,
          areaUnit: p.areaUnit,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          parking: p.parking,
          floor: p.floor,
          totalFloors: p.totalFloors,
          yearBuilt: p.yearBuilt,
          furnishing: p.furnishing,
          amenities: [...p.amenities],
          address: p.address,
          city: p.city,
          region: p.region,
          country: p.country,
          postalCode: p.postalCode,
          lat: p.lat,
          lng: p.lng,
          exactLocation: p.exactLocation,
          photos: [...p.photos],
          tourUrl: p.tourUrl ?? "",
        });
      } else {
        toast("You can only edit your own listings.", "error");
        navigate("/dashboard?tab=listings");
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <p className="font-serif text-3xl text-[#191919]">Sign in to list a property</p>
        <p className="mt-3 text-sm text-[#191919]/50">Agent accounts can create listings in minutes.</p>
        <button
          onClick={() => setAuthMode("signin")}
          className="mt-6 rounded-lg bg-[#191919] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <p className="font-serif text-3xl text-[#191919]">Listing is for agents</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#191919]/50">
          Buyer accounts can't publish listings. In this demo you can register an agent account from the
          sign-in dialog — no invite required.
        </p>
        <button
          onClick={() => setAuthMode("register")}
          className="mt-6 rounded-lg bg-[#191919] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Create an agent account
        </button>
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="flex justify-center pt-48 pb-24">
        <Loader className="h-5 w-5" />
      </div>
    );
  }

  const set = <K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const current = form.photos.length;
    for (const file of Array.from(files).slice(0, MAX_MEDIA - current)) {
      if (!file.type.startsWith("image/")) {
        toast(`“${file.name}” isn't an image — skipped.`, "error");
        continue;
      }
      if (file.size > MAX_FILE) {
        toast(`“${file.name}” is over 8MB — skipped.`, "error");
        continue;
      }
      try {
        const url = await downscaleImage(file, 1600, 0.85);
        const item: MediaItem = { id: `up-${uid()}`, url, alt: file.name.replace(/\.[^.]+$/, ""), kind: "image" };
        setForm((f) => ({ ...f, photos: [...f.photos, item] }));
      } catch {
        toast(`Couldn't process “${file.name}”.`, "error");
      }
    }
  };

  const addVideo = () => {
    const url = videoUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      setErrors((e) => ({ ...e, videoUrl: "Enter a valid video URL (https://…)" }));
      return;
    }
    setForm((f) => ({
      ...f,
      photos: [...f.photos, { id: `v-${uid()}`, url, alt: "Video walkthrough", kind: "video" }],
    }));
    setVideoUrl("");
    setErrors((e) => {
      const { videoUrl: _v, ...rest } = e;
      return rest;
    });
  };

  const submit = async (draft: boolean) => {
    const errs = validatePropertyInput(form, draft);
    if (errs.length) {
      const map: Record<string, string> = {};
      for (const e of errs) map[e.field] = e.message;
      setErrors(map);
      toast("Some fields need attention.", "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    setBusy(true);
    const res = editId
      ? await api.properties.update(editId, form)
      : await api.properties.create(form, draft);
    setBusy(false);
    if (!res.ok) {
      toast(res.error.message, "error");
      return;
    }
    toast(
      draft
        ? "Draft saved — it's only visible to you."
        : user.role === "admin"
          ? "Listing published."
          : "Submitted for moderation — we'll review it shortly.",
      "success",
    );
    navigate("/dashboard?tab=listings");
  };

  const err = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">
        {editId ? "Edit listing" : "Create a listing"}
      </h1>
      <p className="mt-1 text-sm text-[#191919]/50">
        {editId
          ? "Changes are saved immediately. Published listings remain live."
          : "Save as a draft any time, or submit for moderation when you're ready."}
      </p>

      <div className="mt-8 space-y-6">
        {/* Basics */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Basics</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} placeholder="e.g. Juniper Hill Villa" value={form.title} onChange={(e) => set("title", e.target.value)} />
              {err("title")}
            </div>
            <div>
              <label className={labelCls}>Description (min 40 characters)</label>
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                placeholder="What makes this home special? Layout, light, neighborhood, recent updates…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
              {err("description")}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value as PropertyType)}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Deal type</label>
                <select className={inputCls} value={form.listingType} onChange={(e) => set("listingType", e.target.value as ListingType)}>
                  {LISTING_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Price</label>
                <input type="number" min={0} className={inputCls} value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
                {err("price")}
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Specs */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Specs</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["area", "Area", "number"],
                ["bedrooms", "Bedrooms", "number"],
                ["bathrooms", "Bathrooms", "number"],
                ["parking", "Parking", "number"],
                ["floor", "Floor", "number"],
                ["totalFloors", "Total floors", "number"],
                ["yearBuilt", "Year built", "number"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={String(form[key])}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
                {err(key)}
              </div>
            ))}
            <div>
              <label className={labelCls}>Area unit</label>
              <select className={inputCls} value={form.areaUnit} onChange={(e) => set("areaUnit", e.target.value as "sqft" | "sqm")}>
                <option value="sqft">sqft</option>
                <option value="sqm">sqm</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Furnishing</label>
              <select className={inputCls} value={form.furnishing} onChange={(e) => set("furnishing", e.target.value as Furnishing)}>
                {FURNISHING_OPTIONS.map((f) => (
                  <option key={f} value={f} className="capitalize">{f}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Location</p>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Street address</label>
                <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} />
                {err("address")}
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} />
                {err("city")}
              </div>
              <div>
                <label className={labelCls}>State / region</label>
                <input className={inputCls} value={form.region} onChange={(e) => set("region", e.target.value)} />
                {err("region")}
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} />
                {err("country")}
              </div>
              <div>
                <label className={labelCls}>Postal code</label>
                <input className={inputCls} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
                {err("postalCode")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Latitude</label>
                  <input type="number" step="any" className={inputCls} value={form.lat || ""} onChange={(e) => set("lat", Number(e.target.value))} />
                  {err("lat")}
                </div>
                <div>
                  <label className={labelCls}>Longitude</label>
                  <input type="number" step="any" className={inputCls} value={form.lng || ""} onChange={(e) => set("lng", Number(e.target.value))} />
                  {err("lng")}
                </div>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-[#F4F3F3] p-3.5">
              <input
                type="checkbox"
                checked={form.exactLocation}
                onChange={(e) => set("exactLocation", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#191919]"
              />
              <span className="text-xs leading-relaxed text-[#191919]/70">
                <span className="font-semibold text-[#191919]">Show the exact location publicly.</span> When
                unchecked, visitors see an approximate pin and the exact address is shared only after they
                inquire — recommended for privacy.
              </span>
            </label>
          </div>
        </section>

        {/* Media */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Media</p>
          <div className="mt-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 py-8 text-sm text-[#191919]/50 transition-colors hover:border-[#191919]/40 hover:text-[#191919]"
            >
              <Plus className="h-5 w-5" />
              Add photos (JPG, PNG or WebP · max 8MB each · auto-optimized)
            </button>
            {err("photos")}
            {form.photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.photos.map((m, i) => (
                  <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg bg-[#F4F3F3]">
                    {m.kind === "video" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-[10px] font-medium text-[#191919]/50">
                        <span>▶</span> Video
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((x) => x.id !== m.id) }))}
                      aria-label="Remove media"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#191919] opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-[#191919]/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <input
                className={inputCls}
                placeholder="Paste a video URL (e.g. MP4 walkthrough)…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={addVideo}
                className="shrink-0 rounded-lg border border-[#191919]/15 px-4 py-2.5 text-sm font-medium text-[#191919] transition-colors hover:border-[#191919]/40"
              >
                Add video
              </button>
            </div>
            {err("videoUrl")}
            <div className="mt-3">
              <label className={labelCls}>3D / virtual tour URL (optional — Matterport, Kuula, etc.)</label>
              <input
                className={inputCls}
                placeholder="https://my.matterport.com/show/?m=…"
                value={form.tourUrl}
                onChange={(e) => set("tourUrl", e.target.value)}
              />
              {err("tourUrl")}
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#191919]/40">Amenities</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = form.amenities.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    set("amenities", on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a])
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                    on ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => void submit(true)}
            disabled={busy}
            className="rounded-lg border border-[#191919]/15 px-6 py-3 text-sm font-medium text-[#191919] transition-colors hover:border-[#191919]/40 disabled:opacity-60"
          >
            {busy ? <Loader /> : "Save draft"}
          </button>
          <button
            onClick={() => void submit(false)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#191919] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90 disabled:opacity-60"
          >
            {editId ? "Save changes" : user?.role === "admin" ? "Publish listing" : "Submit for review"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {!editId && (
          <p className="text-right text-xs text-[#191919]/40">
            New listings are checked by a human moderator before going live.
          </p>
        )}
      </div>
    </div>
  );
}
