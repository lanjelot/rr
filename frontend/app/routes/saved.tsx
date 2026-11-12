import { BookmarkIcon, EqualsIcon, ListBulletIcon, MapIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import moment from "moment";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { useSearchParams } from "react-router";
import { EventCompactCard } from "~/components/event-compact-card";
import { EventListDialog } from "~/components/event-details-card";
import { EventGridCard } from "~/components/event-grid-card";
import { EventLargeCard } from "~/components/event-large-card";
import { EventMap } from "~/components/event-map";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { fetchEvents, type Event } from "~/lib/data";
import { isFutureEvent } from "~/lib/utils";
import type { Route } from "./+types/saved";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Saved | The Rave Roster" },
    { name: "description", content: "Your bookmarked events" },
  ];
}

// Opening an event's dialog only changes the search params; only refetch
// when actually navigating to the page.
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

type ViewMode = "list" | "grid" | "large" | "map";

function parseViewMode(value: string | null): ViewMode {
  return value === "grid" || value === "large" || value === "map" ? value : "list";
}

// Bookmarks are your own picks, so they ignore the region and genre filters.
export default function Saved({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  const { isBookmarked } = useBookmarks();
  const { value: openEventId, show } = useUrlDialogParam("event");
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = parseViewMode(searchParams.get("view"));

  function setViewMode(mode: ViewMode) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (mode !== "list") params.set("view", mode);
      else params.delete("view");
      params.delete("bbox");
      return params;
    }, { replace: true, preventScrollReset: true });
  }

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
      <ToggleGroup
        type="single"
        variant="outline"
        className="self-end"
        value={viewMode}
        onValueChange={(value) => value && setViewMode(value as ViewMode)}
      >
        <ToggleGroupItem value="list" aria-label="List view" title="List">
          <ListBulletIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid">
          <Squares2X2Icon />
        </ToggleGroupItem>
        <ToggleGroupItem value="large" aria-label="Card view" title="Card">
          <EqualsIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="map" aria-label="Map view" title="Map">
          <MapIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      {viewMode === "map" ? (
        // The map keeps its own dialog over the cards in view.
        <EventMap events={saved} />
      ) : (
        <>
          {groupByDay(saved).map(({ day, events }) => (
            <div key={day} className="flex flex-col gap-1">
              <div className="text-muted-foreground font-semibold text-base ms-3">
                {moment(day, "YYYY-MM-DD").format("dddd D MMMM")}
              </div>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {events.map((event) => (
                    <EventGridCard key={event.id} event={event} onClick={() => show(event.id)} />
                  ))}
                </div>
              ) : viewMode === "large" ? (
                <div className="flex flex-col gap-6">
                  {events.map((event) => (
                    <EventLargeCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                events.map((event) => (
                  <EventCompactCard key={event.id} event={event} onClick={() => show(event.id)} />
                ))
              )}
            </div>
          ))}
          <EventListDialog events={saved} />
        </>
      )}
    </div>
  );
}
