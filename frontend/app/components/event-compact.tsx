import { type Event } from "~/lib/data";
import { eventDay, eventLineup, eventTime, isMultiDay } from "~/lib/utils";
import { Link } from "react-router";
import { zoneColor } from "./event-badges";


// Opening the details is left to the caller (the overview's EventListDialog), so
// this is just the clickable card.
export function EventCompact({ event, onClick }: { event: Event; onClick: () => void; }) {
  const lineup = eventLineup(event);

  return (
    <button type="button" onClick={onClick} className="text-left">
      <div className="w-full min-h-24 mx-auto p-3 rounded-xl bg-zinc-100 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:hover:border-white/20 hover:cursor-pointer flex flex-row gap-2 transition-colors">
        <img
          src={event.preview}
          alt=""
          loading="lazy"
          className="flex-none size-20 object-cover rounded-sm self-center"
        />
        <div className="grow flex flex-col justify-between gap-1">
          <div className="flex flex-row gap-1 justify-between">
            <div className="flex flex-row gap-1 text-base leading-tight font-medium">
              <span>✧</span>
              <span>{event.name}</span>
            </div>
          </div>
          <ul className="text-muted-foreground text-sm">
            <li className="line-clamp-1">🎧 {lineup && lineup || "..."}</li>
            <li>⏰ {eventTime(event)}</li>
            <li className="flex justify-between gap-1">
              <div>📍 {(event.location === event.zone && event.venue) || event.location}</div>
              <div className="shrink-0">{event.zone}</div>
            </li>
          </ul>
        </div>
      </div>
    </button>
  );
}
