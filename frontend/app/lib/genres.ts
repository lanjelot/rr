import type { Event } from "./data";

// Mirrors GENRES in backend/raveroster/constants.py: events are tagged with the
// parent genres (`canonical_genres`), the subgenres are only shown for reference.
export const GENRES: { genre: string; subgenres: string[] }[] = [
  { genre: "Techno", subgenres: ["minimal", "melodic techno", "peak-time", "hypnotic", "acid techno", "dub techno", "industrial techno", "bush techno", "deep tech"] },
  { genre: "Hard Techno", subgenres: ["hard groove", "schranz", "hyper-techno", "hard tech", "industrial hard techno"] },
  { genre: "House", subgenres: ["tech house", "deep house", "afro house", "melodic house", "progressive house", "organic house", "acid house", "funky house", "jackin' house", "French house", "bass house", "Balearic"] },
  { genre: "Disco & Funk", subgenres: ["disco", "nu-disco", "italo", "disco-funk", "boogie", "Ibiza classics"] },
  { genre: "UKG & Breaks", subgenres: ["UKG", "2-step", "speed garage", "bassline", "breakbeat", "breaks", "electro", "electroclash", "footwork", "jersey club"] },
  { genre: "Drum & Bass", subgenres: ["DnB", "jungle", "liquid", "neurofunk", "jump up"] },
  { genre: "Dubstep & Bass", subgenres: ["dubstep", "riddim", "trap", "140", "half time", "midtempo", "glitch hop", "grime", "bass music"] },
  { genre: "Trance", subgenres: ["uplifting trance", "progressive trance", "tech trance", "vocal trance", "90s trance"] },
  { genre: "Psytrance", subgenres: ["psy", "progressive psy", "darkpsy", "forest", "hi-tech", "full-on", "goa", "psytech"] },
  { genre: "Hard Dance", subgenres: ["hardstyle", "rawstyle", "hardcore", "gabber", "happy hardcore", "UK hardcore", "hard house", "hard trance", "bounce", "hard bounce", "jumpstyle"] },
  { genre: "Ambient & Experimental", subgenres: ["ambient", "downtempo", "experimental", "noise", "IDM", "electronica", "ecstatic dance", "conscious dance"] },
  { genre: "Electronic", subgenres: ["EDM", "dance", "club", "rave"] },
];

export const GENRE_NAMES = GENRES.map(({ genre }) => genre);

// No genre selected means no genre filter.
export function matchesGenres(event: Event, selectedGenres: string[]): boolean {
  return selectedGenres.length === 0 || (event.canonical_genres ?? []).some((g) => selectedGenres.includes(g));
}

export function isClub(event: Event): boolean {
  return event.club === true;
}

// The parent genres, else the flyer's genres for events without any.
export function genreChips(event: Event): string[] {
  if (event.canonical_genres?.length) return event.canonical_genres;
  return (event.genre ?? "").split(",").map(genre => genre.trim()).filter(Boolean);
}
