import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "bookmarkedEvents";

type BookmarksContextType = {
  isBookmarked: (id: number) => boolean;
  toggleBookmark: (id: number) => void;
};

const BookmarksContext = createContext<BookmarksContextType>({
  isBookmarked: () => false,
  toggleBookmark: () => {},
});

function loadBookmarks(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "number");
  } catch {
    return [];
  }
}

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState(loadBookmarks);

  // Keep other open tabs in step.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setBookmarks(loadBookmarks());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleBookmark(id: number) {
    const next = bookmarks.includes(id) ? bookmarks.filter((b) => b !== id) : [...bookmarks, id];
    setBookmarks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <BookmarksContext.Provider value={{ isBookmarked: (id) => bookmarks.includes(id), toggleBookmark }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  return useContext(BookmarksContext);
}
