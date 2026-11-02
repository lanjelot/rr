import { type Event } from "~/lib/data";
import { eventDate, formatDate } from "~/lib/utils";

// Which of a multi-day event's days an entry is, where a view lists the event
// once per day (the overview's day pages, the calendar's day cards).
export type EventDay = { day: string; n: number; total: number };

// Numbers each event's days from every (event, day) entry a view lists, so
// "Day n/N" counts the days as that view splits them.
export function eventDayNumberer(entries: { event: Event; day: string }[]) {
  const days = new Map<number, string[]>();
  for (const { event, day } of entries) {
    const list = days.get(event.id) ?? [];
    if (!list.includes(day)) list.push(day);
    days.set(event.id, list);
  }
  for (const list of days.values()) list.sort();

  return (event: Event, day: string): EventDay => {
    const list = days.get(event.id) ?? [day];
    return { day, n: list.indexOf(day) + 1, total: list.length };
  };
}

// The event's dates, or for one day of a multi-day event that day and which it
// is, e.g. "Sun 8 Nov - Day 2/2".
export function DateBadge({ event, eventDay }: { event: Event; eventDay?: EventDay }) {
  return (
    <div className="rounded-md bg-green-50 px-2 py-1 text-sm font-medium text-green-800">
      {eventDay && eventDay.total > 1
        ? `${formatDate(eventDay.day)} - Day ${eventDay.n}/${eventDay.total}`
        : eventDate(event)}
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
