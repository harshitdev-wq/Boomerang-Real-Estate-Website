/**
 * Demo dataset — EVERY seeded listing, user and conversation here is sample
 * data, flagged with `demo: true` and surfaced with a "Demo" badge in the UI.
 * No demo listing is ever presented as a real listing.
 *
 * Media: real stock photography (Pexels CDN) used purely as demo imagery.
 * The 360° panorama is a generated sample image.
 */
import type { DB } from "@/services/db";
import type { Property, PropertyInput, User } from "@/lib/types";
import demoPano from "@/assets/demo-pano.jpg";

const P = "https://images.pexels.com/photos/";
const IMG = (id: number, alt: string) => ({
  id: `m${id}`,
  url: `${P}${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`,
  alt,
  kind: "image" as const,
});
const VIDEO = (id: string, url: string, alt: string) => ({ id, url, alt, kind: "video" as const });

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

const SOFIA = {
  id: "u-sofia",
  name: "Sofia Marchetti",
  email: "sofia@boomerang.demo",
  phone: "+1 (512) 555-0142",
  agency: "Northline Realty",
};
const RAFAEL = {
  id: "u-rafael",
  name: "Rafael Torres",
  email: "rafael@boomerang.demo",
  phone: "+1 (503) 555-0176",
  agency: "Torres & Co.",
};

function listing(
  input: PropertyInput,
  agent: typeof SOFIA,
  opts: {
    id: string;
    status: Property["status"];
    views?: number;
    created?: number;
    exact?: boolean;
    has360?: boolean;
    moderationNote?: string;
  },
): Property {
  const displayLat = opts.exact === false ? input.lat + (Math.random() - 0.5) * 0.05 : input.lat;
  const displayLng = opts.exact === false ? input.lng + (Math.random() - 0.5) * 0.05 : input.lng;
  const created = daysAgo(opts.created ?? 12);
  return {
    id: opts.id,
    ...input,
    status: opts.status,
    displayLat,
    displayLng,
    exactLocation: opts.exact !== false,
    agent: { ...agent },
    agentId: agent.id,
    createdAt: created,
    updatedAt: created,
    views: opts.views ?? 0,
    demo: true,
    has360: opts.has360,
    panoSrc: opts.has360 ? demoPano : undefined,
    moderationNote: opts.moderationNote,
  };
}

