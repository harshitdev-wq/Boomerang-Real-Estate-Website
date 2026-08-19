/**
 * System check suite — runs real assertions against the platform's core
 * logic layers (validation, search pipeline, similarity, rate limiting,
 * password hashing). Available in the Admin panel ("System checks") and
 * run automatically in the console during development.
 */
import { runSearch } from "./search";
import { RateLimiter } from "./rateLimit";
import { hashPassword, verifyPassword } from "./authCore";
import { similarityScore } from "@/lib/similarity";
import {
  isEmail,
  isFutureDate,
  validatePropertyInput,
  validateSearchParams,
  validateVisit,
} from "@/lib/validation";
import type { Property, PropertyInput, SearchParams } from "@/lib/types";
import { EMPTY_SEARCH } from "@/lib/types";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const sampleInput: PropertyInput = {
  title: "Test Listing",
  description: "A sufficiently long description of this fictional test property for validation purposes.",
  type: "house",
  listingType: "sale",
  price: 350000,
  currency: "USD",
  area: 1500,
  areaUnit: "sqft",
  bedrooms: 3,
  bathrooms: 2,
  parking: 1,
  floor: 0,
  totalFloors: 2,
  yearBuilt: 2010,
  furnishing: "unfurnished",
  amenities: ["Garden"],
  address: "123 Test Street",
  city: "Austin",
  region: "TX",
  country: "USA",
  postalCode: "78704",
  lat: 30.2,
  lng: -97.7,
  exactLocation: true,
  photos: [{ id: "m1", url: "https://example.com/photo.jpg", alt: "Photo", kind: "image" }],
  tourUrl: "",
};

let seq = 0;
function makeProperty(over: Partial<Property>): Property {
  seq += 1;
  const base: Property = {
    id: `t${seq}`,
    ...sampleInput,
    status: "published",
    displayLat: sampleInput.lat,
    displayLng: sampleInput.lng,
    agent: { id: "a1", name: "Agent", email: "a@test.demo", phone: "123", agency: "Agency" },
    agentId: "a1",
    createdAt: new Date(2026, 0, seq).toISOString(),
    updatedAt: new Date(2026, 0, seq).toISOString(),
    views: 0,
    demo: true,
    ...over,
  };
  return base;
}

export async function runSystemChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const check = (name: string, passed: boolean, detail: string) => results.push({ name, passed, detail });

  // 1 — email validation
  check("Email validation", isEmail("buyer@example.com") && !isEmail("not-an-email"), "Rejects malformed emails.");

  // 2 — property input validation
  const bad = { ...sampleInput, price: -5 };
  const errs = validatePropertyInput(bad, false);
  check("Property validation", errs.some((e) => e.field === "price"), "Rejects negative prices.");

  const missingPhotos = { ...sampleInput, photos: [] };
  check("Media validation", validatePropertyInput(missingPhotos, false).some((e) => e.field === "photos"), "Requires at least one photo.");

  // 3 — coordinates
  const badLat = { ...sampleInput, lat: 120 };
  check("Coordinate validation", validatePropertyInput(badLat, false).some((e) => e.field === "lat"), "Rejects invalid latitude.");

  // 4 — visit dates
  const pastDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  check("Visit date validation", validateVisit(pastDate, "14:00").some((e) => e.field === "date"), "Rejects past dates.");
  check("Future date helper", isFutureDate(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)), "Accepts future dates.");

  // 5 — search params validation
  const badParams: SearchParams = { ...EMPTY_SEARCH, page: 0, limit: 999 };
  const perrs = validateSearchParams(badParams);
  check("Search param validation", perrs.some((e) => e.field === "page") && perrs.some((e) => e.field === "limit"), "Rejects page=0 and limit>50.");

  // 6 — search filtering
  const props = [
    makeProperty({ city: "Austin", price: 500000, bedrooms: 3, type: "house", area: 1600, createdAt: new Date(2026, 0, 1).toISOString() }),
    makeProperty({ city: "Denver", price: 300000, bedrooms: 2, type: "apartment", area: 900, createdAt: new Date(2026, 0, 2).toISOString() }),
    makeProperty({ city: "Austin", price: 800000, bedrooms: 4, type: "house", area: 2400, createdAt: new Date(2026, 0, 3).toISOString() }),
    makeProperty({ city: "Austin", price: 250000, bedrooms: 1, type: "studio", area: 500, status: "draft", createdAt: new Date(2026, 0, 4).toISOString() }),
  ];
  const filtered = runSearch(props, { ...EMPTY_SEARCH, city: "Austin" });
  check("Search: city filter", filtered.total === 2 && filtered.items.every((p) => p.city === "Austin"), "Drafts excluded, city filter applied.");

  // 7 — sorting
  const asc = runSearch(props, { ...EMPTY_SEARCH, sort: "price_asc" });
  check("Search: price sorting", asc.items[0].price === 250000 && asc.items[asc.items.length - 1].price === 800000, "Price low→high correct.");
  const desc = runSearch(props, { ...EMPTY_SEARCH, sort: "price_desc" });
  check("Search: reverse sorting", desc.items[0].price === 800000, "Price high→low correct.");

  // 8 — pagination metadata
  const page2 = runSearch(props, { ...EMPTY_SEARCH, limit: 2, page: 2 });
  check(
    "Search: pagination",
    page2.total === 3 && page2.total_pages === 2 && page2.items.length === 1,
    `total=${page2.total}, total_pages=${page2.total_pages}, page items=${page2.items.length}.`,
  );

  // 9 — keyword relevance
  const kw = runSearch(props, { ...EMPTY_SEARCH, q: "studio" });
  check("Search: keyword", kw.items.length === 1 && kw.items[0].type === "studio", "Keyword matches by type.");

  // 10 — similarity engine
  const base = makeProperty({ city: "Austin", price: 500000, type: "house", area: 1600, bedrooms: 3 });
  const sim = similarityScore(base, makeProperty({ city: "Austin", price: 520000, type: "house", area: 1700, bedrooms: 3 }));
  check("Similarity: scoring", sim.score > 0.8 && sim.reasons.length >= 3, `Score ${sim.score} with reasons: ${sim.reasons.join(", ")}.`);
  const far = similarityScore(base, makeProperty({ city: "Seattle", price: 3000000, type: "villa", area: 8000, bedrooms: 6 }));
  check("Similarity: ranking", far.score < 0.3, `Dissimilar listing scores low (${far.score}).`);

  // 11 — rate limiter
  const rl = new RateLimiter();
  let blocked = false;
  for (let i = 0; i < 6; i++) blocked = !rl.hit("test", 60_000, 5).allowed;
  check("Rate limiting", blocked, "6th request within window is blocked (429).");

  // 12 — password hashing
  const salt = "testsalt";
  const hash = await hashPassword("s3cret-password", salt);
  const ok = await verifyPassword("s3cret-password", salt, hash);
  const wrong = await verifyPassword("wrong-password", salt, hash);
  check("Password hashing", hash !== "s3cret-password" && ok && !wrong, "PBKDF2: hashes, verifies, rejects wrong password.");

  return results;
}
