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

// Keyed by display name (see zone_to_display in the backend).
// Full class strings so Tailwind picks them up at build time.
const ZONE_COLORS: Record<string, string> = {
  "FNQ": "text-lime-700 dark:text-lime-300",
  "QLD": "text-orange-700 dark:text-orange-300",
  "Sunshine Coast": "text-yellow-700 dark:text-yellow-300",
  "Brisbane": "text-purple-700 dark:text-purple-300",
  "Gold Coast": "text-amber-700 dark:text-amber-300",
  "Northern Rivers": "text-teal-700 dark:text-teal-300",
  "NSW": "text-sky-700 dark:text-sky-300",
  "Sydney": "text-blue-700 dark:text-blue-300",
  "VIC": "text-indigo-700 dark:text-indigo-300",
  "Melbourne": "text-violet-700 dark:text-violet-300",
  "ACT": "text-cyan-700 dark:text-cyan-300",
  "TAS": "text-emerald-700 dark:text-emerald-300",
  "SA": "text-rose-700 dark:text-rose-300",
  "WA": "text-pink-700 dark:text-pink-300",
  "NT": "text-red-700 dark:text-red-300",
};

export function zoneColor(zone: string) {
  return ZONE_COLORS[zone] ?? "";
}
