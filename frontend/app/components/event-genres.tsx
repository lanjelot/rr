import { ArrowTurnDownRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { Event } from "~/lib/data";
import { genreChips } from "~/lib/genres";
import { normalize } from "~/lib/search";
import { cn } from "~/lib/utils";

// The event's parent genres, with the genres the AI read off the flyer one
// click away. Events without parent genres fall back to the AI's.
export function EventGenres({ event }: { event: Event }) {
  const [expanded, setExpanded] = useState(false);
  const canonical = (event.canonical_genres ?? []).join(", ");
  const raw = event.genre ?? "";

  if (!canonical && !raw) return null;
  if (!canonical || normalize(canonical) === normalize(raw)) return <li>🎶 {canonical || raw}</li>;

  return (
    <li>
      🎶 {canonical}
      <button
        className={cn(
          "ms-1 inline-flex align-text-bottom rounded-sm cursor-pointer hover:text-foreground",
          expanded && "text-foreground"
        )}
        aria-label={expanded ? "Hide flyer genres" : "Show flyer genres"}
        aria-expanded={expanded}
        onClick={(e) => {
          // Cards open the event when clicked.
          e.stopPropagation();
          e.preventDefault();
          setExpanded(!expanded);
        }}
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && <div className="ps-1 text-xs flex items-start gap-1"><ArrowTurnDownRightIcon className="size-4 shrink-0"/><span className="font-mono">{raw}</span></div>}
    </li>
  );
}

// The event's genres as chips. singleRow keeps them to one line, hiding any
// that would wrap, for cards with a fixed height.
export function GenreChips({ event, singleRow = false, className, chipClassName }: { event: Event; singleRow?: boolean; className?: string; chipClassName?: string }) {
  const genres = genreChips(event);
  if (genres.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1", singleRow && "h-5 overflow-hidden", className)} aria-label="Genres">
      {genres.map(genre => (
        <li
          key={genre}
          className={cn("h-5 px-2 rounded-full bg-white dark:bg-white/10 text-xs leading-5 whitespace-nowrap text-secondary-foreground", chipClassName)}
        >
          {genre}
        </li>
      ))}
    </ul>
  );
}
