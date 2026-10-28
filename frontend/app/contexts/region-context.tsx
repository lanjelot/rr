import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { REGIONS } from "~/lib/data";
import { RegionOnboarding } from "~/components/region-onboarding";

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
    <RegionContext.Provider value={{ selectedRegions, setSelectedRegions }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
