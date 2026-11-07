import type { Event } from "~/lib/data";
import { eventPlace, eventTime } from "~/lib/utils";
import { BookmarkButton } from "./bookmark-button";

// The parent genres, else the flyer's genres for events without any.
function genreChips(event: Event): string[] {
  if (event.canonical_genres?.length) return event.canonical_genres;
  return (event.genre ?? "").split(",").map(genre => genre.trim()).filter(Boolean);
}

// The overview's grid card: the day is already the page's heading, so it leads
// with the time, and ends with the event's genres as chips. Opening the details
// is left to the caller (the overview's EventListDialog). The bookmark button
// is a sibling overlaid on the card, since buttons can't nest.
export function EventGridCard({ event, onClick }: { event: Event; onClick: () => void; }) {
  const genres = genreChips(event);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full h-60 flex flex-col bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:hover:border-white/20 rounded-xl overflow-hidden cursor-pointer text-left transition-colors"
      >
        <img
          src={event.preview}
          alt=""
          loading="lazy"
          className="flex-none object-cover w-full h-28"
        />
        <div className="w-full px-3 pt-2 pb-2.5 flex-1 min-h-0 flex flex-col gap-0.5">
          <div className="text-xs text-muted-foreground truncate">{eventTime(event)}</div>
          <div className="font-medium line-clamp-2 leading-tight">{event.name}</div>
          <div className="text-sm text-muted-foreground truncate">{eventPlace(event)}</div>
          {/* One row of chips: the fixed height hides any that wrap. */}
          {genres.length > 0 && (
            <ul className="mt-auto h-5 flex flex-wrap gap-1 overflow-hidden" aria-label="Genres">
              {genres.map(genre => (
                <li
                  key={genre}
                  className="h-5 px-2 rounded-full bg-white dark:bg-white/10 text-xs leading-5 whitespace-nowrap text-secondary-foreground"
                >
                  {genre}
                </li>
              ))}
            </ul>
          )}
        </div>
      </button>
      <BookmarkButton
        eventId={event.id}
        className="absolute top-2 right-2 p-1 rounded-full bg-black/40 text-white backdrop-blur-sm hover:text-white hover:bg-black/60"
        iconClassName="size-5"
      />
    </div>
  );
}
