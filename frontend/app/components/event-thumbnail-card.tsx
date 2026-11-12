import type { Event } from "~/lib/data";
import { eventDate, formatDate, formatTime, isMultiDay } from "~/lib/utils";
import { BookmarkButton } from "./bookmark-button";

function eventDateTime(
  event: Event
): string {
  if (!isMultiDay(event)) return `${formatDate(event.start_at)} · ${formatTime(event.start_at)} - ${formatTime(event.finish_at)}`;

  return `${formatDate(event.start_at, "ddd D MMM")} - ${formatDate(event.finish_at, "ddd D MMM")}`;
}

// Opening the details is left to the caller (an EventListDialog over the whole
// list), so this is just the clickable card. The bookmark button is a sibling
// overlaid on the card, since buttons can't nest.
export function EventThumbnailCard({ event, onClick }: { event: Event; onClick: () => void; }) {

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full h-48 flex flex-col bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:hover:border-white/20 rounded-xl overflow-hidden cursor-pointer text-left"
      >
        <img
          src={event.preview}
          alt=""
          className="object-cover w-full h-24"
        />
        <div className="w-full px-3 py-2 flex-1 min-h-0 flex flex-col gap-0.5">
         <div className="text-sm text-muted-foreground truncate">{eventDate(event)}</div>
          <div className="font-medium line-clamp-2 leading-tight">{event.name}</div>
          <div className="mt-auto pr-6 text-sm truncate text-muted-foreground">{event.location}</div>
        </div>
      </button>
      <BookmarkButton eventId={event.id} className="absolute bottom-2 right-2 text-muted-foreground" iconClassName="size-5" />
    </div>
  );
}
