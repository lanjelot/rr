import { createContext, useContext, useEffect, useState } from "react";

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

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(DEFAULT_REGIONS);

  useEffect(() => {
    setSelectedRegions(loadSelectedRegions());
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
