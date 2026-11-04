import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { ALL_SUBREGIONS, REGIONS, inRegions, type Event } from "~/lib/data";
import { RegionOnboarding } from "~/components/region-onboarding";

type RegionContextType = {
  selectedRegions: string[];
  setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
  // Subregions unticked in the settings menu, narrowing their region down to the
  // ticked ones. None unticked (the default) means the whole region.
  excludedSubregions: string[];
  setExcludedSubregions: (subregions: string[]) => void;
  inSelectedRegions: (event: Event) => boolean;
};

const RegionContext = createContext<RegionContextType>({
  selectedRegions: [],
  setSelectedRegions: () => {},
  excludedSubregions: [],
  setExcludedSubregions: () => {},
  inSelectedRegions: () => true,
});

function loadExcludedSubregions(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("excludedSubregions") ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => ALL_SUBREGIONS.includes(s)) : [];
  } catch {
    return [];
  }
}

// Regions that have since become subregions, for old saved selections and shared links.
const FORMER_REGIONS: Record<string, string> = { NNSW: "QLD" };

function knownRegions(regions: string[]): string[] {
  const mapped = regions.map((r) => FORMER_REGIONS[r] ?? r).filter((r) => REGIONS.includes(r));
  return [...new Set(mapped)];
}

function loadSelectedRegions(): string[] | null {
  try {
    const stored = localStorage.getItem("selectedRegions");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;
    return knownRegions(parsed);
  } catch {
    return null;
  }
}

function parseRegionParam(param: string | null): string[] | null {
  if (!param) return null;
  if (param === "all") return REGIONS;
  const regions = knownRegions(param.split(",").map((r) => r.trim().toUpperCase()));
  return regions.length > 0 ? regions : null;
}

function regionsFromQuery(): string[] | null {
  return parseRegionParam(new URLSearchParams(window.location.search).get("region"));
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialised synchronously so the persist effect below can never write the
  // fallback over a stored selection (StrictMode runs mount effects twice).
  const [stored] = useState(loadSelectedRegions);
  const [shared] = useState(regionsFromQuery);
  // A brand new visitor adopts a shared link's regions as their own; null means
  // they have to pick their zones first.
  const [savedRegions, setSavedRegions] = useState<string[]>(stored ?? shared ?? []);
  // A returning visitor only sees the shared regions while they browse, so their own
  // selection survives. Changing the region filter makes it theirs again.
  const [sharedRegions, setSharedRegions] = useState(stored ? shared : null);
  const [firstVisit, setFirstVisit] = useState(stored === null && shared === null);
  const selectedRegions = sharedRegions ?? savedRegions;
  const [savedExcludedSubregions, setSavedExcludedSubregions] = useState(loadExcludedSubregions);
  // A shared link shows its regions whole, whatever subregions the visitor unticked.
  const excludedSubregions = sharedRegions ? [] : savedExcludedSubregions;

  function setExcludedSubregions(subregions: string[]) {
    // Like the region filter, editing it ends browsing a shared link.
    if (sharedRegions) setSavedRegions(sharedRegions);
    setSharedRegions(null);
    setSavedExcludedSubregions(subregions);
    try {
      localStorage.setItem("excludedSubregions", JSON.stringify(subregions));
    } catch {}
  }

  const inSelectedRegions = (event: Event) => inRegions(event, selectedRegions, excludedSubregions);

  const setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>> = (action) => {
    setSavedRegions(typeof action === "function" ? action(selectedRegions) : action);
    setSharedRegions(null);
  };
  const { pathname } = useLocation();

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
    // Nothing is stored until the first-visit screen is submitted, so it shows again on reload.
    if (firstVisit) return;
    localStorage.setItem("selectedRegions", JSON.stringify(savedRegions));
  }, [savedRegions, firstVisit]);

  // A shared event link goes straight to the event; the region picker waits
  // until the visitor moves on to a page that lists events.
  if (firstVisit && !/^\/events\/[^/]+\/?$/.test(pathname)) {
    return (
      <RegionOnboarding
        onSubmit={(regions) => {
          setSelectedRegions(regions);
          setFirstVisit(false);
        }}
      />
    );
  }

  return (
    <RegionContext.Provider value={{ selectedRegions, setSelectedRegions, excludedSubregions, setExcludedSubregions, inSelectedRegions }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
