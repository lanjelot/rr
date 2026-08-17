import type { Event } from "~/lib/data";
import { formatDate, formatTime, isMultiDay } from "~/lib/utils";
import { EventDialog } from "./event-details-card";

function eventDateTime(
  event: Event
): string {
  if (!isMultiDay(event)) return `${formatDate(event.start_at)} · ${formatTime(event.start_at)} - ${formatTime(event.finish_at)}`;

  return `${formatDate(event.start_at, "ddd D MMM")} - ${formatDate(event.finish_at, "ddd D MMM")}`;
}

export function ThumbnailCard({ event }: { event: Event; }) {

  return (
    <EventDialog event={event}>
      <button
        type="button"
        className="w-full h-48 flex flex-col gap-2 border rounded-xl overflow-hidden cursor-pointer hover:bg-zinc-300 dark:hover:bg-white/10 text-left"
      >
        <img
          src={event.flyer}
          alt=""
          className="object-cover aspect-square w-full h-24"
        />
        <div className="w-full px-3 pb-1 flex-1 min-h-0 flex flex-col justify-between">
          <div className="font-medium line-clamp-2 leading-tight">{event.name}</div>
          <div className="text-sm min-w-0">
            <div className="truncate">{eventDateTime(event)}</div>
            <div className="truncate text-muted-foreground">{event.location}</div>
          </div>
        </div>
      </button>
    </EventDialog>
  );
}