export function buildSeedDB(): DB {
  const now = daysAgo(0);
  const users: User[] = [
    {
      id: "u-admin", email: "admin@boomerang.demo", name: "Ada Okafor", phone: "+1 (415) 555-0101",
      role: "admin", status: "active", createdAt: daysAgo(120), passwordHash: "", salt: "seed-admin",
    },
    {
      id: SOFIA.id, email: SOFIA.email, name: SOFIA.name, phone: SOFIA.phone,
      role: "agent", status: "active", agency: SOFIA.agency, createdAt: daysAgo(95), passwordHash: "", salt: "seed-sofia",
    },
    {
      id: RAFAEL.id, email: RAFAEL.email, name: RAFAEL.name, phone: RAFAEL.phone,
      role: "agent", status: "active", agency: RAFAEL.agency, createdAt: daysAgo(80), passwordHash: "", salt: "seed-rafael",
    },
    {
      id: "u-marcus", email: "marcus@boomerang.demo", name: "Marcus Webb", phone: "+1 (720) 555-0128",
      role: "buyer", status: "active", createdAt: daysAgo(60), passwordHash: "", salt: "seed-marcus",
    },
    {
      id: "u-lena", email: "lena@boomerang.demo", name: "Lena Park", phone: "+1 (206) 555-0193",
      role: "buyer", status: "suspended", createdAt: daysAgo(40), passwordHash: "", salt: "seed-lena",
    },
  ];

  const properties: Property[] = [
    listing(
      {
        title: "Juniper Hill Villa", description:
          "A sunlit modern villa on a quiet greenbelt street, with open-plan living, floor-to-ceiling glass, and a landscaped garden framed by mature oaks. The chef's kitchen opens onto a covered terrace made for long evenings.",
        type: "villa", listingType: "sale", price: 1250000, currency: "USD", area: 2680, areaUnit: "sqft",
        bedrooms: 4, bathrooms: 3, parking: 2, floor: 0, totalFloors: 2, yearBuilt: 2019, furnishing: "unfurnished",
        amenities: ["Garden", "Garage", "Air conditioning", "Smart home", "Central heating", "Solar panels"],
        address: "412 Juniper Hill Rd", city: "Austin", region: "TX", country: "USA", postalCode: "78704",
        lat: 30.252, lng: -97.782, exactLocation: true,
        photos: [IMG(7031604, "Villa with glass walls"), IMG(7166640, "Living room"), IMG(7166645, "Kitchen"), IMG(8135505, "Bedroom"), IMG(8082195, "Bathroom")],
        tourUrl: "",
      },
      SOFIA,
      { id: "p1", status: "published", views: 342, created: 24 },
    ),
    listing(
      {
        title: "Larkspur Loft", description:
          "A warehouse-style loft in the Pearl District with 12-foot ceilings, exposed timber, and a private balcony over the street. Furnished, move-in ready, and two blocks from the riverfront trail.",
        type: "loft", listingType: "rent", price: 2450, currency: "USD", area: 780, areaUnit: "sqft",
        bedrooms: 1, bathrooms: 1, parking: 1, floor: 3, totalFloors: 6, yearBuilt: 2017, furnishing: "furnished",
        amenities: ["Balcony", "Elevator", "Gym", "Washer / Dryer", "Pet friendly", "Rooftop"],
        address: "88 NW Larkspur Ave", city: "Portland", region: "OR", country: "USA", postalCode: "97209",
        lat: 45.528, lng: -122.681, exactLocation: true,
        photos: [IMG(37224965, "Building exterior"), IMG(7214166, "Living room"), IMG(6527057, "Kitchen"), IMG(8082562, "Bedroom")],
        tourUrl: "",
      },
      RAFAEL,
      { id: "p2", status: "published", views: 198, created: 9 },
    ),
    listing(
      {
        title: "Cedar & Vine Townhouse", description:
          "A three-bedroom townhouse with a private garage, south-facing garden patio, and a bright top-floor family room. Walkable to the light rail and the park around the corner.",
        type: "townhouse", listingType: "sale", price: 585000, currency: "USD", area: 1640, areaUnit: "sqft",
        bedrooms: 3, bathrooms: 2, parking: 2, floor: 0, totalFloors: 3, yearBuilt: 2016, furnishing: "semi-furnished",
        amenities: ["Garage", "Garden", "Central heating", "Washer / Dryer", "Dishwasher", "Playground"],
        address: "2101 Cedar St", city: "Denver", region: "CO", country: "USA", postalCode: "80205",
        lat: 39.765, lng: -104.978, exactLocation: true,
        photos: [IMG(7031411, "Townhouse exterior"), IMG(8089155, "Living room"), IMG(7195739, "Kitchen"), IMG(8089268, "Bedroom"), IMG(6957081, "Bathroom")],
        tourUrl: "",
      },
      SOFIA,
      { id: "p3", status: "published", views: 261, created: 17 },
    ),
    listing(
      {
        title: "The Alabaster #804", description:
          "A furnished two-bedroom on the eighth floor of a full-service tower — concierge, gym, and a residents' lounge with skyline views. Utilities negotiated with the lease.",
        type: "apartment", listingType: "rent", price: 1890, currency: "USD", area: 940, areaUnit: "sqft",
        bedrooms: 2, bathrooms: 2, parking: 1, floor: 8, totalFloors: 21, yearBuilt: 2021, furnishing: "furnished",
        amenities: ["Elevator", "Gym", "Doorman", "Air conditioning", "Washer / Dryer", "Storage"],
        address: "500 W Alabaster St", city: "Chicago", region: "IL", country: "USA", postalCode: "60601",
        lat: 41.885, lng: -87.63, exactLocation: true,
        photos: [IMG(14998334, "Tower exterior"), IMG(7167073, "Living room"), IMG(19966809, "Kitchen"), IMG(28853343, "Bedroom"), IMG(7031840, "Bathroom")],
        tourUrl: "",
      },
      RAFAEL,
      { id: "p4", status: "published", views: 156, created: 14, exact: false },
    ),
    listing(
      {
        title: "Meridian Court #12", description:
          "A corner condominium with wrap-around windows, city and sound views, and a reserved EV-capable parking spot. Building amenities include a rooftop garden and fitness studio.",
        type: "condo", listingType: "sale", price: 765000, currency: "USD", area: 1120, areaUnit: "sqft",
        bedrooms: 2, bathrooms: 2, parking: 1, floor: 12, totalFloors: 24, yearBuilt: 2018, furnishing: "unfurnished",
        amenities: ["Elevator", "Gym", "Rooftop", "Air conditioning", "Smart home", "EV charging"],
        address: "200 Meridian Way", city: "Seattle", region: "WA", country: "USA", postalCode: "98101",
        lat: 47.61, lng: -122.339, exactLocation: true,
        photos: [IMG(5674684, "Building exterior"), IMG(6980724, "Living room"), IMG(6265836, "Kitchen"), IMG(8135118, "Bedroom"), IMG(6903210, "Bathroom")],
        tourUrl: "",
      },
      SOFIA,
      { id: "p5", status: "published", views: 289, created: 11 },
    ),
    listing(
      {
        title: "Bluebird Cottage", description:
          "A storybook cottage on a wooded lot, updated inside with a wood-burning fireplace, reading nook, and a screened porch that catches the mountain breeze. Includes a 360° virtual tour.",
        type: "house", listingType: "sale", price: 420000, currency: "USD", area: 1320, areaUnit: "sqft",
        bedrooms: 3, bathrooms: 2, parking: 1, floor: 0, totalFloors: 2, yearBuilt: 1998, furnishing: "unfurnished",
        amenities: ["Garden", "Fireplace", "Central heating", "Pet friendly", "Storage"],
        address: "14 Bluebird Ln", city: "Asheville", region: "NC", country: "USA", postalCode: "28801",
        lat: 35.571, lng: -82.551, exactLocation: true,
        photos: [IMG(7031405, "Cottage exterior"), IMG(8082242, "Living room"), IMG(6186828, "Kitchen"), IMG(6394612, "Bedroom"), IMG(6899357, "Bathroom")],
        tourUrl: "",
      },
      RAFAEL,
      { id: "p6", status: "published", views: 410, created: 21, has360: true },
    ),
    listing(
      {
        title: "Solstice Villa", description:
          "A contemporary villa with a heated pool, home theatre, and a guest casita over the garage. Solar array and battery storage keep the whole estate near net-zero through Texas summers.",
        type: "villa", listingType: "sale", price: 2450000, currency: "USD", area: 4200, areaUnit: "sqft",
        bedrooms: 5, bathrooms: 5, parking: 3, floor: 0, totalFloors: 2, yearBuilt: 2022, furnishing: "furnished",
        amenities: ["Swimming pool", "Garden", "Garage", "Smart home", "Solar panels", "EV charging", "Central heating", "Air conditioning"],
        address: "7 Solstice Dr", city: "Austin", region: "TX", country: "USA", postalCode: "78746",
        lat: 30.298, lng: -97.827, exactLocation: true,
        photos: [
          IMG(7031407, "Villa exterior"),
          VIDEO("v-walk", "https://videos.pexels.com/video-files/8293312/8293312-hd_1920_1080_30fps.mp4", "Walkthrough video"),
          IMG(8135496, "Living room"), IMG(7005291, "Kitchen"), IMG(30767888, "Bedroom"), IMG(8082195, "Bathroom"),
        ],
        tourUrl: "",
      },
      SOFIA,
      { id: "p7", status: "published", views: 187, created: 6 },
    ),
    listing(
      {
        title: "Harper House", description:
          "A craftsman home with a big front porch, dedicated home office with garden view, and a double garage with workshop space. Recently re-roofed and re-piped.",
        type: "house", listingType: "sale", price: 690000, currency: "USD", area: 1790, areaUnit: "sqft",
        bedrooms: 3, bathrooms: 2, parking: 2, floor: 0, totalFloors: 2, yearBuilt: 2014, furnishing: "semi-furnished",
        amenities: ["Garden", "Garage", "Central heating", "Dishwasher", "Washer / Dryer", "Home office"],
        address: "129 SE Harper Ct", city: "Portland", region: "OR", country: "USA", postalCode: "97202",
        lat: 45.502, lng: -122.647, exactLocation: true,
        photos: [IMG(7031412, "House exterior"), IMG(8089172, "Living room"), IMG(8146322, "Kitchen"), IMG(6394586, "Bedroom")],
        tourUrl: "",
      },
      RAFAEL,
      { id: "p8", status: "published", views: 233, created: 19 },
    ),
    listing(
      {
        title: "Ashworth Studio", description:
          "A compact, cleverly laid-out studio in a newer mid-rise — full-height windows, a queen-size lofted bed alcove, and building laundry on every floor. Perfect first city rental.",
        type: "studio", listingType: "rent", price: 1450, currency: "USD", area: 480, areaUnit: "sqft",
        bedrooms: 1, bathrooms: 1, parking: 0, floor: 4, totalFloors: 9, yearBuilt: 2020, furnishing: "furnished",
        amenities: ["Elevator", "Gym", "Doorman", "Air conditioning", "Washer / Dryer"],
        address: "901 Ashworth Ave", city: "Chicago", region: "IL", country: "USA", postalCode: "60614",
        lat: 41.92, lng: -87.651, exactLocation: true,
        photos: [IMG(29174530, "Building exterior"), IMG(7546648, "Living area"), IMG(6527057, "Kitchenette"), IMG(8135505, "Bed alcove")],
        tourUrl: "",
      },
      RAFAEL,
      { id: "p9", status: "published", views: 121, created: 27, exact: false },
    ),
    listing(
      {
        title: "Pinebrook Duplex", description:
          "Two self-contained three-bedroom units on one title — live in one and rent the other, or hold both as income. Separate meters, shared garden, plenty of off-street parking.",
        type: "duplex", listingType: "sale", price: 560000, currency: "USD", area: 2100, areaUnit: "sqft",
        bedrooms: 4, bathrooms: 3, parking: 2, floor: 0, totalFloors: 3, yearBuilt: 2011, furnishing: "unfurnished",
        amenities: ["Garden", "Garage", "Central heating", "Storage", "Playground"],
        address: "77 Pinebrook Way", city: "Denver", region: "CO", country: "USA", postalCode: "80211",
        lat: 39.769, lng: -105.02, exactLocation: true,
        photos: [IMG(7746940, "Duplex exterior"), IMG(7166640, "Unit living room"), IMG(7166645, "Unit kitchen"), IMG(8082562, "Unit bedroom")],
        tourUrl: "",
      },
      SOFIA,
      { id: "p10", status: "pending", created: 2, moderationNote: "Submitted by agent — awaiting moderation." },
    ),
    listing(
      {
        title: "Riverwalk Residences #8", description:
          "A furnished three-bedroom apartment above the riverfront boardwalk, with a video walkthrough available. Residents enjoy a rooftop terrace, co-working lounge, and bike storage.",
        type: "apartment", listingType: "rent", price: 3200, currency: "USD", area: 1350, areaUnit: "sqft",
        bedrooms: 3, bathrooms: 2, parking: 2, floor: 6, totalFloors: 18, yearBuilt: 2019, furnishing: "furnished",
        amenities: ["Elevator", "Gym", "Rooftop", "Doorman", "Air conditioning", "EV charging", "Pet friendly"],
        address: "88 Riverwalk Terrace", city: "Seattle", region: "WA", country: "USA", postalCode: "98104",
        lat: 47.598, lng: -122.334, exactLocation: true,
        photos: [
          IMG(27459248, "Building exterior"),
          VIDEO("v-river", "https://videos.pexels.com/video-files/7578552/7578552-uhd_3840_2160_30fps.mp4", "Walkthrough video"),
          IMG(7167073, "Living room"), IMG(19966809, "Kitchen"), IMG(28853343, "Bedroom"),
        ],
        tourUrl: "",
      },
      SOFIA,
      { id: "p11", status: "published", views: 96, created: 4 },
    ),
    listing(
      {
        title: "Magnolia Cottage", description:
          "A draft listing — visible only to its owner. A gentle 1920s cottage awaiting its final photoshoot: hardwood floors, sleeping porch, and a mature magnolia out front.",
        type: "house", listingType: "sale", price: 510000, currency: "USD", area: 1680, areaUnit: "sqft",
        bedrooms: 3, bathrooms: 2, parking: 2, floor: 0, totalFloors: 2, yearBuilt: 2004, furnishing: "unfurnished",
        amenities: ["Garden", "Fireplace", "Central heating", "Pet friendly"],
        address: "60 Magnolia Ave", city: "Asheville", region: "NC", country: "USA", postalCode: "28804",
        lat: 35.61, lng: -82.554, exactLocation: true,
        photos: [IMG(7031581, "House exterior"), IMG(8089155, "Living room")],
        tourUrl: "",
      },
      SOFIA,
      { id: "p12", status: "draft", created: 1 },
    ),
  ];

  return {
    version: 1,
    users,
    properties,
    inquiries: [
      {
        id: "i1", propertyId: "p1", propertyTitle: "Juniper Hill Villa", userId: "u-marcus", userName: "Marcus Webb",
        userEmail: "marcus@boomerang.demo", userPhone: "+1 (720) 555-0128",
        message: "Hi Sofia — we are relocating to Austin this fall and this villa looks close to what we need. Is the covered terrace screened? Could we arrange a walkthrough next week?",
        contactPref: "email", status: "new", agentId: "u-sofia", createdAt: daysAgo(1),
      },
      {
        id: "i2", propertyId: "p6", propertyTitle: "Bluebird Cottage", userId: "u-marcus", userName: "Marcus Webb",
        userEmail: "marcus@boomerang.demo", userPhone: "+1 (720) 555-0128",
        message: "Loved the 360 tour of Bluebird Cottage. Does the price include the appliances in the kitchen, and has the roof been inspected recently?",
        contactPref: "any", status: "contacted", agentId: "u-rafael", createdAt: daysAgo(3),
      },
    ],
    visits: [
      {
        id: "v1", propertyId: "p1", propertyTitle: "Juniper Hill Villa", userId: "u-marcus", userName: "Marcus Webb",
        date: daysAhead(5), time: "14:00", note: "Two adults attending.", status: "requested", agentId: "u-sofia", createdAt: daysAgo(1),
      },
      {
        id: "v2", propertyId: "p6", propertyTitle: "Bluebird Cottage", userId: "u-marcus", userName: "Marcus Webb",
        date: daysAhead(9), time: "10:30", note: "", status: "accepted", agentId: "u-rafael", createdAt: daysAgo(2),
      },
    ],
    favorites: [
      { id: "f1", userId: "u-marcus", propertyId: "p1", createdAt: daysAgo(4) },
      { id: "f2", userId: "u-marcus", propertyId: "p5", createdAt: daysAgo(2) },
    ],
    reports: [
      {
        id: "r1", propertyId: "p9", propertyTitle: "Ashworth Studio", userId: "u-marcus",
        reason: "Inaccurate information", details: "The listing mentions a lofted bed alcove but the photos don't show it — details may be out of date.",
        status: "open", createdAt: daysAgo(1),
      },
    ],
    audit: [
      {
        id: "a1", actorId: "u-admin", actorEmail: "admin@boomerang.demo", action: "system.seed",
        target: "demo dataset", note: "Demo environment initialized. All listings are sample data.", at: now,
      },
    ],
    sessions: [],
    passwordResets: [],
  };
}
