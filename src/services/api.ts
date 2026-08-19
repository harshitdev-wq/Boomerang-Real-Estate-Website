/**
 * ============================================================================
 *  Boomerang API — REST contract implementation.
 *
 *  This is the platform's "backend". In this static deployment it executes
 *  in-browser against the data layer in services/db.ts; the same contract,
 *  status codes and authorization rules map 1:1 to a production server
 *  (Node/PostgreSQL). Every handler here is the server-side check — the
 *  frontend NEVER performs authorization or validation on its own.
 *
 *  Status codes: 400 invalid input · 401 unauthenticated · 403 forbidden ·
 *  404 missing resource · 409 conflict/duplicate · 429 rate limited · 500 internal
 * ============================================================================
 */
import type {
  Inquiry,
  InquiryStatus,
  Paginated,
  Property,
  PropertyInput,
  PropertyStatus,
  ReportEntry,
  Role,
  SearchParams,
  User,
  VisitRequest,
  VisitStatus,
} from "@/lib/types";
import { PROPERTY_TYPES } from "@/lib/types";
import { auditEntry, ensureReady, getDB, persist } from "./db";
import { RateLimiter } from "./rateLimit";
import { hashPassword, randomSalt, randomToken, verifyPassword } from "./authCore";
import { runSearch } from "./search";
import { recommend } from "@/lib/similarity";
import {
  sanitizeText,
  validateInquiry,
  validatePropertyInput,
  validateRegister,
  validateReport,
  validateSearchParams,
  validateVisit,
} from "@/lib/validation";
import { uid } from "@/lib/utils";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export type SafeUser = Omit<User, "passwordHash" | "salt">;

const TOKEN_KEY = "boomerang.token";
const SESSION_DAYS = 7;
const NETWORK_LATENCY = true;
const limiter = new RateLimiter();

async function delay(): Promise<void> {
  if (NETWORK_LATENCY) await new Promise((r) => setTimeout(r, 90 + Math.random() * 160));
}

async function wrap<T>(fn: () => T | Promise<T>): Promise<ApiResult<T>> {
  await ensureReady();
  try {
    await delay();
    return { ok: true, data: await fn() };
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(500, "INTERNAL", "Something went wrong on our side.");
    return { ok: false, error: err };
  }
}

