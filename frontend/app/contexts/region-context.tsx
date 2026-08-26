import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { REGIONS } from "~/lib/data";

type RegionContextType = {
  selectedRegions: string[];
  setSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
};

const RegionContext = createContext<RegionContextType>({
  selectedRegions: [],
  setSelectedRegions: () => {},
});

function loadSelectedRegions(): string[] {
  try {
    const stored = localStorage.getItem("selectedRegions");
    if (!stored) return REGIONS;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return REGIONS;
    return parsed.filter((r) => REGIONS.includes(r));
  } catch {
    return REGIONS;
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

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialised synchronously so the persist effect below can never write the
  // fallback over a stored selection (StrictMode runs mount effects twice).
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => {
    const fromQuery = parseRegionParam(new URLSearchParams(window.location.search).get("region"));
    return fromQuery ?? loadSelectedRegions();
  });

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
