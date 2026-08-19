import { useCallback, useEffect, useState } from "react";
import type { Property, ReportEntry } from "@/lib/types";
import { api, type SafeUser } from "@/services/api";
import { runSystemChecks, type CheckResult } from "@/services/selfTest";
import { navigate } from "@/lib/router";
import { useStore } from "@/context/StoreContext";
import { compactPrice, formatDate, timeAgo } from "@/lib/utils";
import { Check, Loader, Shield, Trash, X } from "@/components/Icons";

type Tab = "overview" | "moderation" | "listings" | "users" | "reports" | "checks" | "audit";

interface Stats {
  users: number;
  activeUsers: number;
  properties: number;
  published: number;
  pending: number;
  sold: number;
  rented: number;
  inquiries: number;
  newInquiries: number;
  visits: number;
  openReports: number;
  favorites: number;
  byType: { type: string; count: number }[];
}

export default function AdminPanel() {
  const { user, toast } = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<Property[] | null>(null);
  const [allListings, setAllListings] = useState<Property[] | null>(null);
  const [users, setUsers] = useState<SafeUser[] | null>(null);
  const [reports, setReports] = useState<ReportEntry[] | null>(null);
  const [checks, setChecks] = useState<CheckResult[] | null>(null);
  const [checksBusy, setChecksBusy] = useState(false);
  const [audit, setAudit] = useState<{ id: string; actorEmail: string; action: string; target: string; note?: string; at: string }[] | null>(null);
  const [q, setQ] = useState("");

  const isAdmin = user?.role === "admin";

  const load = useCallback(() => {
    if (!isAdmin) return;
    api.admin.stats().then((r) => r.ok && setStats(r.data));
    api.admin.moderationQueue().then((r) => r.ok && setQueue(r.data));
    api.admin.allListings(q).then((r) => r.ok && setAllListings(r.data));
    api.admin.users().then((r) => r.ok && setUsers(r.data));
    api.admin.reports().then((r) => r.ok && setReports(r.data));
    api.admin.auditLog().then((r) => r.ok && setAudit(r.data));
  }, [isAdmin, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      api.admin.allListings(q).then((r) => r.ok && setAllListings(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (!isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-40 pb-24 text-center">
        <Shield className="h-7 w-7 text-[#191919]/30" />
        <p className="mt-4 font-serif text-3xl text-[#191919]">Administrators only</p>
        <p className="mt-3 text-sm text-[#191919]/50">
          This area requires an admin account. Try the demo admin: admin@boomerang.demo / demo1234
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-lg bg-[#191919] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90"
        >
          Back to home
        </button>
      </div>
    );
  }

  const runChecks = async () => {
    setChecksBusy(true);
    setChecks(null);
    const results = await runSystemChecks();
    setChecks(results);
    setChecksBusy(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "moderation", label: `Moderation${queue && queue.length ? ` (${queue.length})` : ""}` },
    { id: "listings", label: "Listings" },
    { id: "users", label: "Users" },
    { id: "reports", label: `Reports${reports && reports.filter((r) => r.status === "open").length ? ` (${reports.filter((r) => r.status === "open").length})` : ""}` },
    { id: "checks", label: "System checks" },
    { id: "audit", label: "Audit log" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-14 pt-24 sm:pt-28 pb-24">
      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#191919]">Admin console</h1>
      <p className="mt-1 text-sm text-[#191919]/50">Moderation, users, reports and platform health.</p>

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
        {/* ---------- Overview ---------- */}
        {tab === "overview" && (
          <>
            {!stats ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {[
                    ["Users", `${stats.users} (${stats.activeUsers} active)`],
                    ["Properties", String(stats.properties)],
                    ["Published", String(stats.published)],
                    ["Awaiting review", String(stats.pending)],
                    ["Sold / rented", `${stats.sold} / ${stats.rented}`],
                    ["Inquiries", `${stats.inquiries} (${stats.newInquiries} new)`],
                    ["Visit requests", String(stats.visits)],
                    ["Open reports", String(stats.openReports)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#191919]/40">{k}</p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-[#191919]">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-[#191919]/60">Properties by type</p>
                  <div className="mt-3 space-y-2">
                    {stats.byType
                      .filter((t) => t.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .map((t) => (
                        <div key={t.type} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-xs capitalize text-[#191919]/60">{t.type}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F4F3F3]">
                            <div
                              className="h-full rounded-full bg-[#191919]"
                              style={{ width: `${Math.max(4, (t.count / Math.max(1, stats.properties)) * 100)}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs text-[#191919]/60">{t.count}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <p className="mt-4 text-xs text-[#191919]/40">
                  Demo environment — all figures come from the sample dataset.
                </p>
              </>
            )}
          </>
        )}

        {/* ---------- Moderation ---------- */}
        {tab === "moderation" && (
          <>
            {!queue ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : queue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <p className="font-serif text-xl text-[#191919]">Queue is clear</p>
                <p className="mt-2 text-sm text-[#191919]/50">New agent submissions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((p) => (
                  <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <img src={p.photos[0]?.url} alt="" className="h-28 w-full rounded-lg object-cover sm:w-40" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#191919]">{p.title}</p>
                        <p className="mt-1 text-xs text-[#191919]/55">
                          {compactPrice(p)} · {p.address}, {p.city}, {p.region} · by {p.agent.name} ({p.agent.email})
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#191919]/60">{p.description}</p>
                        {p.moderationNote && (
                          <p className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">{p.moderationNote}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/property/${p.id}`)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={async () => {
                              const res = await api.admin.moderate(p.id, true, "Approved by moderation.");
                              if (res.ok) {
                                toast("Listing approved and published.", "success");
                                load();
                              } else toast(res.error.message, "error");
                            }}
                            className="rounded-lg bg-[#191919] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#191919]/90"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const note = window.prompt("Reason for rejection (shown to the agent):", "Missing required details or photos.");
                              if (note === null) return;
                              const res = await api.admin.moderate(p.id, false, note);
                              if (res.ok) {
                                toast("Listing rejected.", "info");
                                load();
                              } else toast(res.error.message, "error");
                            }}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- All listings ---------- */}
        {tab === "listings" && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <input
                className="w-full max-w-xs rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#191919]"
                placeholder="Search title, city or agent…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {!allListings ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-[#191919]/50">
                      <th className="p-3 font-medium">Listing</th>
                      <th className="p-3 font-medium">Agent</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Views</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allListings.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 last:border-0">
                        <td className="p-3">
                          <p className="truncate font-medium text-[#191919]">{p.title}</p>
                          <p className="text-xs text-[#191919]/50">{p.city} · {compactPrice(p)}</p>
                        </td>
                        <td className="p-3 text-xs text-[#191919]/60">{p.agent.email}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            p.status === "published" ? "bg-emerald-50 text-emerald-700" : p.status === "draft" ? "bg-gray-100 text-[#191919]/50" : "bg-amber-50 text-amber-700"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-[#191919]/60">{p.views}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/property/${p.id}`)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-[#191919]/60 transition-colors hover:border-[#191919]/40"
                            >
                              View
                            </button>
                            {p.status === "published" && (
                              <button
                                onClick={async () => {
                                  const res = await api.properties.setStatus(p.id, "unpublished");
                                  if (res.ok) load();
                                }}
                                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-[#191919]/60 transition-colors hover:border-[#191919]/40"
                              >
                                Unpublish
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Remove “${p.title}” from the platform?`)) return;
                                const res = await api.properties.remove(p.id);
                                if (res.ok) load();
                              }}
                              aria-label="Remove listing"
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[#191919]/50 transition-colors hover:border-red-200 hover:text-red-600"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------- Users ---------- */}
        {tab === "users" && (
          <>
            {!users ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-[#191919]/50">
                      <th className="p-3 font-medium">User</th>
                      <th className="p-3 font-medium">Role</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Joined</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-100 last:border-0">
                        <td className="p-3">
                          <p className="font-medium text-[#191919]">{u.name}</p>
                          <p className="text-xs text-[#191919]/50">{u.email}</p>
                        </td>
                        <td className="p-3 text-xs capitalize text-[#191919]/70">{u.role}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-[#191919]/60">{formatDate(u.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1.5">
                            {u.id !== user?.id && (
                              <>
                                <button
                                  onClick={async () => {
                                    const res = await api.admin.setUserStatus(u.id, u.status === "active" ? "suspended" : "active");
                                    if (res.ok) load();
                                  }}
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-[#191919]/60 transition-colors hover:border-[#191919]/40"
                                >
                                  {u.status === "active" ? "Suspend" : "Restore"}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Remove ${u.email}? Their listings will be unpublished.`)) return;
                                    const res = await api.admin.removeUser(u.id);
                                    if (res.ok) load();
                                  }}
                                  aria-label="Remove user"
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[#191919]/50 transition-colors hover:border-red-200 hover:text-red-600"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {u.id === user?.id && <span className="text-[11px] text-[#191919]/30">you</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------- Reports ---------- */}
        {tab === "reports" && (
          <>
            {!reports ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <p className="font-serif text-xl text-[#191919]">No reports</p>
                <p className="mt-2 text-sm text-[#191919]/50">Community reports land here for review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <button onClick={() => navigate(`/property/${r.propertyId}`)} className="text-sm font-semibold text-[#191919] hover:underline">
                          {r.propertyTitle}
                        </button>
                        <p className="mt-0.5 text-xs text-[#191919]/50">
                          {r.reason} · reported {timeAgo(r.createdAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        r.status === "open" ? "bg-amber-50 text-amber-700" : r.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-[#191919]/50"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-3 rounded-lg bg-[#F4F3F3] p-3 text-sm text-[#191919]/75">{r.details}</p>
                    {r.resolutionNote && <p className="mt-2 text-xs text-[#191919]/50">Resolution note: {r.resolutionNote}</p>}
                    {r.status === "open" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={async () => {
                            const note = window.prompt("Resolution note:", "Reviewed — listing corrected.");
                            if (note === null) return;
                            const res = await api.admin.resolveReport(r.id, "resolve", note);
                            if (res.ok) load();
                          }}
                          className="rounded-lg bg-[#191919] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#191919]/90"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={async () => {
                            const res = await api.admin.resolveReport(r.id, "dismiss", "No action needed.");
                            if (res.ok) load();
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#191919]/70 transition-colors hover:border-[#191919]/40"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- System checks ---------- */}
        {tab === "checks" && (
          <div className="max-w-2xl">
            <p className="text-sm leading-relaxed text-[#191919]/60">
              Runs real assertions against the platform's core logic — validation, search filtering and
              sorting, pagination, similarity scoring, rate limiting and password hashing. Nothing is
              mutated; the live dataset is untouched.
            </p>
            <button
              onClick={() => void runChecks()}
              disabled={checksBusy}
              className="mt-4 rounded-lg bg-[#191919] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#191919]/90 disabled:opacity-60"
            >
              {checksBusy ? "Running…" : checks ? "Run again" : "Run system checks"}
            </button>
            {checksBusy && (
              <div className="mt-6 flex justify-center py-8"><Loader className="h-5 w-5" /></div>
            )}
            {checks && (
              <div className="mt-6 space-y-2">
                {checks.map((c) => (
                  <div key={c.name} className={`flex items-start gap-3 rounded-xl border p-4 ${c.passed ? "border-gray-200 bg-white" : "border-red-200 bg-red-50"}`}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {c.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#191919]">{c.name}</p>
                      <p className="mt-0.5 text-xs text-[#191919]/50">{c.detail}</p>
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-right text-xs font-semibold text-[#191919]">
                  {checks.filter((c) => c.passed).length} / {checks.length} passed
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Audit ---------- */}
        {tab === "audit" && (
          <>
            {!audit ? (
              <div className="flex justify-center py-16"><Loader className="h-5 w-5" /></div>
            ) : (
              <div className="max-w-3xl space-y-2">
                {audit.map((a) => (
                  <div key={a.id} className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#191919]">
                        {a.action} <span className="font-normal text-[#191919]/50">→ {a.target}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#191919]/45">{a.actorEmail} · {timeAgo(a.at)}</p>
                      {a.note && <p className="mt-1 text-xs text-[#191919]/60">{a.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
