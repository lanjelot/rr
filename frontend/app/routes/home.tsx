import type { ShouldRevalidateFunctionArgs } from "react-router";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { fetchEvents } from "~/lib/data";
import { EventsOverview } from "~/components/events-overview";
import { CalendarView } from "~/components/calendar-view";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { BookmarkIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
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

const VIEW_MODES: { value: ViewMode; label: string; Icon: typeof ListBulletIcon }[] = [
  { value: "days", label: "List", Icon: ListBulletIcon },
  { value: "grid", label: "Grid", Icon: Squares2X2Icon },
  { value: "calendar", label: "Calendar", Icon: CalendarIcon },
];

function parseViewMode(value: string | null): ViewMode {
  return value === "grid" || value === "calendar" ? value : "days";
}

const VIEW_STORAGE_KEY = "homeView";

function loadViewMode(): string | null {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {}
}

export default function Home({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode: ViewMode = parseViewMode(searchParams.get("view") ?? loadViewMode());
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const current = VIEW_MODES.find((m) => m.value === viewMode)!;

  // ?view= wins; without it, open on the view last picked here.
  // All views share ?day=, so switching opens on the same day.
  function setViewMode(mode: ViewMode) {
    saveViewMode(mode);
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
        <Popover open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" title="View">
              <current.Icon /> {current.label}
              <ChevronDownIcon className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1 gap-1">
            {VIEW_MODES.map(({ value, label, Icon }) => (
              <Button
                key={value}
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setViewMode(value);
                  setViewMenuOpen(false);
                }}
              >
                <Icon /> {label}
                {value === viewMode && <CheckIcon className="ms-auto" />}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {viewMode === "calendar"
        ? <CalendarView events={events} bookmarkedOnly={bookmarkedOnly} />
        : <EventsOverview events={events} bookmarkedOnly={bookmarkedOnly} layout={viewMode === "grid" ? "grid" : "list"} />}
    </div>
  );
}
