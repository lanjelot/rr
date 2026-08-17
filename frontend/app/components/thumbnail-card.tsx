import type { Event } from "~/lib/data";
import { formatDate, formatTime, isMultiDay } from "~/lib/utils";
import { Link } from "react-router";

function eventDateTime(
  event: Event
): string {
  if (!isMultiDay(event)) return `${formatDate(event.start_at)} · ${formatTime(event.start_at)} - ${formatTime(event.finish_at)}`;

  return `${formatDate(event.start_at, "ddd D MMM")} - ${formatDate(event.finish_at, "ddd D MMM")}`;
}

export function ThumbnailCard({ event }: { event: Event; }) {

  return (
    <Link to={`/events/${event.id}`}>
      <div className="w-full h-46 flex flex-col gap-2 border rounded-xl overflow-hidden cursor-pointer hover:bg-zinc-300 dark:hover:bg-white/10">
        <img
          src={event.flyer}
          alt=""
          className="object-cover aspect-square w-full h-24"
        />
        <div className="px-3 pb-1 flex flex-col justify-between h-full">
          <div>
            <div className="font-medium line-clamp-2 leading-none">{event.name}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="truncate">{eventDateTime(event)}</div>
            <div className="">{event.location}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
