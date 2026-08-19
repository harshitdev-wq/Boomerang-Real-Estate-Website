/**
 * Global modals: authentication (sign in / register / password reset),
 * property inquiry, visit request and listing report. Each performs
 * client validation, then hands off to the API layer which validates
 * again server-side and applies rate limits.
 */
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/services/api";
import { useStore } from "@/context/StoreContext";
import type { Property, Role } from "@/lib/types";
import { validateRegister, validateReport } from "@/lib/validation";
import { Loader, X } from "./Icons";

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#191919] placeholder:text-[#191919]/35 outline-none transition-colors duration-200 focus:border-[#191919]";

/* ------------------------------------------------------------------ */
/* Auth modal                                                          */
/* ------------------------------------------------------------------ */
export function AuthModal() {
  const { authMode, setAuthMode, login, register, toast } = useStore();
  const [mode, setMode] = useState<"signin" | "register" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [resetToken, setResetToken] = useState("");
  const [demoHint, setDemoHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authMode) {
      setMode(authMode);
      setError(null);
      setDemoHint("");
    }
  }, [authMode]);

  if (!authMode) return null;
  const close = () => setAuthMode(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const err = await login(email, password);
        if (err) setError(err);
        else close();
      } else if (mode === "register") {
        const errs = validateRegister(email, name, password);
        if (errs.length) {
          setError(errs[0].message);
        } else {
          const err = await register({ name, email, password, phone, role });
          if (err) setError(err);
          else close();
        }
      } else if (mode === "reset") {
        if (!resetToken) {
          const res = await api.auth.requestPasswordReset(email);
          if (res.ok) {
            setDemoHint(
              res.data.demoToken
                ? `Demo mode: no email is sent. Your reset code is ${res.data.demoToken}`
                : "If that email exists, a reset code is on its way.",
            );
          }
        } else {
          const res = await api.auth.resetPassword(email, resetToken, password);
          if (!res.ok) setError(res.error.message);
          else {
            toast("Password updated — sign in with your new password.", "success");
            setMode("signin");
            setResetToken("");
            setDemoHint("");
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#191919]/40 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl text-[#191919]">
            {mode === "signin" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset your password"}
          </h2>
          <button onClick={close} aria-label="Close" className="p-1 text-[#191919]/50 transition-colors hover:text-[#191919]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex rounded-lg bg-[#F4F3F3] p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "signin" ? "bg-white text-[#191919] shadow-sm" : "text-[#191919]/50"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "register" ? "bg-white text-[#191919] shadow-sm" : "text-[#191919]/50"}`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setMode("reset")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "reset" ? "bg-white text-[#191919] shadow-sm" : "text-[#191919]/50"}`}
            >
              Reset
            </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <>
              <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className={inputCls}
            type="password"
            placeholder={mode === "reset" && resetToken ? "New password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "reset" && (
            <input className={inputCls} placeholder="Reset code" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
          )}
          {mode === "register" && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[#191919]/60">I am a…</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${role === "buyer" ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"}`}
                >
                  Buyer / renter
                </button>
                <button
                  type="button"
                  onClick={() => setRole("agent")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${role === "agent" ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"}`}
                >
                  Agent / seller
                </button>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {demoHint && (
            <p className="rounded-lg bg-[#F4F3F3] px-3 py-2 text-xs text-[#191919]/70">{demoHint}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90 disabled:opacity-60"
          >
            {busy ? <Loader className="border-white/30 border-t-white" /> : null}
            {mode === "signin" ? "Sign In" : mode === "register" ? "Create account" : resetToken ? "Set new password" : "Send reset code"}
          </button>
        </form>

        {mode === "signin" && (
          <>
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="mt-3 text-xs text-[#191919]/50 underline-offset-2 transition-colors hover:text-[#191919] hover:underline"
            >
              Forgot your password?
            </button>
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#191919]/40">Demo accounts</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: "Buyer", email: "marcus@boomerang.demo" },
                  { label: "Agent", email: "sofia@boomerang.demo" },
                  { label: "Admin", email: "admin@boomerang.demo" },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("demo1234");
                    }}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-[#191919]/60 transition-colors hover:border-[#191919]/40 hover:text-[#191919]"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#191919]/40">Password for all demo accounts: demo1234</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared modal shell                                                  */
/* ------------------------------------------------------------------ */
function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#191919]/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-[#191919]">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-[#191919]/50">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-[#191919]/50 transition-colors hover:text-[#191919]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inquiry modal                                                       */
/* ------------------------------------------------------------------ */
export function InquiryModal({ property, onClose }: { property: Property; onClose: () => void }) {
  const { user, requireAuth, toast } = useStore();
  const [message, setMessage] = useState("");
  const [contactPref, setContactPref] = useState<"email" | "phone" | "any">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    setError(null);
    setBusy(true);
    const res = await api.inquiries.create(property.id, { message, contactPref });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast("Inquiry sent — the agent will get back to you.", "success");
    onClose();
  };

  return (
    <Sheet title={`Message ${property.agent.name.split(" ")[0]}`} subtitle={`About ${property.title}`} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <textarea
          className={`${inputCls} min-h-[120px] resize-y`}
          placeholder="Introduce yourself and ask about availability, pricing details, viewing times…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
        />
        <div>
          <p className="mb-1.5 text-xs font-medium text-[#191919]/60">Preferred contact</p>
          <div className="flex gap-2">
            {(["email", "phone", "any"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setContactPref(p)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${contactPref === p ? "border-[#191919] bg-[#191919] text-white" : "border-gray-200 text-[#191919]/60 hover:border-[#191919]/40"}`}
              >
                {p === "any" ? "Either" : p}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {!user && (
          <p className="rounded-lg bg-[#F4F3F3] px-3 py-2 text-xs text-[#191919]/60">
            You'll need to sign in to send this inquiry.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90 disabled:opacity-60"
        >
          {busy ? <Loader className="border-white/30 border-t-white" /> : null}
          Send inquiry
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Visit modal                                                         */
/* ------------------------------------------------------------------ */
export function VisitModal({ property, onClose }: { property: Property; onClose: () => void }) {
  const { requireAuth, toast } = useStore();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    setError(null);
    setBusy(true);
    const res = await api.visits.create(property.id, { date, time, note });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast("Visit requested — the agent will confirm shortly.", "success");
    onClose();
  };

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <Sheet title="Request a visit" subtitle={property.title} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#191919]/60">Date</label>
            <input type="date" min={minDate} className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#191919]/60">Time</label>
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#191919]/60">Anything the agent should know? (optional)</label>
          <textarea
            className={`${inputCls} min-h-[70px] resize-y`}
            placeholder="Number of people attending, pets, financing status…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90 disabled:opacity-60"
        >
          {busy ? <Loader className="border-white/30 border-t-white" /> : null}
          Request visit
        </button>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Report modal                                                        */
/* ------------------------------------------------------------------ */
export function ReportModal({ property, onClose }: { property: Property; onClose: () => void }) {
  const { requireAuth, toast } = useStore();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    const errs = validateReport(reason, details);
    if (errs.length) {
      setError(errs[0].message);
      return;
    }
    setError(null);
    setBusy(true);
    const res = await api.reports.create(property.id, { reason, details });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    toast("Report submitted — our moderation team will review it.", "success");
    onClose();
  };

  return (
    <Sheet title="Report this listing" subtitle={property.title} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-[#191919]/60">What's wrong?</p>
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason…</option>
            {["Spam or scam", "Fraudulent listing", "Inaccurate information", "Duplicate listing", "Inappropriate content", "Other"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          placeholder="Tell us what you noticed (at least 10 characters)…"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#191919] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#191919]/90 disabled:opacity-60"
        >
          {busy ? <Loader className="border-white/30 border-t-white" /> : null}
          Submit report
        </button>
        <p className="text-[11px] text-[#191919]/40">
          Reports are reviewed by human moderators — flagged listings are never removed automatically.
        </p>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Share helper                                                        */
/* ------------------------------------------------------------------ */
export async function shareProperty(property: Property, toast: (m: string, t?: "info" | "success" | "error") => void) {
  const url = `${window.location.origin}${window.location.pathname}#/property/${property.id}`;
  const data = { title: property.title, text: `${property.title} — ${property.city}, ${property.region}`, url };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("Link copied to clipboard.", "success");
  } catch {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard.", "success");
    } catch {
      toast("Couldn't copy the link automatically.", "error");
    }
  }
}
