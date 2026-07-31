import { capitalizeWords } from "./utils";

export const DATA_URL = "/data/events.json";

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