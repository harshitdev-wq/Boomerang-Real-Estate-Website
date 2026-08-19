/**
 * Input validation shared by the UI and the API layer.
 * The API layer validates again server-side (services/api.ts) — the frontend
 * is never trusted on its own.
 */
import type { PropertyInput, SearchParams } from "./types";
import { AMENITIES, FURNISHING_OPTIONS, LISTING_TYPES, PROPERTY_TYPES } from "./types";

export type FieldError = { field: string; message: string };

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

export function sanitizeText(s: string): string {
  return s.replace(/[<>]/g, "").trim();
}

export function isFutureDate(dateStr: string): boolean {
  const t = new Date(`${dateStr}T23:59:59`);
  return !isNaN(t.getTime()) && t.getTime() >= Date.now();
}

export function isValidLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export function validMediaUrl(s: string): boolean {
  if (/^(https?:|blob:|data:image\/)/i.test(s)) return true;
  return false;
}

export function validTourUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const AMENITY_SET = new Set<string>(AMENITIES);

export function validatePropertyInput(input: Partial<PropertyInput>, draft = false): FieldError[] {
  const errs: FieldError[] = [];
  if (!input.title || sanitizeText(input.title).length < 4)
    errs.push({ field: "title", message: "Title must be at least 4 characters." });
  if (!input.description || sanitizeText(input.description).length < 40)
    errs.push({ field: "description", message: "Description must be at least 40 characters." });
  if (!input.type || !PROPERTY_TYPES.includes(input.type))
    errs.push({ field: "type", message: "Choose a valid property type." });
  if (!input.listingType || !LISTING_TYPES.includes(input.listingType))
    errs.push({ field: "listingType", message: "Choose sale, rent or lease." });
  if (input.price == null || !Number.isFinite(input.price) || input.price <= 0 || input.price > 1e9)
    errs.push({ field: "price", message: "Price must be a positive number." });
  if (input.area == null || !Number.isFinite(input.area) || input.area <= 0 || input.area > 1e6)
    errs.push({ field: "area", message: "Area must be a positive number." });
  const intIn = (n: number | undefined, min: number, max: number) =>
    n != null && Number.isInteger(n) && n >= min && n <= max;
  if (!intIn(input.bedrooms, 0, 20)) errs.push({ field: "bedrooms", message: "Bedrooms must be 0–20." });
  if (!intIn(input.bathrooms, 0, 20)) errs.push({ field: "bathrooms", message: "Bathrooms must be 0–20." });
  if (!intIn(input.parking, 0, 10)) errs.push({ field: "parking", message: "Parking spaces must be 0–10." });
  if (!intIn(input.floor, 0, 200)) errs.push({ field: "floor", message: "Floor must be 0–200." });
  if (!intIn(input.totalFloors, 0, 300)) errs.push({ field: "totalFloors", message: "Total floors must be 0–300." });
  if ((input.floor ?? 0) > (input.totalFloors ?? 0))
    errs.push({ field: "floor", message: "Floor cannot exceed total floors." });
  const yb = input.yearBuilt ?? 0;
  if (!Number.isInteger(yb) || yb < 1800 || yb > new Date().getFullYear() + 2)
    errs.push({ field: "yearBuilt", message: "Year built looks invalid." });
  if (!input.furnishing || !FURNISHING_OPTIONS.includes(input.furnishing))
    errs.push({ field: "furnishing", message: "Choose a furnishing status." });
  const amenities = input.amenities ?? [];
  if (amenities.length > 20 || amenities.some((a) => !AMENITY_SET.has(a)))
    errs.push({ field: "amenities", message: "Amenities contain invalid entries." });
  if (!input.address || sanitizeText(input.address).length < 5)
    errs.push({ field: "address", message: "Street address is required." });
  if (!input.city || input.city.trim().length < 2) errs.push({ field: "city", message: "City is required." });
  if (!input.region || input.region.trim().length < 2) errs.push({ field: "region", message: "State/region is required." });
  if (!input.country || input.country.trim().length < 2) errs.push({ field: "country", message: "Country is required." });
  if (!input.postalCode || input.postalCode.trim().length < 3)
    errs.push({ field: "postalCode", message: "Postal code is required." });
  if (input.lat == null || !isValidLat(input.lat)) errs.push({ field: "lat", message: "Latitude must be between -90 and 90." });
  if (input.lng == null || !isValidLng(input.lng)) errs.push({ field: "lng", message: "Longitude must be between -180 and 180." });
  if (!draft) {
    const photos = input.photos ?? [];
    if (photos.length === 0) errs.push({ field: "photos", message: "Add at least one photo." });
    if (photos.length > 24) errs.push({ field: "photos", message: "Maximum 24 media items." });
    for (const p of photos) {
      if (!validMediaUrl(p.url)) errs.push({ field: "photos", message: "One of the media URLs is invalid." });
      if (p.kind !== "image" && p.kind !== "video") errs.push({ field: "photos", message: "Unsupported media type." });
    }
    if (input.tourUrl && !validTourUrl(input.tourUrl))
      errs.push({ field: "tourUrl", message: "Tour URL must be a valid http(s) link." });
  }
  return errs;
}

