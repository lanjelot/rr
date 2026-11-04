import type { Event } from "~/lib/data";
import { eventDate, eventLineup, eventTime, isHappeningNow } from "~/lib/utils";
import { DateBadge, RegionBadge } from "./event-badges";
import { EventActions } from "./event-details-card";
import { EventGenres } from "./event-genres";


export function EventLargeCard({ event }: { event: Event; }) {

  return (
    <>
      <div className="flex flex-col gap-3 border rounded-xl">
        <div className="relative overflow-hidden rounded-t-xl">
          {/* Blurred copy fills the letterbox around the contained flyer. */}
          <img
            src={event.preview}
            alt=""
            className="absolute inset-0 size-full object-cover scale-110 blur-xl"
          />
          {/* relative: paint above the absolutely-positioned blur. */}
          <img
            src={event.preview}
            alt=""
            className="relative h-80 w-full object-contain"
          />
          <div className="absolute top-2 left-2">
            <DateBadge event={event} />
          </div>
          <div className="absolute top-2 right-2">
            <RegionBadge event={event} />
          </div>
          {isHappeningNow(event) && (
            <span className="absolute bottom-2 right-2 rounded-md bg-red-300 px-3 text-black">
              Happening now
            </span>
          )}
        </div>

        <div>
          <div className="text-center text-lg font-medium px-3">{event.name}</div>
          <div className="flex flex-col gap-6 p-3 text-sm text-muted-foreground">
            <ul>
              {eventLineup(event) && <li>🎧 {eventLineup(event)}</li>}
              {event.promoter && <li>🌀 {event.promoter}</li>}
            </ul>
            <ul>
              <li>📅 {eventDate(event)}</li>
              <li>⏰ {eventTime(event)}</li>
              <li>📍 {event.location}</li>
              {event.venue && (
                <li>🏛️ {event.venue}</li>
              )}
            </ul>
            <ul>
              <EventGenres event={event} />
            </ul>
          </div>
        </div>

        <EventActions event={event} className="px-3 pb-3" />
      </div>
    </>
  );
}
