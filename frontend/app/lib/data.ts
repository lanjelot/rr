import { capitalizeWords } from "./utils";

export const BACKEND_API = "/api";

// Set VITE_STATIC_DATA=true at build time to fetch the pre-exported
// /data/events.json snapshot instead of hitting the live API (used for the
// GitHub Pages static build, which has no backend to call).
const STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "true";
const BASE_URL = import.meta.env.BASE_URL;

async function fetchStaticEvents(): Promise<Event[]> {
  const res = await fetch(`${BASE_URL}data/events.json`);
  const events: Event[] = await res.json();
  return events.map((event) => ({
    ...event,
    flyer: `${BASE_URL}${event.flyer.replace(/^\//, "")}`,
  }));
}

export async function fetchEvents(): Promise<Event[]> {
  if (STATIC_DATA) return fetchStaticEvents();

  const res = await fetch(`${BACKEND_API}/events/`);
  return res.json();
}

export async function fetchEvent(id: string): Promise<Event | undefined> {
  if (STATIC_DATA) {
    const events = await fetchStaticEvents();
    return events.find((event) => String(event.id) === id);
  }

  const res = await fetch(`${BACKEND_API}/events/${id}/`);
  if (!res.ok) return undefined;
  return res.json();
}

export type Event = {
  id: number;
  name: string;
  region: string;
  zone: string;
  state: string;
  start_at: string;
  finish_at: string;
  flyer: string;
  promoter?: string;
  artists?: string;
  djs?: string;
  location?: string;
  venue?: string;
  genre?: string;
  ticket?: string;
  notes?: string;
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

export function regionLabel(region: string): string {
  return REGION_LABELS[region] ?? region;
}