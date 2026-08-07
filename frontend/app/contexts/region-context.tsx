import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { REGIONS } from "~/lib/data";

const DEFAULT_REGIONS = ["QLD", "NNSW"];

type RegionContextType = {
  selectedRegions: string[];
  setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
};

const RegionContext = createContext<RegionContextType>({
  selectedRegions: DEFAULT_REGIONS,
  setSelectedRegions: () => {},
});

function loadSelectedRegions(): string[] {
  try {
    const stored = localStorage.getItem("selectedRegions");
    return stored ? JSON.parse(stored) : DEFAULT_REGIONS;
  } catch {
    return DEFAULT_REGIONS;
  }
}

function parseRegionParam(param: string | null): string[] | null {
  if (!param) return null;
  const regions = param
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter((r) => REGIONS.includes(r));
  return regions.length > 0 ? regions : null;
}

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRegions, setSelectedRegions] = useState<string[]>(DEFAULT_REGIONS);

  useEffect(() => {
    const fromQuery = parseRegionParam(searchParams.get("region"));
    setSelectedRegions(fromQuery ?? loadSelectedRegions());

    if (fromQuery) {
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
