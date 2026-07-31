import type { Event } from "~/lib/data";
import { formatDate, formatTime } from "~/lib/utils";
import { Link } from "react-router";

export function ThumbnailCard({ event }: { event: Event; }) {

  return (
    <Link to={`/events/${event.id}`}>
      <div className="w-full flex flex-col gap-2 border rounded-xl overflow-hidden cursor-pointer hover:bg-zinc-300 dark:hover:bg-white/10">
        <img
          src={event.flyer}
          alt=""
          className="object-cover aspect-square w-full"
        />
        <div className="px-3 pb-3 text-sm">
          <div className="font-medium truncate">{event.name}</div>
          <div className="text-muted-foreground text-xs mt-1">
            <div>{formatDate(event.start_at)} · {formatTime(event.start_at)}</div>
            <div className="truncate">{event.location}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
