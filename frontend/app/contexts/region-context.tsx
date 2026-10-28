import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
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

function initialRegions(): string[] | null {
  const fromQuery = parseRegionParam(new URLSearchParams(window.location.search).get("region"));
  if (fromQuery) return fromQuery;

  // null on first visit: the visitor has to pick their zones first.
  return loadSelectedRegions();
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialised synchronously so the persist effect below can never write the
  // fallback over a stored selection (StrictMode runs mount effects twice).
  const [initial] = useState(initialRegions);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initial ?? []);
  const [firstVisit, setFirstVisit] = useState(initial === null);

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
    localStorage.setItem("selectedRegions", JSON.stringify(selectedRegions));
  }, [selectedRegions, firstVisit]);

  if (firstVisit) {
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
