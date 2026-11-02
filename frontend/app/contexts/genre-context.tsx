import { createContext, useContext, useState } from "react";
import type { Event } from "~/lib/data";
import { GENRE_NAMES, matchesGenres } from "~/lib/genres";

const STORAGE_KEY = "selectedGenres";

type GenreContextType = {
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  matchesSelectedGenres: (event: Event) => boolean;
};

const GenreContext = createContext<GenreContextType>({
  selectedGenres: [],
  setSelectedGenres: () => {},
  matchesSelectedGenres: () => true,
});

function loadSelectedGenres(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g) => GENRE_NAMES.includes(g));
  } catch {
    return [];
  }
}

export function GenreProvider({ children }: { children: React.ReactNode }) {
  const [selectedGenres, setSelectedGenresState] = useState(loadSelectedGenres);

  function setSelectedGenres(genres: string[]) {
    // Kept in GENRES order, whatever order they were picked in.
    const next = GENRE_NAMES.filter((g) => genres.includes(g));
    setSelectedGenresState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <GenreContext.Provider
      value={{
        selectedGenres,
        setSelectedGenres,
        matchesSelectedGenres: (event) => matchesGenres(event, selectedGenres),
      }}
    >
      {children}
    </GenreContext.Provider>
  );
}

export function useGenres() {
  return useContext(GenreContext);
}
