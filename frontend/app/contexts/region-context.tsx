import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { REGIONS } from "~/lib/data";
import { lookupLocation, regionsForLocation } from "~/lib/geo";

type RegionContextType = {
  selectedRegions: string[];
  setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
};

const RegionContext = createContext<RegionContextType>({
  selectedRegions: [],
  setSelectedRegions: () => {},
});

function loadSelectedRegions(): string[] | null {
  try {
    const stored = localStorage.getItem("selectedRegions");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((r) => REGIONS.includes(r));
  } catch {
    return null;
  }
}

function parseRegionParam(param: string | null): string[] | null {
  if (!param) return null;
  if (param === "all") return REGIONS;
  const regions = param
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter((r) => REGIONS.includes(r));
  return regions.length > 0 ? regions : null;
}

function initialRegions(): { regions: string[]; detectFromIp: boolean } {
  const fromQuery = parseRegionParam(new URLSearchParams(window.location.search).get("region"));
  if (fromQuery) return { regions: fromQuery, detectFromIp: false };

  const stored = loadSelectedRegions();
  if (stored) return { regions: stored, detectFromIp: false };

  // First visit: show everything until the IP lookup narrows it down.
  return { regions: REGIONS, detectFromIp: true };
}

function sameRegions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((region, i) => region === b[i]);
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialised synchronously so the persist effect below can never write the
  // fallback over a stored selection (StrictMode runs mount effects twice).
  const [initial] = useState(initialRegions);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initial.regions);

  useEffect(() => {
    if (!initial.detectFromIp) return;

    let cancelled = false;
    lookupLocation().then((location) => {
      if (cancelled || !location) return;
      const regions = regionsForLocation(location);
      // Don't clobber a selection the visitor made while the lookup was in flight.
      setSelectedRegions((current) => (sameRegions(current, initial.regions) ? regions : current));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("region")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("region");
          return next;
        },
        { replace: true }
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedRegions", JSON.stringify(selectedRegions));
  }, [selectedRegions]);

  return (
    <RegionContext.Provider value={{ selectedRegions, setSelectedRegions }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
