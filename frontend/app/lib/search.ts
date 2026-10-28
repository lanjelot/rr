import type { Event } from "./data";

// The fields a search can be narrowed to. Each one is also the URL param the
// Upcoming page reads, e.g. /events?artist=nina matches every artist containing
// "nina". `q` is the catch-all across all fields.
export type SearchField = "name" | "artist" | "place" | "genre";
export const SEARCH_PARAMS = ["name", "artist", "place", "genre", "q"] as const;
export type SearchParam = (typeof SEARCH_PARAMS)[number];

export function isSearchParam(key: string): key is SearchParam {
  return (SEARCH_PARAMS as readonly string[]).includes(key);
}

export const SEARCH_LABELS: Record<SearchParam, string> = {
  name: "Event",
  artist: "Artist",
  place: "Venue",
  genre: "Genre",
  q: "Search",
};

export const MIN_QUERY_LENGTH = 2;

export function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

// Lineups are free text from the AI parse: comma lists with "b2b"/"vs" pairings,
// "(live)" tags, Instagram handles and "plus more!" tails.
function splitArtists(str: string): string[] {
  return str
    .split(/,|\s+b2b\s+|\s+vs\.?\s+/i)
    .map((artist) => artist.replace(/\(.*?\)/g, "").replace(/^@/, "").trim())
    .filter((artist) => artist.length > 1 && !/^(plus |and )?(many )?more!?$|^tba$/i.test(artist));
}

const GENERIC_GENRES = ["music", "dj", "djs", "arts", "lifestyle", "party"];

function splitGenres(str: string): string[] {
  return str
    .split(/[,/|]/)
    .map((genre) => genre.trim())
    .filter((genre) => genre.length > 1 && !GENERIC_GENRES.includes(genre.toLowerCase()));
}

function fieldValues(event: Event, field: SearchField): string[] {
  switch (field) {
    case "name":
      return [event.name];
    case "artist":
      return splitArtists([event.artists, event.djs].filter(Boolean).join(", "));
    case "place":
      return [event.venue, event.location].filter((v): v is string => !!v);
    case "genre":
      return event.genre ? splitGenres(event.genre) : [];
  }
}

export function matchesSearch(event: Event, param: SearchParam, value: string): boolean {
  const needle = normalize(value);
  if (needle === "") return true;

  if (param === "q") {
    return [event.name, event.venue, event.location, event.artists, event.djs, event.genre]
      .some((v) => v && normalize(v).includes(needle));
  }
  return fieldValues(event, param).some((v) => normalize(v).includes(needle));
}

function capitalizedWords(str: string): number {
  return str.match(/(^|\s)\p{Lu}/gu)?.length ?? 0;
}

export type Suggestion = { field: SearchField; value: string; count: number };

// Distinct values per field across `events`, with how many events each covers.
export function buildSuggestionIndex(events: Event[]): Record<SearchField, Suggestion[]> {
  const index = {} as Record<SearchField, Suggestion[]>;

  for (const field of ["name", "artist", "place", "genre"] as SearchField[]) {
    const byKey = new Map<string, Suggestion>();
    for (const event of events) {
      // An event listing the same artist twice still counts once.
      const keys = new Set<string>();
      for (const value of fieldValues(event, field)) {
        const key = normalize(value);
        if (keys.has(key)) continue;
        keys.add(key);

        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, { field, value: value.trim(), count: 1 });
        } else {
          existing.count++;
          // Prefer the best cased spelling ("House" over "house", "Byron Bay" over "Byron bay").
          if (capitalizedWords(value) > capitalizedWords(existing.value)) {
            existing.value = value.trim();
          }
        }
      }
    }
    index[field] = [...byKey.values()];
  }

  return index;
}

// Prefix matches first, then the most common values.
export function suggest(suggestions: Suggestion[], query: string, limit = 5): Suggestion[] {
  const needle = normalize(query);
  return suggestions
    .map((s) => ({ s, at: normalize(s.value).indexOf(needle) }))
    .filter(({ at }) => at !== -1)
    .sort((a, b) => Number(a.at !== 0) - Number(b.at !== 0) || b.s.count - a.s.count)
    .slice(0, limit)
    .map(({ s }) => s);
}
