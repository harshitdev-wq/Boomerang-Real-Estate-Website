import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import type { Inquiry, Property, VisitRequest } from "@/lib/types";
import { api } from "@/services/api";
import { navigate, useHashRoute } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import PropertyCard from "@/components/PropertyCard";
import { formatDate, timeAgo, toTitle, compactPrice } from "@/lib/utils";
import { Edit, Eye, Loader, Trash } from "@/components/Icons";

type Tab = "saved" | "listings" | "inquiries" | "visits" | "profile";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#191919] placeholder:text-[#191919]/35 outline-none transition-colors focus:border-[#191919]";

function EmptyState({ title, desc, action, onAction }: { title: string; desc: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
      <p className="font-serif text-xl text-[#191919]">{title}</p>
      <p className="mt-2 text-sm text-[#191919]/50">{desc}</p>
      <button
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
      >
        {action}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: Property["status"] }) {
  const tones: Record<Property["status"], string> = {
    draft: "bg-gray-100 text-[#191919]/60",
    submitted: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    unpublished: "bg-red-50 text-red-700",
    sold: "bg-[#191919] text-white",
    rented: "bg-[#191919] text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[status]}`}>
      {toTitle(status)}
    </span>
  );
}

export default function DashboardPage() {
  const route = useHashRoute();
  const { user, setAuthMode, toast } = useStore();
  const [tab, setTab] = useState<Tab>(() => (route.query.get("tab") as Tab) ?? "saved");
  const [favorites, setFavorites] = useState<Property[] | null>(null);
  const [listings, setListings] = useState<Property[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[] | null>(null);
  const [visits, setVisits] = useState<VisitRequest[] | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const isAgent = user?.role === "agent" || user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone);
  }, [user]);

  const load = useCallback(() => {
    if (!user) return;
    api.favorites.list().then((res) => res.ok && setFavorites(res.data));
    if (isAgent) api.properties.mine().then((res) => res.ok && setListings(res.data));
    api.inquiries.list().then((res) => res.ok && setInquiries(res.data));
    api.visits.list().then((res) => res.ok && setVisits(res.data));
  }, [user, isAgent]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <p className="font-serif text-3xl text-[#191919]">Sign in to see your dashboard</p>
        <p className="mt-3 text-sm text-[#191919]/50">Saved homes, inquiries, visits and your listings live here.</p>
        <button
          onClick={() => setAuthMode("signin")}
          className="mt-6 rounded-lg bg-[#191919] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "saved", label: "Saved" },
    ...(isAgent ? [{ id: "listings" as Tab, label: "My listings" }] : []),
    { id: "inquiries", label: "Inquiries" },
    { id: "visits", label: "Visits" },
    { id: "profile", label: "Profile" },
  ];

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await api.auth.updateProfile({ name, phone });
    setBusy(false);
    if (res.ok) setMsg({ tone: "ok", text: "Profile updated." });
    else setMsg({ tone: "err", text: res.error.message });
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await api.auth.changePassword(pwCurrent, pwNext);
    setBusy(false);
    if (res.ok) {
      setMsg({ tone: "ok", text: "Password updated." });
      setPwCurrent("");
      setPwNext("");
    } else setMsg({ tone: "err", text: res.error.message });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 pt-24 sm:pt-28 pb-24">
      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">
        Hi, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-[#191919]/50 capitalize">{user.role} account · {user.email}</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === t.id ? "border-[#191919] text-[#191919]" : "border-transparent text-[#191919]/50 hover:text-[#191919]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {/* ---------- Saved ---------- */}
        {tab === "saved" && (
          <>
            {favorites === null ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : favorites.length === 0 ? (
              <EmptyState
                title="Nothing saved yet"
                desc="Tap the heart on any listing to keep it here."
                action="Browse homes"
                onAction={() => navigate("/browse")}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {favorites.map((p) => <PropertyCard key={p.id} property={p} />)}
              </div>
            )}
          </>
        )}

        {/* ---------- My listings ---------- */}
        {tab === "listings" && (
          <>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => navigate("/new")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#191919] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
              >
                New listing
              </button>
            </div>
            {listings === null ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : listings.length === 0 ? (
              <EmptyState
                title="You have no listings yet"
                desc="Create your first listing — drafts stay private until you submit them."
                action="Create a listing"
                onAction={() => navigate("/new")}
              />
            ) : (
              <div className="space-y-3">
                {listings.map((p) => (
                  <div key={p.id} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <img src={p.photos[0]?.url} alt="" className="h-20 w-full rounded-lg object-cover sm:w-28" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#191919]">{p.title}</p>
                        <StatusBadge status={p.status} />
                        {p.demo && <span className="rounded-full bg-[#F4F3F3] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#191919]/50">Demo</span>}
                      </div>
                      <p className="mt-1 text-xs text-[#191919]/55">
                        {compactPrice(p)} · {p.city}, {p.region} · listed {timeAgo(p.createdAt)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#191919]/45">
                        <Eye className="h-3.5 w-3.5" /> {p.views} views
                        {p.moderationNote && <span className="truncate text-amber-600/80">· {p.moderationNote}</span>}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => navigate(`/property/${p.id}`)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/new?edit=${p.id}`)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                      >
                        <span className="inline-flex items-center gap-1.5"><Edit className="h-3.5 w-3.5" /> Edit</span>
                      </button>
                      {p.status === "draft" && (
                        <button
                          onClick={async () => {
                            const res = await api.properties.setStatus(p.id, "submitted");
                            if (res.ok) {
                              toast("Submitted for moderation.", "success");
                              load();
                            } else toast(res.error.message, "error");
                          }}
                          className="rounded-lg bg-[#191919] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#191919]/90"
                        >
                          Submit for review
                        </button>
                      )}
                      {p.status === "published" && (
                        <>
                          <button
                            onClick={async () => {
                              const res = await api.properties.setStatus(p.id, "unpublished");
                              if (res.ok) load();
                            }}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                          >
                            Unpublish
                          </button>
                          {p.listingType === "sale" ? (
                            <button
                              onClick={async () => {
                                const res = await api.properties.setStatus(p.id, "sold");
                                if (res.ok) load();
                              }}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                            >
                              Mark sold
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const res = await api.properties.setStatus(p.id, "rented");
                                if (res.ok) load();
                              }}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                            >
                              Mark rented
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete this listing permanently? This cannot be undone.")) return;
                          const res = await api.properties.remove(p.id);
                          if (res.ok) load();
                          else alert(res.error.message);
                        }}
                        aria-label="Delete listing"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-[#191919]/50 transition-colors hover:border-red-200 hover:text-red-600"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- Inquiries ---------- */}
        {tab === "inquiries" && (
          <>
            {inquiries === null ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : inquiries.length === 0 ? (
              <EmptyState
                title={isAgent ? "No inquiries yet" : "You haven't sent any inquiries"}
                desc={isAgent ? "When buyers reach out about your listings, the messages land here." : "Find a home you like and message its agent from the listing page."}
                action="Browse homes"
                onAction={() => navigate("/browse")}
              />
            ) : (
              <div className="space-y-3">
                {inquiries.map((i) => (
                  <div key={i.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/property/${i.propertyId}`)}
                          className="truncate text-sm font-semibold text-[#191919] hover:underline"
                        >
                          {i.propertyTitle}
                        </button>
                        <p className="mt-0.5 text-xs text-[#191919]/50">
                          {isAgent ? `From ${i.userName} (${i.userEmail})` : "You"} · {timeAgo(i.createdAt)} · prefers {i.contactPref}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        i.status === "new" ? "bg-amber-50 text-amber-700" : i.status === "closed" ? "bg-gray-100 text-[#191919]/50" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {toTitle(i.status)}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line rounded-lg bg-[#F4F3F3] p-3 text-sm leading-relaxed text-[#191919]/80">
                      {i.message}
                    </p>
                    {isAgent && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(["contacted", "scheduled", "closed"] as const).map((s) => (
                          <button
                            key={s}
                            disabled={i.status === s}
                            onClick={async () => {
                              const res = await api.inquiries.updateStatus(i.id, s);
                              if (res.ok) load();
                            }}
                            className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-[#191919]/60 transition-colors hover:border-[#191919]/40 disabled:border-[#191919] disabled:bg-[#191919] disabled:text-white"
                          >
                            {toTitle(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- Visits ---------- */}
        {tab === "visits" && (
          <>
            {visits === null ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : visits.length === 0 ? (
              <EmptyState
                title={isAgent ? "No visit requests yet" : "You haven't requested any visits"}
                desc={isAgent ? "Buyers who ask to see your listings will appear here." : "Request a visit from any listing page to walk through in person."}
                action="Browse homes"
                onAction={() => navigate("/browse")}
              />
            ) : (
              <div className="space-y-3">
                {visits.map((v) => (
                  <div key={v.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/property/${v.propertyId}`)}
                        className="truncate text-sm font-semibold text-[#191919] hover:underline"
                      >
                        {v.propertyTitle}
                      </button>
                      <p className="mt-0.5 text-xs text-[#191919]/50">
                        {formatDate(`${v.date}T00:00:00`)} at {v.time} · {isAgent ? `by ${v.userName}` : "you"}
                        {v.note && ` · “${v.note}”`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        v.status === "requested" ? "bg-amber-50 text-amber-700" : v.status === "accepted" ? "bg-emerald-50 text-emerald-700" : v.status === "declined" || v.status === "cancelled" ? "bg-red-50 text-red-600" : "bg-gray-100 text-[#191919]/50"
                      }`}>
                        {toTitle(v.status)}
                      </span>
                      {isAgent && (v.status === "requested" || v.status === "accepted") && (
                        <>
                          {v.status === "requested" && (
                            <button
                              onClick={async () => {
                                const res = await api.visits.updateStatus(v.id, "accepted");
                                if (res.ok) load();
                              }}
                              className="rounded-lg bg-[#191919] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#191919]/90"
                            >
                              Accept
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const res = await api.visits.updateStatus(v.id, v.status === "requested" ? "declined" : "completed");
                              if (res.ok) load();
                            }}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                          >
                            {v.status === "requested" ? "Decline" : "Mark completed"}
                          </button>
                        </>
                      )}
                      {!isAgent && v.status === "requested" && (
                        <button
                          onClick={async () => {
                            const res = await api.visits.updateStatus(v.id, "cancelled");
                            if (res.ok) load();
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- Profile ---------- */}
        {tab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={saveProfile} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-serif text-lg text-[#191919]">Profile</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#191919]/60">Name</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#191919]/60">Phone</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#191919]/60">Email (login)</label>
                  <input className={`${inputCls} bg-[#F4F3F3]`} value={user.email} disabled />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90 disabled:opacity-60"
                >
                  Save changes
                </button>
              </div>
            </form>

            <form onSubmit={changePassword} className="h-fit rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="font-serif text-lg text-[#191919]">Change password</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#191919]/60">Current password</label>
                  <input type="password" className={inputCls} value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#191919]/60">New password (min 8 chars)</label>
                  <input type="password" className={inputCls} value={pwNext} onChange={(e) => setPwNext(e.target.value)} />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90 disabled:opacity-60"
                >
                  Update password
                </button>
              </div>
            </form>

            {msg && (
              <p className={`lg:col-span-2 rounded-lg px-4 py-3 text-sm ${msg.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
