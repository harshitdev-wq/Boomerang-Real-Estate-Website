/**
 * Domain model for the Boomerang real-estate platform.
 * These entities mirror the REST API contract implemented in services/api.ts
 * (endpoints, request/response shapes and status codes are documented in API_DOCS there).
 */

export type Role = "buyer" | "agent" | "admin";
export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  status: UserStatus;
  agency?: string;
  createdAt: string;
  passwordHash: string;
  salt: string;
}

export type ListingType = "sale" | "rent" | "lease";
export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "townhouse"
  | "studio"
  | "loft"
  | "villa"
  | "duplex";
export type Furnishing = "furnished" | "semi-furnished" | "unfurnished";
export type PropertyStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "published"
  | "unpublished"
  | "sold"
  | "rented";

export interface MediaItem {
  id: string;
  url: string;
  alt: string;
  kind: "image" | "video";
}

export interface AgentInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  agency: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  price: number;
  currency: string;
  area: number;
  areaUnit: "sqft" | "sqm";
  bedrooms: number;
  bathrooms: number;
  parking: number;
  floor: number;
  totalFloors: number;
  yearBuilt: number;
  furnishing: Furnishing;
  status: PropertyStatus;
  amenities: string[];
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  /** Actual coordinates — never shown publicly when exactLocation is false. */
  lat: number;
  lng: number;
  /** Approximate coordinates used on the map when exactLocation is false. */
  displayLat: number;
  displayLng: number;
  exactLocation: boolean;
  photos: MediaItem[];
  tourUrl?: string;
  has360?: boolean;
  panoSrc?: string;
  agent: AgentInfo;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  /** True for seeded sample data — always shown with a demo badge in the UI. */
  demo?: boolean;
  moderationNote?: string;
}

export type InquiryStatus = "new" | "contacted" | "scheduled" | "closed";

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  contactPref: "email" | "phone" | "any";
  status: InquiryStatus;
  agentId: string;
  createdAt: string;
}

export type VisitStatus = "requested" | "accepted" | "declined" | "completed" | "cancelled";

export interface VisitRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userName: string;
  date: string;
  time: string;
  note: string;
  status: VisitStatus;
  agentId: string;
  createdAt: string;
}

export interface FavoriteEntry {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
}

export interface ReportEntry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolutionNote?: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  note?: string;
  at: string;
}

export interface SessionEntry {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest" | "oldest";

export interface MapBounds {
  n: number;
  s: number;
  e: number;
  w: number;
}

export interface SearchParams {
  q: string;
  city: string;
  type: PropertyType | "";
  listingType: ListingType | "";
  priceMin: number | null;
  priceMax: number | null;
  beds: number | null;
  baths: number | null;
  areaMin: number | null;
  areaMax: number | null;
  furnishing: Furnishing | "";
  amenities: string[];
  parkingOnly: boolean;
  sort: SortKey;
  page: number;
  limit: number;
  bounds: MapBounds | null;
}

export interface Paginated<T> {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  items: T[];
}

export interface PropertyInput {
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  price: number;
  currency: string;
  area: number;
  areaUnit: "sqft" | "sqm";
  bedrooms: number;
  bathrooms: number;
  parking: number;
  floor: number;
  totalFloors: number;
  yearBuilt: number;
  furnishing: Furnishing;
  amenities: string[];
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
  exactLocation: boolean;
  photos: MediaItem[];
  tourUrl: string;
}

export const PROPERTY_TYPES: PropertyType[] = [
  "house",
  "apartment",
  "condo",
  "townhouse",
  "studio",
  "loft",
  "villa",
  "duplex",
];

export const LISTING_TYPES: ListingType[] = ["sale", "rent", "lease"];

export const FURNISHING_OPTIONS: Furnishing[] = ["furnished", "semi-furnished", "unfurnished"];

export const AMENITIES = [
  "Air conditioning",
  "Balcony",
  "Garden",
  "Garage",
  "Swimming pool",
  "Gym",
  "Elevator",
  "Fireplace",
  "Pet friendly",
  "Washer / Dryer",
  "Dishwasher",
  "Solar panels",
  "EV charging",
  "Smart home",
  "Storage",
  "Doorman",
  "Rooftop",
  "Playground",
  "Central heating",
  "Home office",
] as const;

export const PROPERTY_STATUSES: PropertyStatus[] = [
  "draft",
  "submitted",
  "pending",
  "published",
  "unpublished",
  "sold",
  "rented",
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price · low to high" },
  { value: "price_desc", label: "Price · high to low" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

export const REPORT_REASONS = [
  "Spam or scam",
  "Fraudulent listing",
  "Inaccurate information",
  "Duplicate listing",
  "Inappropriate content",
  "Other",
] as const;

export const EMPTY_SEARCH: SearchParams = {
  q: "",
  city: "",
  type: "",
  listingType: "",
  priceMin: null,
  priceMax: null,
  beds: null,
  baths: null,
  areaMin: null,
  areaMax: null,
  furnishing: "",
  amenities: [],
  parkingOnly: false,
  sort: "relevance",
  page: 1,
  limit: 12,
  bounds: null,
};

export const MAX_COMPARE = 4;