export function validateSearchParams(p: SearchParams): FieldError[] {
  const errs: FieldError[] = [];
  if (!Number.isInteger(p.page) || p.page < 1) errs.push({ field: "page", message: "page must be a positive integer." });
  if (!Number.isInteger(p.limit) || p.limit < 1 || p.limit > 50)
    errs.push({ field: "limit", message: "limit must be between 1 and 50." });
  if (p.q && p.q.length > 120) errs.push({ field: "q", message: "q is too long." });
  if (p.type && !PROPERTY_TYPES.includes(p.type)) errs.push({ field: "type", message: "Unknown property type." });
  if (p.listingType && !LISTING_TYPES.includes(p.listingType))
    errs.push({ field: "listingType", message: "Unknown listing type." });
  const posNum = (n: number | null) => n != null && (!Number.isFinite(n) || n < 0);
  if (posNum(p.priceMin)) errs.push({ field: "priceMin", message: "priceMin cannot be negative." });
  if (posNum(p.priceMax)) errs.push({ field: "priceMax", message: "priceMax cannot be negative." });
  if (posNum(p.areaMin)) errs.push({ field: "areaMin", message: "areaMin cannot be negative." });
  if (posNum(p.areaMax)) errs.push({ field: "areaMax", message: "areaMax cannot be negative." });
  if (p.beds != null && (p.beds < 0 || p.beds > 20)) errs.push({ field: "beds", message: "beds must be 0–20." });
  if (p.baths != null && (p.baths < 0 || p.baths > 20)) errs.push({ field: "baths", message: "baths must be 0–20." });
  if (p.furnishing && !FURNISHING_OPTIONS.includes(p.furnishing))
    errs.push({ field: "furnishing", message: "Unknown furnishing value." });
  if (p.amenities.length > 20) errs.push({ field: "amenities", message: "Too many amenities." });
  if (p.bounds) {
    const b = p.bounds;
    if (!isValidLat(b.n) || !isValidLat(b.s) || !isValidLng(b.e) || !isValidLng(b.w) || b.n < b.s || b.e < b.w)
      errs.push({ field: "bounds", message: "Invalid map bounds." });
  }
  return errs;
}

export function validateInquiry(message: string, contactPref: string): FieldError[] {
  const errs: FieldError[] = [];
  const clean = sanitizeText(message);
  if (clean.length < 20) errs.push({ field: "message", message: "Tell the agent a little more (at least 20 characters)." });
  if (clean.length > 2000) errs.push({ field: "message", message: "Message must be under 2000 characters." });
  if (!["email", "phone", "any"].includes(contactPref))
    errs.push({ field: "contactPref", message: "Choose a contact preference." });
  return errs;
}

export function validateVisit(date: string, time: string): FieldError[] {
  const errs: FieldError[] = [];
  if (!isFutureDate(date)) errs.push({ field: "date", message: "Pick a date that is today or later." });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errs.push({ field: "time", message: "Pick a valid time." });
  return errs;
}

export function validateReport(reason: string, details: string): FieldError[] {
  const errs: FieldError[] = [];
  if (!reason) errs.push({ field: "reason", message: "Choose a reason." });
  const clean = sanitizeText(details);
  if (clean.length < 10) errs.push({ field: "details", message: "Add a short explanation (at least 10 characters)." });
  return errs;
}

export function validateRegister(email: string, name: string, password: string): FieldError[] {
  const errs: FieldError[] = [];
  if (!isEmail(email)) errs.push({ field: "email", message: "Enter a valid email address." });
  if (name.trim().length < 2) errs.push({ field: "name", message: "Enter your name." });
  if (password.length < 8) errs.push({ field: "password", message: "Password must be at least 8 characters." });
  if (password.length > 128) errs.push({ field: "password", message: "Password is too long." });
  return errs;
}
