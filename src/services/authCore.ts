/**
 * Password hashing & token generation (server-side auth core).
 * Uses PBKDF2-SHA256 via WebCrypto — passwords are never stored in plaintext.
 *
 * NOTE: in this static deployment the "backend" runs in-browser (see services/api.ts).
 * In production this module maps 1:1 to server-side code — the API contract and
 * hashing approach stay identical, only the transport changes.
 */
export function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const ITERATIONS = 120_000;

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (crypto.subtle) {
    const key = await crypto.subtle.importKey("raw", data, "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: ITERATIONS },
      key,
      256,
    );
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Demo fallback for non-secure contexts (e.g. file://). NOT for production use.
  let h = 5381;
  for (let round = 0; round < 2000; round++) {
    for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data[i]) | 0;
  }
  return `demo-${h.toString(16)}`;
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}
