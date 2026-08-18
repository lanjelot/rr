import { type Event } from "~/lib/data";
import { eventDay, eventTime, isMultiDay } from "~/lib/utils";
import { Link } from "react-router";


export function EventCompact({ event }: { event: Event; }) {
  const lineup = [event.artists, event.djs]
    .filter(Boolean)
    .join(", ");

  return (
    <Link to={`/events/${event.id}`}>
      <div className="w-full min-h-24 mx-auto p-3 rounded-xl bg-zinc-100 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:hover:border-white/20 hover:cursor-pointer flex flex-row gap-2 items-stretch transition-colors">
        <img
          src={event.flyer}
          alt=""
          loading="lazy"
          className="flex-none size-16 object-cover rounded-sm self-center"
        />
        <div className="grow flex flex-col items-stretch justify-between gap-1">
          <div className="flex flex-row gap-1 justify-between">
            <div className="flex flex-row gap-1 leading-tight font-medium">
              <span>✧</span>
              <span>{event.name}</span>
            </div>
          </div>
          <ul className="text-muted-foreground text-xs">
            {lineup &&
              <li className="line-clamp-1">🎧 {lineup}</li>
            }
            <li>⏰ {eventTime(event)}</li>
            <li className="flex justify-between gap-1">
              <div>📍 {event.location}</div>
              <div>{event.zone}</div>
            </li>
          </ul>
        </div>
      </div>
    </Link>
  );
}
