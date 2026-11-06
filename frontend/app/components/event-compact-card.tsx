import { type Event } from "~/lib/data";
import { eventDay, eventLineup, eventTime, isMultiDay } from "~/lib/utils";
import { Link } from "react-router";
import { zoneColor } from "./event-badges";
import { BookmarkButton } from "./bookmark-button";


// Opening the details is left to the caller (the overview's EventListDialog), so
// this is just the clickable card.
export function EventCompactCard({ event, onClick }: { event: Event; onClick: () => void; }) {
  const lineup = eventLineup(event);

  return (
    <div className="relative">
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="w-full min-h-24 mx-auto p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:hover:border-white/20 hover:cursor-pointer flex flex-row gap-2 transition-colors">
          <img
            src={event.preview}
            alt=""
            loading="lazy"
            className="flex-none size-20 object-cover rounded-sm self-center"
          />
          <div className="grow min-w-0 flex flex-col justify-between gap-1">
            {/* pe-6 keeps the name clear of the bookmark button overlaid in the corner */}
            <div className="flex flex-row gap-1 pe-6 text-base leading-tight font-medium">
              <span>✧</span>
              <span>{event.name}</span>
            </div>
            <ul className="text-muted-foreground text-sm">
              <li className="line-clamp-1">🎧 {lineup && lineup || "..."}</li>
              <li>⏰ {eventTime(event)}</li>
              <li className="truncate">📍 {event.venue === event.location
                ? `${event.venue}, ${event.zone}`
                : event.zone !== event.location
                  ? `${event.location}, ${event.zone}`
                  : event.zone}
              </li>
            </ul>
          </div>
        </div>
      </button>
      {/* Sibling of the card button, not a child: nested buttons are invalid HTML
          and the click would bubble up and open the dialog. */}
      <BookmarkButton eventId={event.id} className="absolute top-3 right-3 text-muted-foreground" iconClassName="size-5" />
    </div>
  );
}
