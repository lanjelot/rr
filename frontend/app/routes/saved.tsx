import type { ShouldRevalidateFunctionArgs } from "react-router";
import { BookmarkIcon } from "@heroicons/react/24/outline";
import moment from "moment";
import type { Route } from "./+types/saved";
import { fetchEvents, type Event } from "~/lib/data";
import { isFutureEvent } from "~/lib/utils";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { EventCompactCard } from "~/components/event-compact-card";
import { EventListDialog } from "~/components/event-details-card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Saved | The Rave Roster" },
    { name: "description", content: "Your bookmarked events" },
  ];
}

// Opening an event's dialog only changes the search params; don't refetch for it.
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const events = await fetchEvents();
  return { events };
}

// Grouped by the day each event starts, in its own timezone.
function groupByDay(events: Event[]) {
  const byDay = new Map<string, Event[]>();
  for (const event of events) {
    const day = moment.parseZone(event.start_at).format("YYYY-MM-DD");
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(event);
  }
  return [...byDay.entries()].map(([day, events]) => ({ day, events }));
}

// Bookmarks are your own picks, so they ignore the region and genre filters.
export default function Saved({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  const { isBookmarked } = useBookmarks();
  const { value: openEventId, show } = useUrlDialogParam("event");

  const saved = events
    .filter((event) =>
      isFutureEvent(event) &&
      // Keep the open event while its dialog is up, so un-bookmarking it there
      // doesn't pull it out from under the dialog.
      (isBookmarked(event.id) || String(event.id) === openEventId)
    )
    .sort((a, b) => moment(a.start_at).diff(moment(b.start_at)));

  if (saved.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 text-center text-muted-foreground py-10">
        <BookmarkIcon className="size-8" />
        <div>Nothing saved yet.</div>
        <div className="text-sm">Tap the bookmark on an event to keep it here.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groupByDay(saved).map(({ day, events }) => (
        <div key={day} className="flex flex-col gap-1">
          <div className="text-muted-foreground font-semibold text-base ms-3">
            {moment(day, "YYYY-MM-DD").format("dddd D MMMM")}
          </div>
          {events.map((event) => (
            <EventCompactCard key={event.id} event={event} onClick={() => show(event.id)} />
          ))}
        </div>
      ))}
      <EventListDialog events={saved} />
    </div>
  );
}
