import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { Event } from "~/lib/data";
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
      {expanded && <div className="ps-6 text-xs">{raw}</div>}
    </li>
  );
}
