import { createContext, useContext, useState } from "react";
import type { Event } from "~/lib/data";
import { GENRE_NAMES, isClub, matchesGenres } from "~/lib/genres";

const STORAGE_KEY = "selectedGenres";
const HIDE_CLUBS_KEY = "hideClubs";

type GenreContextType = {
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  hideClubs: boolean;
  setHideClubs: (hide: boolean) => void;
  matchesSelectedGenres: (event: Event) => boolean;
};

const GenreContext = createContext<GenreContextType>({
  selectedGenres: [],
  setSelectedGenres: () => {},
  hideClubs: false,
  setHideClubs: () => {},
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

function loadHideClubs(): boolean {
  try {
    return localStorage.getItem(HIDE_CLUBS_KEY) === "1";
  } catch {
    return false;
  }
}

export function GenreProvider({ children }: { children: React.ReactNode }) {
  const [selectedGenres, setSelectedGenresState] = useState(loadSelectedGenres);
  const [hideClubs, setHideClubsState] = useState(loadHideClubs);

  function setHideClubs(hide: boolean) {
    setHideClubsState(hide);
    localStorage.setItem(HIDE_CLUBS_KEY, hide ? "1" : "0");
  }

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
        hideClubs,
        setHideClubs,
        // Club nights are hidden on their own toggle, whatever genres are picked.
        matchesSelectedGenres: (event) => matchesGenres(event, selectedGenres) && !(hideClubs && isClub(event)),
      }}
    >
      {children}
    </GenreContext.Provider>
  );
}

export function useGenres() {
  return useContext(GenreContext);
}
