import { type Event } from "~/lib/data";
import { eventDate } from "~/lib/utils";

export function DateBadge({ event }: { event: Event }) {
  return (
    <div className="rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-800">
      {eventDate(event)}
    </div>
  );
}

export function RegionBadge({ event }: { event: Event }) {
  return (
    <div className="rounded-md bg-purple-300 px-2 py-1 text-sm font-medium text-purple-800">
      {event.zone}
    </div>
  );
}
