import type { ShouldRevalidateFunctionArgs } from "react-router";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { fetchEvents } from "~/lib/data";
import { EventsOverview } from "~/components/events-overview";
import { CalendarView } from "~/components/calendar-view";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { BookmarkIcon, CalendarIcon, ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

const GOOGLE_CALENDAR_SUBSCRIBE = "https://calendar.google.com/calendar/r?cid=theraveroster%40gmail.com";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Rave Roster" },
    { name: "description", content: "An event discovery platform for Australian rave/electronic music events" },
  ];
}

// All views keep their day and open event in the URL; only refetch when
// actually navigating to the page.
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

type ViewMode = "days" | "grid" | "calendar";

function parseViewMode(value: string | null): ViewMode {
  return value === "grid" || value === "calendar" ? value : "days";
}

export default function Home({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode: ViewMode = parseViewMode(searchParams.get("view"));
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // All views share ?day=, so switching opens on the same day.
  function setViewMode(mode: ViewMode) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (mode !== "days") params.set("view", mode);
      else params.delete("view");
      params.delete("event");
      return params;
    }, { replace: true, preventScrollReset: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {viewMode === "calendar" && (
          <Button variant="outline" size="sm" asChild>
            <a href={GOOGLE_CALENDAR_SUBSCRIBE} target="_blank" rel="noopener noreferrer">
              <img src="/raveroster/google-calendar.svg" alt="" className="size-4" />
              Subscribe in Google Calendar
            </a>
          </Button>
        )}
        <Toggle
          variant="outline"
          className="ms-auto"
          pressed={bookmarkedOnly}
          onPressedChange={setBookmarkedOnly}
          aria-label="Bookmarked only"
          title="Bookmarked only"
        >
          {bookmarkedOnly ? <BookmarkSolidIcon /> : <BookmarkIcon />}
        </Toggle>
        <ToggleGroup
          type="single"
          variant="outline"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
        >
          <ToggleGroupItem value="days" aria-label="Compact" title="Compact">
            <ListBulletIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid" title="Grid">
            <Squares2X2Icon />
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Calendar" title="Calendar">
            <CalendarIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "calendar"
        ? <CalendarView events={events} bookmarkedOnly={bookmarkedOnly} />
        : <EventsOverview events={events} bookmarkedOnly={bookmarkedOnly} layout={viewMode === "grid" ? "grid" : "list"} />}
    </div>
  );
}
