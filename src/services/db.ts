/**
 * Data layer. In this static deployment the "database" is an in-memory store
 * persisted to localStorage (the production equivalent is PostgreSQL with the
 * same relations + indexes — no data is ever destroyed on startup).
 */
import type {
  AuditEntry,
  FavoriteEntry,
  Inquiry,
  Property,
  ReportEntry,
  SessionEntry,
  User,
  VisitRequest,
} from "@/lib/types";
import { hashPassword } from "./authCore";
import { buildSeedDB } from "@/data/seed";

export interface PasswordReset {
  email: string;
  token: string;
  expiresAt: string;
}

export interface DB {
  version: number;
  users: User[];
  properties: Property[];
  inquiries: Inquiry[];
  visits: VisitRequest[];
  favorites: FavoriteEntry[];
  reports: ReportEntry[];
  audit: AuditEntry[];
  sessions: SessionEntry[];
  passwordResets: PasswordReset[];
}

const KEY = "boomerang.re.db.v1";
const DB_VERSION = 1;
const DEMO_PASSWORD = "demo1234";

let db: DB | null = null;

export function getDB(): DB {
  if (!db) throw new Error("Database not ready — call ensureReady() first.");
  return db;
}

export async function ensureReady(): Promise<DB> {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === DB_VERSION && Array.isArray(parsed.properties)) {
        db = parsed;
        return db;
      }
    }
  } catch {
    // corrupted / unavailable storage — rebuild from seed in memory
  }
  const seeded = buildSeedDB();
  for (const u of seeded.users) {
    u.passwordHash = await hashPassword(DEMO_PASSWORD, u.salt);
  }
  db = seeded;
  persist();
  return db;
}

export function persist(): void {
  if (!db) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // storage quota exceeded or private mode — keep working in memory
  }
}

export function auditEntry(actor: User, action: string, target: string, note?: string): void {
  getDB().audit.unshift({
    id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    target,
    note,
    at: new Date().toISOString(),
  });
  if (getDB().audit.length > 500) getDB().audit.length = 500;
}
