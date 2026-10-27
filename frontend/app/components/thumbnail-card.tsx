import type { Event } from "~/lib/data";
import { eventDate, formatDate, formatTime, isMultiDay } from "~/lib/utils";

function eventDateTime(
  event: Event
): string {
  if (!isMultiDay(event)) return `${formatDate(event.start_at)} · ${formatTime(event.start_at)} - ${formatTime(event.finish_at)}`;

  return `${formatDate(event.start_at, "ddd D MMM")} - ${formatDate(event.finish_at, "ddd D MMM")}`;
}

// Opening the details is left to the caller (an EventListDialog over the whole
// list), so this is just the clickable card.
export function ThumbnailCard({ event, onClick }: { event: Event; onClick: () => void; }) {

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-48 flex flex-col gap-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10 border rounded-xl overflow-hidden cursor-pointer text-left"
    >
      <img
        src={event.flyer}
        alt=""
        className="object-cover aspect-square w-full h-24"
      />
      <div className="w-full px-3 pb-1 flex-1 min-h-0 flex flex-col">
       <div className="text-sm text-muted-foreground truncate">{eventDate(event)}</div>
        <div className="font-medium line-clamp-2 leading-tight">{event.name}</div>
        <div className="mt-auto text-sm truncate text-muted-foreground">{event.location}</div>
      </div>
    </button>
  );
}