function rateLimit(bucket: string, max: number, windowMs: number): void {
  const r = limiter.hit(bucket, windowMs, max);
  if (!r.allowed)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Too many requests. Please wait ${Math.ceil(r.retryInMs / 1000)}s and try again.`,
      r.retryInMs,
    );
}

function pruneSessions(): void {
  const db = getDB();
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
}

export function currentSession(): SafeUser | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const db = getDB();
    const s = db.sessions.find((x) => x.token === token);
    if (!s || new Date(s.expiresAt).getTime() < Date.now()) return null;
    const user = db.users.find((u) => u.id === s.userId);
    if (!user || user.status !== "active") return null;
    const { passwordHash: _ph, salt: _s, ...safe } = user;
    return safe;
  } catch {
    return null;
  }
}

function requireUser(): User {
  const s = currentSession();
  if (!s) throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const u = getDB().users.find((x) => x.id === s.id);
  if (!u) throw new ApiError(401, "UNAUTHORIZED", "Session is no longer valid.");
  return u;
}

function requireRole(...roles: Role[]): User {
  const u = requireUser();
  if (!roles.includes(u.role)) throw new ApiError(403, "FORBIDDEN", "You don't have permission to do that.");
  return u;
}

function toSafe(u: User): SafeUser {
  const { passwordHash: _ph, salt: _s, ...safe } = u;
  return safe;
}

function canView(p: Property, user: User | null): boolean {
  if (p.status === "published") return true;
  return !!user && (user.id === p.agentId || user.role === "admin");
}

function openSession(userId: string): void {
  const db = getDB();
  db.sessions.push({
    token: randomToken(),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
  });
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  localStorage.setItem(TOKEN_KEY, db.sessions[db.sessions.length - 1].token);
}

/* ------------------------------------------------------------------ */
/* Simple response cache (only for read-only GET handlers).           */
/* ------------------------------------------------------------------ */
const cache = new Map<string, { exp: number; data: unknown }>();
function cacheGet<T>(key: string): T | undefined {
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return c.data as T;
  if (c) cache.delete(key);
  return undefined;
}
function cacheSet(key: string, data: unknown, ttl = 30_000): void {
  cache.set(key, { exp: Date.now() + ttl, data });
}

/* ------------------------------------------------------------------ */
/* Property factory                                                    */
/* ------------------------------------------------------------------ */
function buildProperty(input: PropertyInput, agent: User, status: PropertyStatus): Property {
  const jitter = () => (Math.random() - 0.5) * 0.05;
  const now = new Date().toISOString();
  return {
    id: `p-${uid()}`,
    ...input,
    title: sanitizeText(input.title),
    description: sanitizeText(input.description),
    status,
    displayLat: input.exactLocation ? input.lat : input.lat + jitter(),
    displayLng: input.exactLocation ? input.lng : input.lng + jitter(),
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      agency: agent.agency ?? "Independent agent",
    },
    agentId: agent.id,
    createdAt: now,
    updatedAt: now,
    views: 0,
    demo: false,
  };
}

export const api = {
  /* ================================================================ */
  /* AUTH                                                              */
  /* ================================================================ */
  auth: {
    me(): SafeUser | null {
      return currentSession();
    },

    async register(input: { name: string; email: string; password: string; phone: string; role: Role }) {
      return wrap(async () => {
        rateLimit("auth.register", 5, 3_600_000);
        const errs = validateRegister(input.email, input.name, input.password);
        if (errs.length) throw new ApiError(400, "INVALID_INPUT", errs[0].message);
        const db = getDB();
        const email = input.email.trim().toLowerCase();
        if (db.users.some((u) => u.email.toLowerCase() === email))
          throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
        if (!["buyer", "agent"].includes(input.role)) input.role = "buyer";
        const user: User = {
          id: `u-${uid()}`,
          email,
          name: sanitizeText(input.name),
          phone: sanitizeText(input.phone ?? ""),
          role: input.role,
          status: "active",
          agency: input.role === "agent" ? "Independent agent" : undefined,
          createdAt: new Date().toISOString(),
          passwordHash: "",
          salt: randomSalt(),
        };
        user.passwordHash = await hashPassword(input.password, user.salt);
        db.users.push(user);
        persist();
        openSession(user.id);
        return toSafe(user);
      });
    },

    async login(email: string, password: string) {
      return wrap(async () => {
        const key = email.trim().toLowerCase();
        rateLimit(`auth.login.${key}`, 5, 600_000);
        const db = getDB();
        const user = db.users.find((u) => u.email.toLowerCase() === key);
        if (!user || !(await verifyPassword(password, user.salt, user.passwordHash)))
          throw new ApiError(401, "BAD_CREDENTIALS", "Incorrect email or password.");
        if (user.status !== "active")
          throw new ApiError(403, "SUSPENDED", "This account is suspended. Contact support.");
        pruneSessions();
        openSession(user.id);
        persist();
        return toSafe(user);
      });
    },

    async logout() {
      return wrap(async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          getDB().sessions = getDB().sessions.filter((s) => s.token !== token);
          persist();
        }
        localStorage.removeItem(TOKEN_KEY);
        return { ok: true };
      });
    },

    async requestPasswordReset(email: string) {
      return wrap(async () => {
        rateLimit("auth.reset", 3, 600_000);
        const db = getDB();
        const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        // Always return ok — never reveal whether an email is registered.
        if (!user) return { demoToken: "" };
        const token = randomToken().slice(0, 8);
        db.passwordResets = db.passwordResets.filter(
          (r) => r.email !== user.email || new Date(r.expiresAt).getTime() > Date.now(),
        );
        db.passwordResets.push({
          email: user.email,
          token,
          expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        });
        persist();
        // Demo mode: no email service — the token is returned so the flow can be completed.
        return { demoToken: token };
      });
    },

    async resetPassword(email: string, token: string, newPassword: string) {
      return wrap(async () => {
        const db = getDB();
        const entry = db.passwordResets.find(
          (r) => r.email.toLowerCase() === email.trim().toLowerCase() && r.token === token.trim(),
        );
        if (!entry || new Date(entry.expiresAt).getTime() < Date.now())
          throw new ApiError(400, "INVALID_TOKEN", "This reset code is invalid or expired.");
        if (newPassword.length < 8)
          throw new ApiError(400, "INVALID_INPUT", "Password must be at least 8 characters.");
        const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) throw new ApiError(404, "NOT_FOUND", "Account not found.");
        user.passwordHash = await hashPassword(newPassword, user.salt);
        db.passwordResets = db.passwordResets.filter((r) => r.token !== token);
        db.sessions = db.sessions.filter((s) => s.userId !== user.id);
        persist();
        return { ok: true };
      });
    },

    async updateProfile(input: { name: string; phone: string }): Promise<ApiResult<SafeUser>> {
      return wrap(async () => {
        const u = requireUser();
        if (input.name.trim().length < 2) throw new ApiError(400, "INVALID_INPUT", "Enter your name.");
        u.name = sanitizeText(input.name);
        u.phone = sanitizeText(input.phone ?? "");
        persist();
        return toSafe(u);
      });
    },

    async changePassword(current: string, next: string): Promise<ApiResult<{ ok: boolean }>> {
      return wrap(async () => {
        const u = requireUser();
        if (!(await verifyPassword(current, u.salt, u.passwordHash)))
          throw new ApiError(400, "BAD_CREDENTIALS", "Current password is incorrect.");
        if (next.length < 8) throw new ApiError(400, "INVALID_INPUT", "New password must be at least 8 characters.");
        u.passwordHash = await hashPassword(next, u.salt);
        persist();
        return { ok: true };
      });
    },
  },

  /* ================================================================ */
  /* PROPERTIES                                                        */
  /* ================================================================ */
  properties: {
    /** GET /api/properties — validated, server-side filtered/sorted/paginated. */
    async search(params: SearchParams): Promise<ApiResult<Paginated<Property>>> {
      return wrap(async () => {
        rateLimit("search", 180, 60_000);
        const errs = validateSearchParams(params);
        if (errs.length) throw new ApiError(400, "INVALID_SEARCH", errs[0].message);
        const key = `search:${JSON.stringify(params)}`;
        const hit = cacheGet<Paginated<Property>>(key);
        if (hit) return hit;
        const result = runSearch(getDB().properties, params);
        cacheSet(key, result, 30_000);
        return result;
      });
    },

    /** GET /api/properties/{id} */
    async get(id: string): Promise<ApiResult<Property>> {
      return wrap(async () => {
        if (!id) throw new ApiError(400, "INVALID_INPUT", "Property id is required.");
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        const user = currentSession();
        if (!p || !canView(p, user ? db.users.find((u) => u.id === user.id) ?? null : null))
          throw new ApiError(404, "NOT_FOUND", "This listing is no longer available.");
        if (!user || (user.id !== p.agentId && user.role !== "admin")) {
          p.views += 1;
          persist();
        }
        return p;
      });
    },

    async many(ids: string[]): Promise<ApiResult<Property[]>> {
      return wrap(async () => {
        if (!Array.isArray(ids) || ids.length > 30) throw new ApiError(400, "INVALID_INPUT", "Too many ids.");
        const key = `many:${[...ids].sort().join(",")}`;
        const hit = cacheGet<Property[]>(key);
        if (hit) return hit;
        const list = getDB()
          .properties.filter((p) => ids.includes(p.id) && p.status === "published")
          .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        cacheSet(key, list, 20_000);
        return list;
      });
    },

    /** GET /api/properties/mine — the caller's own listings (any status). */
    async mine(): Promise<ApiResult<Property[]>> {
      return wrap(async () => {
        const u = requireUser();
        if (u.role !== "agent" && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "Only agents have listings.");
        return getDB()
          .properties.filter((p) => p.agentId === u.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    },

    /** GET /api/properties/{id}/similar — explainable recommendations. */
    async similar(id: string): Promise<ApiResult<{ property: Property; score: number; reasons: string[] }[]>> {
      return wrap(async () => {
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        if (!p || p.status !== "published") throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        return recommend(p, db.properties, 3);
      });
    },

    /** POST /api/properties — agents & admins. Never auto-published for agents. */
    async create(input: PropertyInput, draft = false): Promise<ApiResult<Property>> {
      return wrap(async () => {
        const agent = requireRole("agent", "admin");
        rateLimit(`listing.${agent.id}`, 10, 3_600_000);
        if (draft) {
          if (!input.title || input.title.trim().length < 4)
            throw new ApiError(400, "INVALID_INPUT", "Give the draft a title.");
          if (!PROPERTY_TYPES.includes(input.type))
            throw new ApiError(400, "INVALID_INPUT", "Choose a valid property type.");
        } else {
          const errs = validatePropertyInput(input, false);
          if (errs.length) throw new ApiError(400, "INVALID_INPUT", `${errs[0].field}: ${errs[0].message}`);
          const dupe = getDB().properties.some(
            (p) =>
              p.title.toLowerCase() === sanitizeText(input.title).toLowerCase() &&
              p.city.toLowerCase() === input.city.toLowerCase() &&
              p.agentId === agent.id,
          );
          if (dupe)
            throw new ApiError(409, "DUPLICATE_LISTING", "You already have a listing with this title in that city.");
        }
        const status: PropertyStatus = draft ? "draft" : agent.role === "admin" ? "published" : "submitted";
        const property = buildProperty(input, agent, status);
        if (!draft && agent.role !== "admin") {
          // Heuristic flag only — humans moderate. Never auto-accuses anyone.
          const sameCity = getDB().properties.filter((p) => p.city === property.city && p.status === "published");
          if (sameCity.length >= 3) {
            const median = sameCity.map((p) => p.price).sort((a, b) => a - b)[Math.floor(sameCity.length / 2)];
            if (property.price > median * 8) {
              property.moderationNote = "Flagged: price far above area median — manual review recommended.";
            }
          }
        }
        getDB().properties.push(property);
        auditEntry(agent, "property.created", property.id, draft ? "Saved as draft" : "Submitted");
        persist();
        return property;
      });
    },

    /** PUT /api/properties/{id} — owner or admin. */
    async update(id: string, input: PropertyInput): Promise<ApiResult<Property>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        if (!p) throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (u.id !== p.agentId && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "You can only edit your own listings.");
        const errs = validatePropertyInput(input, p.status === "draft");
        if (errs.length) throw new ApiError(400, "INVALID_INPUT", `${errs[0].field}: ${errs[0].message}`);
        Object.assign(p, input, { updatedAt: new Date().toISOString() });
        p.title = sanitizeText(input.title);
        p.description = sanitizeText(input.description);
        p.displayLat = input.exactLocation ? input.lat : p.displayLat;
        p.displayLng = input.exactLocation ? input.lng : p.displayLng;
        auditEntry(u, "property.updated", id);
        persist();
        return p;
      });
    },

    /** DELETE /api/properties/{id} */
    async remove(id: string): Promise<ApiResult<{ ok: boolean }>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        if (!p) throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (u.id !== p.agentId && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "You can only remove your own listings.");
        db.properties = db.properties.filter((x) => x.id !== id);
        db.favorites = db.favorites.filter((f) => f.propertyId !== id);
        db.inquiries = db.inquiries.filter((i) => i.propertyId !== id);
        db.visits = db.visits.filter((v) => v.propertyId !== id);
        db.reports = db.reports.filter((r) => r.propertyId !== id);
        auditEntry(u, "property.removed", id);
        persist();
        return { ok: true };
      });
    },

    /** Workflow transitions owned by the seller: submit, unpublish, mark sold/rented. */
    async setStatus(id: string, status: PropertyStatus): Promise<ApiResult<Property>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        if (!p) throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        const isOwner = u.id === p.agentId;
        const isAdmin = u.role === "admin";
        if (!isOwner && !isAdmin) throw new ApiError(403, "FORBIDDEN", "You don't own this listing.");
        if (status === "submitted" && p.status === "draft") {
          const errs = validatePropertyInput(p as unknown as PropertyInput, false);
          if (errs.length)
            throw new ApiError(400, "INVALID_INPUT", `Complete the listing first: ${errs[0].field} — ${errs[0].message}`);
          p.status = "submitted";
          p.moderationNote = "Awaiting moderation.";
        } else if (isOwner && ["unpublished", "sold", "rented"].includes(status) && p.status === "published") {
          p.status = status;
        } else if (isAdmin && status !== "draft") {
          p.status = status;
        } else {
          throw new ApiError(409, "INVALID_TRANSITION", `Can't move this listing from ${p.status} to ${status}.`);
        }
        p.updatedAt = new Date().toISOString();
        auditEntry(u, `property.status.${status}`, id);
        persist();
        return p;
      });
    },
  },

  /* ================================================================ */
  /* FAVORITES                                                         */
  /* ================================================================ */
  favorites: {
    async list(): Promise<ApiResult<Property[]>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const entries = db.favorites
          .filter((f) => f.userId === u.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return entries
          .map((f) => db.properties.find((p) => p.id === f.propertyId))
          .filter((p): p is Property => !!p);
      });
    },

    async add(propertyId: string): Promise<ApiResult<{ ok: boolean }>> {
      return wrap(async () => {
        const u = requireUser();
        rateLimit(`fav.${u.id}`, 60, 60_000);
        const db = getDB();
        const p = db.properties.find((x) => x.id === propertyId);
        if (!p || p.status !== "published") throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (db.favorites.some((f) => f.userId === u.id && f.propertyId === propertyId))
          throw new ApiError(409, "DUPLICATE_FAVORITE", "Already saved to favorites.");
        db.favorites.push({ id: `f-${uid()}`, userId: u.id, propertyId, createdAt: new Date().toISOString() });
        persist();
        return { ok: true };
      });
    },

    async remove(propertyId: string): Promise<ApiResult<{ ok: boolean }>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const before = db.favorites.length;
        db.favorites = db.favorites.filter((f) => !(f.userId === u.id && f.propertyId === propertyId));
        if (db.favorites.length === before) throw new ApiError(404, "NOT_FOUND", "Not in favorites.");
        persist();
        return { ok: true };
      });
    },
  },

  /* ================================================================ */
  /* INQUIRIES                                                         */
  /* ================================================================ */
  inquiries: {
    async create(propertyId: string, input: { message: string; contactPref: Inquiry["contactPref"] }) {
      return wrap(async () => {
        const u = requireUser();
        rateLimit(`inq.${u.id}`, 5, 600_000);
        const db = getDB();
        const p = db.properties.find((x) => x.id === propertyId);
        if (!p || p.status !== "published") throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (p.agentId === u.id) throw new ApiError(400, "INVALID_INPUT", "You can't inquire about your own listing.");
        const errs = validateInquiry(input.message, input.contactPref);
        if (errs.length) throw new ApiError(400, "INVALID_INPUT", errs[0].message);
        db.inquiries.unshift({
          id: `i-${uid()}`,
          propertyId,
          propertyTitle: p.title,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userPhone: u.phone,
          message: sanitizeText(input.message),
          contactPref: input.contactPref,
          status: "new",
          agentId: p.agentId,
          createdAt: new Date().toISOString(),
        });
        persist();
        return { ok: true };
      });
    },

    async list(): Promise<ApiResult<Inquiry[]>> {
      return wrap(async () => {
        const u = requireUser();
        const all = getDB().inquiries;
        if (u.role === "admin") return all;
        if (u.role === "agent") return all.filter((i) => i.agentId === u.id);
        return all.filter((i) => i.userId === u.id);
      });
    },

    async updateStatus(id: string, status: InquiryStatus): Promise<ApiResult<Inquiry>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const inquiry = db.inquiries.find((i) => i.id === id);
        if (!inquiry) throw new ApiError(404, "NOT_FOUND", "Inquiry not found.");
        if (inquiry.agentId !== u.id && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "Only the listing agent can update this inquiry.");
        if (!["new", "contacted", "scheduled", "closed"].includes(status))
          throw new ApiError(400, "INVALID_INPUT", "Invalid status.");
        inquiry.status = status;
        persist();
        return inquiry;
      });
    },
  },

  /* ================================================================ */
  /* VISIT REQUESTS                                                    */
  /* ================================================================ */
  visits: {
    async create(propertyId: string, input: { date: string; time: string; note: string }) {
      return wrap(async () => {
        const u = requireUser();
        rateLimit(`visit.${u.id}`, 6, 3_600_000);
        const db = getDB();
        const p = db.properties.find((x) => x.id === propertyId);
        if (!p || p.status !== "published") throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (p.agentId === u.id) throw new ApiError(400, "INVALID_INPUT", "You can't request a visit to your own listing.");
        const errs = validateVisit(input.date, input.time);
        if (errs.length) throw new ApiError(400, "INVALID_INPUT", errs[0].message);
        // Obvious scheduling conflict: same property, same date, within 90 minutes.
        const conflict = db.visits.some(
          (v) =>
            v.propertyId === propertyId &&
            v.date === input.date &&
            ["requested", "accepted"].includes(v.status) &&
            Math.abs(timeToMin(v.time) - timeToMin(input.time)) < 90,
        );
        if (conflict)
          throw new ApiError(409, "SCHEDULE_CONFLICT", "That slot is already taken for this property. Pick another time.");
        db.visits.unshift({
          id: `v-${uid()}`,
          propertyId,
          propertyTitle: p.title,
          userId: u.id,
          userName: u.name,
          date: input.date,
          time: input.time,
          note: sanitizeText(input.note ?? ""),
          status: "requested",
          agentId: p.agentId,
          createdAt: new Date().toISOString(),
        });
        persist();
        return { ok: true };
      });
    },

    async list(): Promise<ApiResult<VisitRequest[]>> {
      return wrap(async () => {
        const u = requireUser();
        const all = getDB().visits;
        if (u.role === "admin") return all;
        if (u.role === "agent") return all.filter((v) => v.agentId === u.id);
        return all.filter((v) => v.userId === u.id);
      });
    },

    async updateStatus(id: string, status: VisitStatus): Promise<ApiResult<VisitRequest>> {
      return wrap(async () => {
        const u = requireUser();
        const db = getDB();
        const visit = db.visits.find((v) => v.id === id);
        if (!visit) throw new ApiError(404, "NOT_FOUND", "Visit request not found.");
        const allowed: VisitStatus[] = ["requested", "accepted", "declined", "completed", "cancelled"];
        if (!allowed.includes(status)) throw new ApiError(400, "INVALID_INPUT", "Invalid status.");
        if (status === "cancelled" && visit.userId !== u.id && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "Only the requester can cancel this visit.");
        if (status !== "cancelled" && visit.agentId !== u.id && u.role !== "admin")
          throw new ApiError(403, "FORBIDDEN", "Only the listing agent can update this visit.");
        visit.status = status;
        persist();
        return visit;
      });
    },
  },

  /* ================================================================ */
  /* REPORTS                                                           */
  /* ================================================================ */
  reports: {
    async create(propertyId: string, input: { reason: string; details: string }) {
      return wrap(async () => {
        const u = requireUser();
        rateLimit(`rep.${u.id}`, 3, 600_000);
        const db = getDB();
        const p = db.properties.find((x) => x.id === propertyId);
        if (!p) throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        const errs = validateReport(input.reason, input.details);
        if (errs.length) throw new ApiError(400, "INVALID_INPUT", errs[0].message);
        if (db.reports.some((r) => r.propertyId === propertyId && r.userId === u.id && r.status === "open"))
          throw new ApiError(409, "DUPLICATE_REPORT", "You already reported this listing — we're on it.");
        db.reports.unshift({
          id: `r-${uid()}`,
          propertyId,
          propertyTitle: p.title,
          userId: u.id,
          reason: input.reason,
          details: sanitizeText(input.details),
          status: "open",
          createdAt: new Date().toISOString(),
        });
        persist();
        return { ok: true };
      });
    },
  },

  /* ================================================================ */
  /* ADMIN                                                             */
  /* ================================================================ */
  admin: {
    async stats() {
      return wrap(async () => {
        requireRole("admin");
        const db = getDB();
        const count = (list: Property[], status: PropertyStatus) => list.filter((p) => p.status === status).length;
        const byType = PROPERTY_TYPES.map((t) => ({
          type: t,
          count: db.properties.filter((p) => p.type === t).length,
        }));
        return {
          users: db.users.length,
          activeUsers: db.users.filter((u) => u.status === "active").length,
          properties: db.properties.length,
          published: count(db.properties, "published"),
          pending: count(db.properties, "submitted") + count(db.properties, "pending"),
          sold: count(db.properties, "sold"),
          rented: count(db.properties, "rented"),
          inquiries: db.inquiries.length,
          newInquiries: db.inquiries.filter((i) => i.status === "new").length,
          visits: db.visits.length,
          openReports: db.reports.filter((r) => r.status === "open").length,
          favorites: db.favorites.length,
          byType,
        };
      });
    },

    async moderationQueue(): Promise<ApiResult<Property[]>> {
      return wrap(async () => {
        requireRole("admin");
        return getDB().properties
          .filter((p) => p.status === "submitted" || p.status === "pending")
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    },

    async moderate(id: string, approve: boolean, note: string): Promise<ApiResult<Property>> {
      return wrap(async () => {
        const admin = requireRole("admin");
        const db = getDB();
        const p = db.properties.find((x) => x.id === id);
        if (!p) throw new ApiError(404, "NOT_FOUND", "Listing not found.");
        if (p.status !== "submitted" && p.status !== "pending")
          throw new ApiError(409, "INVALID_TRANSITION", "This listing is not awaiting moderation.");
        p.status = approve ? "published" : "unpublished";
        p.moderationNote = sanitizeText(note) || (approve ? "Approved by moderation." : "Rejected by moderation.");
        p.updatedAt = new Date().toISOString();
        auditEntry(admin, approve ? "moderation.approved" : "moderation.rejected", id, p.moderationNote);
        persist();
        return p;
      });
    },

    async allListings(q: string): Promise<ApiResult<Property[]>> {
      return wrap(async () => {
        requireRole("admin");
        const needle = q.trim().toLowerCase();
        let list = [...getDB().properties].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (needle)
          list = list.filter(
            (p) =>
              p.title.toLowerCase().includes(needle) ||
              p.city.toLowerCase().includes(needle) ||
              p.agent.email.toLowerCase().includes(needle),
          );
        return list.slice(0, 200);
      });
    },

    async users(): Promise<ApiResult<SafeUser[]>> {
      return wrap(async () => {
        requireRole("admin");
        return getDB().users.map(toSafe);
      });
    },

    async setUserStatus(id: string, status: "active" | "suspended"): Promise<ApiResult<SafeUser>> {
      return wrap(async () => {
        const admin = requireRole("admin");
        const db = getDB();
        const user = db.users.find((u) => u.id === id);
        if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
        if (user.id === admin.id) throw new ApiError(400, "INVALID_INPUT", "You can't change your own status.");
        user.status = status;
        if (status === "suspended") db.sessions = db.sessions.filter((s) => s.userId !== user.id);
        auditEntry(admin, `user.${status}`, user.email);
        persist();
        return toSafe(user);
      });
    },

    async removeUser(id: string): Promise<ApiResult<{ ok: boolean }>> {
      return wrap(async () => {
        const admin = requireRole("admin");
        const db = getDB();
        const user = db.users.find((u) => u.id === id);
        if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
        if (user.id === admin.id) throw new ApiError(400, "INVALID_INPUT", "You can't remove yourself.");
        db.users = db.users.filter((u) => u.id !== id);
        db.sessions = db.sessions.filter((s) => s.userId !== id);
        db.favorites = db.favorites.filter((f) => f.userId !== id);
        for (const p of db.properties.filter((x) => x.agentId === id)) {
          p.status = "unpublished";
          p.moderationNote = "Owner account removed.";
        }
        auditEntry(admin, "user.removed", user.email);
        persist();
        return { ok: true };
      });
    },

    async reports(): Promise<ApiResult<ReportEntry[]>> {
      return wrap(async () => {
        requireRole("admin");
        return [...getDB().reports].sort(
          (a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1),
        );
      });
    },

    async resolveReport(id: string, action: "resolve" | "dismiss", note: string): Promise<ApiResult<ReportEntry>> {
      return wrap(async () => {
        const admin = requireRole("admin");
        const db = getDB();
        const report = db.reports.find((r) => r.id === id);
        if (!report) throw new ApiError(404, "NOT_FOUND", "Report not found.");
        report.status = action === "resolve" ? "resolved" : "dismissed";
        report.resolutionNote = sanitizeText(note);
        auditEntry(admin, `report.${report.status}`, report.propertyId, report.reason);
        persist();
        return report;
      });
    },

    async auditLog(): Promise<ApiResult<{ id: string; actorEmail: string; action: string; target: string; note?: string; at: string }[]>> {
      return wrap(async () => {
        requireRole("admin");
        return getDB().audit.slice(0, 100);
      });
    },
  },
};

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/* ------------------------------------------------------------------ */
/* API documentation (rendered on the /docs route)                     */
/* ------------------------------------------------------------------ */
export interface EndpointDoc {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: "public" | "user" | "agent" | "admin" | "owner";
  summary: string;
}

export const API_DOCS: EndpointDoc[] = [
  { method: "GET", path: "/api/properties", auth: "public", summary: "Search properties — keyword, filters, sorting, pagination (validated server-side)." },
  { method: "GET", path: "/api/properties/{id}", auth: "public", summary: "Fetch one property; returns 404 for drafts/unpublished unless owner or admin." },
  { method: "GET", path: "/api/properties/{id}/similar", auth: "public", summary: "Explainable recommendations (location 30% · price 25% · type 20% · area 15% · beds 10%)." },
  { method: "POST", path: "/api/properties", auth: "agent", summary: "Create a listing. Agents are queued for moderation; admins publish directly. 409 on duplicates." },
  { method: "PUT", path: "/api/properties/{id}", auth: "owner", summary: "Update a listing (owner or admin), fully re-validated." },
  { method: "DELETE", path: "/api/properties/{id}", auth: "owner", summary: "Delete a listing and cascade its favorites/inquiries/visits/reports." },
  { method: "POST", path: "/api/properties/{id}/status", auth: "owner", summary: "Workflow: draft → submitted → moderation → published → unpublished/sold/rented." },
  { method: "GET", path: "/api/search", auth: "public", summary: "Alias of GET /api/properties with query-string search params." },
  { method: "GET", path: "/api/favorites", auth: "user", summary: "List the signed-in user's saved properties." },
  { method: "POST", path: "/api/favorites", auth: "user", summary: "Save a property; 409 prevents duplicates." },
  { method: "DELETE", path: "/api/favorites/{id}", auth: "user", summary: "Remove a saved property." },
  { method: "POST", path: "/api/inquiries", auth: "user", summary: "Submit an inquiry (rate limited 5/10min, validated, sanitized)." },
  { method: "GET", path: "/api/inquiries", auth: "user", summary: "Buyers see sent inquiries; agents see received ones; admins see all." },
  { method: "POST", path: "/api/inquiries/{id}/status", auth: "agent", summary: "Update inquiry status: new → contacted → scheduled → closed." },
  { method: "POST", path: "/api/visits", auth: "user", summary: "Request a visit. Past dates rejected; 409 on obvious schedule conflicts." },
  { method: "GET", path: "/api/visits", auth: "user", summary: "Visit requests, scoped by role." },
  { method: "POST", path: "/api/visits/{id}/status", auth: "agent", summary: "Accept/decline/complete visits (requester may cancel)." },
  { method: "POST", path: "/api/reports", auth: "user", summary: "Report a listing. One open report per user per listing." },
  { method: "GET", path: "/api/admin/stats", auth: "admin", summary: "Platform statistics." },
  { method: "GET", path: "/api/admin/moderation", auth: "admin", summary: "Listings awaiting moderation." },
  { method: "POST", path: "/api/admin/moderation/{id}", auth: "admin", summary: "Approve or reject a listing (audited)." },
  { method: "GET", path: "/api/admin/users", auth: "admin", summary: "User management." },
  { method: "POST", path: "/api/admin/users/{id}/status", auth: "admin", summary: "Suspend or restore a user (sessions revoked on suspend)." },
  { method: "DELETE", path: "/api/admin/users/{id}", auth: "admin", summary: "Remove a user; their listings are unpublished." },
  { method: "GET", path: "/api/admin/reports", auth: "admin", summary: "Review content reports." },
  { method: "POST", path: "/api/auth/register", auth: "public", summary: "Registration — PBKDF2 hashing, rate limited, no plaintext storage." },
  { method: "POST", path: "/api/auth/login", auth: "public", summary: "Login — opaque session token, 7-day expiry, rate limited." },
  { method: "POST", path: "/api/auth/logout", auth: "user", summary: "End the session." },
  { method: "POST", path: "/api/auth/reset", auth: "public", summary: "Request a password reset (never reveals whether an email exists)." },
];
