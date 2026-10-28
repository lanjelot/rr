import { capitalizeWords } from "./utils";

export const BACKEND_API = "/api";

// Set VITE_STATIC_DATA=true at build time to fetch the pre-exported
// /data/events.json snapshot instead of hitting the live API (used for the
// GitHub Pages static build, which has no backend to call).
const STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "true";
const BASE_URL = import.meta.env.BASE_URL;

// The static export saves a small JPEG copy of each flyer, named after it:
// /data/flyers/abc.png → /data/previews/abc.jpg
function previewPath(flyer: string): string {
  return flyer.replace("/flyers/", "/previews/").replace(/\.\w+$/, ".jpg");
}

async function fetchStaticEvents(): Promise<Event[]> {
  const res = await fetch(`${BASE_URL}data/events.json`);
  const events: Event[] = await res.json();
  return events.map((event) => {
    const flyer = `${BASE_URL}${event.flyer.replace(/^\//, "")}`;
    return { ...event, flyer, preview: previewPath(flyer) };
  });
}

// The API has no previews, so thumbnails use the flyer itself.
function withFlyerAsPreview(event: Event): Event {
  return { ...event, preview: event.flyer };
}

export async function fetchEvents(): Promise<Event[]> {
  if (STATIC_DATA) return fetchStaticEvents();

  const res = await fetch(`${BACKEND_API}/events/`);
  const events: Event[] = await res.json();
  return events.map(withFlyerAsPreview);
}

export async function fetchEvent(id: string): Promise<Event | undefined> {
  if (STATIC_DATA) {
    const events = await fetchStaticEvents();
    return events.find((event) => String(event.id) === id);
  }

  const res = await fetch(`${BACKEND_API}/events/${id}/`);
  if (!res.ok) return undefined;
  return withFlyerAsPreview(await res.json());
}

export type Event = {
  id: number;
  name: string;
  zone: string;
  region: string;
  state: string;
  start_at: string;
  finish_at: string;
  flyer: string;
  // A downsized copy of the flyer, for thumbnails.
  preview: string;
  promoter?: string;
  artists?: string;
  djs?: string;
  location: string;
  venue?: string;
  genre?: string;
  ticket?: string;
  latitude: number | null;
  longitude: number | null;
}

export const REGIONS = ["NQLD", "QLD", "NNSW", "NSW", "ACT", "VIC", "TAS", "SA", "WA", "NT"];

export const REGION_LABELS: Record<string, string> = {
  NQLD: "North QLD",
  QLD: "South QLD",
  NNSW: "North NSW",
  NSW: "NSW",
  ACT: "ACT",
  VIC: "VIC",
  TAS: "TAS",
  SA: "SA",
  WA: "WA",
  NT: "NT",
};

// Coarser zones offered on the first-visit screen, each covering one or more regions.
export const ZONES: { id: string; label: string; regions: string[] }[] = [
  { id: "WA", label: "WA", regions: ["WA"] },
  { id: "NT", label: "NT", regions: ["NT"] },
  { id: "FQLD", label: "Far North QLD", regions: ["NQLD"] },
  { id: "QLD+NNSW", label: "QLD + North NSW", regions: ["QLD", "NNSW"] },
  { id: "NSW", label: "NSW", regions: ["NSW"] },
  { id: "ACT", label: "ACT", regions: ["ACT"] },
  { id: "VIC", label: "VIC", regions: ["VIC"] },
  { id: "TAS", label: "TAS", regions: ["TAS"] },
  { id: "SA", label: "SA", regions: ["SA"] },
];

export function regionLabel(region: string): string {
  return REGION_LABELS[region] ?? region;
}