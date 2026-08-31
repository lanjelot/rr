import { REGIONS } from "./data";

// Free, keyless, CORS-enabled IP geolocation. Called straight from the browser
// so the lookup reflects the visitor's IP rather than the server's.
const GEO_IP_URL = "https://ipwho.is/";
const GEO_IP_TIMEOUT_MS = 3000;

type GeoResponse = {
  success?: boolean;
  country_code?: string;
  region_code?: string;
  city?: string;
};

export type GeoLocation = {
  city: string | null;
  state: string | null;
};

const STATE_CODES = ["QLD", "NSW", "ACT", "VIC", "TAS", "SA", "WA", "NT"];


let pending: Promise<GeoLocation | null> | null = null;

/**
 * Look up the visitor's city/state from their IP. Returns null when the lookup
 * fails, times out, or the visitor is outside Australia. The request is shared
 * between callers (StrictMode mounts effects twice).
 */
export function lookupLocation(): Promise<GeoLocation | null> {
  pending ??= fetchLocation();
  return pending;
}

async function fetchLocation(): Promise<GeoLocation | null> {
  let geo: GeoResponse;

  try {
    const res = await fetch(GEO_IP_URL, {
      signal: AbortSignal.timeout(GEO_IP_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    geo = await res.json();
  } catch {
    return null;
  }

  // ipwho.is answers 200 with {success: false} on errors (rate limits, etc).
  if (geo.success === false) return null;
  if ((geo.country_code ?? "").toUpperCase() !== "AU") return null;

  return {
    city: geo.city?.trim() || null,
    state: stateFromGeo(geo),
  };
}

function stateFromGeo(geo: GeoResponse): string | null {
  const code = (geo.region_code ?? "").toUpperCase().replace(/^AU-/, "");
  if (!STATE_CODES.includes(code)) return null;

  return code;
}


export function regionsForLocation(location: GeoLocation): string[] {
  const { state } = location;
  if (!state) return REGIONS;

  if (state === "QLD") return ["NQLD", "QLD", "NNSW"];
  if (state === "NSW") return ["NNSW", "NSW", "ACT"];
  if (state === "ACT") return ["NSW", "ACT", "VIC"];
  if (state === "VIC") return ["NSW", "ACT", "VIC", "SA"];

  return REGIONS.includes(state) ? [state] : REGIONS;
}
