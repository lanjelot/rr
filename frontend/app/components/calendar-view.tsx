import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Share2Icon } from "lucide-react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import moment from "moment";
import { REGIONS, type Event } from "~/lib/data";
import { isFutureEvent } from "~/lib/utils";
import { useRegion } from "~/contexts/region-context";
import { useGenres } from "~/contexts/genre-context";
import { Button } from "~/components/ui/button";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { EventListDialog } from "./event-details-card";
import { eventDayNumberer, isClosingDay } from "./event-badges";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { DayStripBar, weekLabeller } from "./events-overview";

// Day cards run from 10am to 6am the next day, since that's when raves actually happen.
const WINDOW_START_HOUR = 10;
const WINDOW_MINUTES = 20 * 60;
const HOUR_MARKS = [12, 18, 0];
const MAX_EVENT_DAYS = 21;
// Bars thinner than this are unreadable, so give every event at least this much width.
const MIN_BAR_MINUTES = 30;

function hourMarkLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function hourMarkPct(hour: number): number {
  const minutesFromWindowStart = ((hour - WINDOW_START_HOUR + 24) % 24) * 60;
  return (minutesFromWindowStart / WINDOW_MINUTES) * 100;
}

type DayItem = {
  event: Event;
  // The show day this bar sits on. startMin/endMin are offsets from that day's
  // window start, so they only mean anything alongside it.
  day: string;
  startMin: number;
  endMin: number;
};

type DayGroup = {
  day: string;
  items: DayItem[];
};

// Events starting before the window's cutoff hour belong to the previous show day
// (e.g. a set starting at 1am is still part of the night before).
function showDay(dateStr: string): string {
  return moment.parseZone(dateStr).subtract(WINDOW_START_HOUR, "hours").format("YYYY-MM-DD");
}

// A multi-day event shows a card on every show day it overlaps, clipped to that
// day's window, so e.g. a festival running Fri-Sun appears on the Fri, Sat and Sun cards.
function eventShowDays(event: Event): string[] {
  const start = moment(showDay(event.start_at), "YYYY-MM-DD");
  const finish = moment(showDay(event.finish_at), "YYYY-MM-DD");
  const days: string[] = [];

  const cur = start.clone();
  while (cur.isSameOrBefore(finish) && days.length < MAX_EVENT_DAYS) {
    days.push(cur.format("YYYY-MM-DD"));
    cur.add(1, "day");
  }

  return days;
}

// The window has to be anchored in the event's own UTC offset, not the browser's, or a
// viewer in another timezone sees e.g. a QLD event finishing at 10am spill into the next
// day. The start day uses start_at's offset and later days finish_at's, so a DST change
// mid-event still puts the boundaries at 10am local.
function dayWindowStart(event: Event, day: string): moment.Moment {
  const ref = day === showDay(event.start_at) ? event.start_at : event.finish_at;
  const offset = moment.parseZone(ref).format("Z");
  return moment.parseZone(`${day}T00:00:00${offset}`).add(WINDOW_START_HOUR, "hours");
}

// Clips an event to a day's window, or returns null when it doesn't actually overlap it.
// An event finishing at exactly 10am, or starting at exactly 6am, touches the neighbouring
// day's window without spending any time in it, and would otherwise leave that day empty.
function clipToDay(event: Event, day: string): DayItem | null {
  const windowStart = dayWindowStart(event, day);
  const startMin = Math.max(0, moment.parseZone(event.start_at).diff(windowStart, "minutes"));
  const endMin = Math.min(
    WINDOW_MINUTES,
    moment.parseZone(event.finish_at).diff(windowStart, "minutes")
  );

  if (endMin <= startMin || startMin >= WINDOW_MINUTES) return null;

  return { event, day, startMin, endMin: Math.min(WINDOW_MINUTES, Math.max(endMin, startMin + MIN_BAR_MINUTES)) };
}

// Events landing entirely in the 6am-10am gap between windows still need a home, so pin
// them to the end of their show day rather than dropping them off the calendar.
function fallbackItem(event: Event, day: string): DayItem {
  return { event, day, startMin: Math.max(0, WINDOW_MINUTES - MIN_BAR_MINUTES), endMin: WINDOW_MINUTES };
}

function buildDayGroups(events: Event[]): DayGroup[] {
  const dayItems = new Map<string, DayItem[]>();

  const add = (item: DayItem) =>
    dayItems.set(item.day, [...(dayItems.get(item.day) ?? []), item]);

  for (const event of events) {
    const clipped = eventShowDays(event)
      .map((day) => clipToDay(event, day))
      .filter((item) => item !== null);

    if (clipped.length === 0) {
      add(fallbackItem(event, showDay(event.start_at)));
      continue;
    }

    for (const item of clipped) add(item);
  }

  return Array.from(dayItems.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, items]) => ({
      day,
      items: items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin),
    }));
}

// The dialog param is keyed on the day as well as the event, so each bar of a
// multi-day event is its own entry in the week's EventListDialog, and stepping
// carries on from the bar that was clicked.
function itemDialogId({ event, day }: { event: Event; day: string }): string {
  return `${event.id}-${day}`;
}

function EventBar({ item, onClick }: { item: DayItem; onClick: () => void }) {
  const { event, startMin, endMin } = item;
  const { isBookmarked } = useBookmarks();
  const leftPct = (startMin / WINDOW_MINUTES) * 100;
  const widthPct = ((endMin - startMin) / WINDOW_MINUTES) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-y-0 flex items-center gap-1.5 rounded-lg pl-1 pr-2 bg-white hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 overflow-hidden transition-colors text-left"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        maxWidth: `calc(100% - ${leftPct}%)`,
      }}
    >
      <img
        src={event.preview}
        alt=""
        loading="lazy"
        className="flex-none size-10 rounded-md object-cover"
      />
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-xs font-medium truncate">{event.name}</span>
        {/* <span className="text-[11px] text-muted-foreground truncate">{eventTime(event)}</span> */}
        <span className="text-xs text-muted-foreground truncate">{event.location}</span>
      </div>
      {isBookmarked(event.id) && (
        <BookmarkSolidIcon className="absolute bottom-1 right-1 size-3 text-muted-foreground" />
      )}
    </button>
  );
}

function dayLabel(day: string): string {
  return moment(day).format("dddd D MMMM");
}

// Weeks run Tuesday to Tuesday, not Monday to Sunday.
function weekKey(day: string): string {
  const d = moment(day);
  const daysSinceTuesday = (d.day() - 2 + 7) % 7;
  return d.clone().subtract(daysSinceTuesday, "days").format("YYYY-MM-DD");
}

// Anchor id for a day card, so the strip can scroll straight to it.
function dayCardId(day: string): string {
  return `day-${day}`;
}

function DayCard({
  group,
  today,
  regions,
  onOpen,
}: {
  group: DayGroup;
  today: string;
  regions: string[];
  onOpen: (item: DayItem) => void;
}) {
  const { day, items } = group;
  const isToday = day === today;

  const hourLines = HOUR_MARKS.map((hour) => ({
    pct: hourMarkPct(hour),
    hour,
  }));

  return (
    <div
      id={dayCardId(day)}
      className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-white/5 dark:border dark:border-white/10 scroll-mt-3"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>✦ {dayLabel(day)}</span>
        {isToday && (
          <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
            Today
          </span>
        )}
        <ShareDayButton day={day} regions={regions} />
      </div>

      <div className="relative h-4">
        {hourLines.map(({ pct, hour }) => (
          <span
            key={hour}
            className="absolute top-0 text-[10px] leading-none text-muted-foreground/60 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            {hourMarkLabel(hour)}
          </span>
        ))}
      </div>

      <div className="relative flex flex-col gap-1.5">
        <div className="absolute inset-0 pointer-events-none">
          {hourLines.map(({ pct }, i) => (
            <div
              key={i}
              className="absolute inset-y-0 border-l border-dashed border-black/5 dark:border-white/8"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>

        {items.map((item) => (
          <div key={item.event.id} className="relative h-14">
            <EventBar item={item} onClick={() => onOpen(item)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared links carry the regions too, since the day alone would otherwise show
// whatever regions the recipient last had selected.
function regionParam(regions: string[]): string {
  return REGIONS.every((region) => regions.includes(region)) ? "all" : regions.join(",");
}

function ShareDayButton({ day, regions }: { day: string; regions: string[] }) {
  const [, setSearchParams] = useSearchParams();
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = setTimeout(() => setShareState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [shareState]);

  async function share() {
    // Keeps the page's own params, like Home's ?view=calendar.
    const params = new URLSearchParams(window.location.search);
    params.set("day", day);
    params.set("region", regionParam(regions));
    params.delete("week");
    params.delete("event");
    const url = `${window.location.origin}${window.location.pathname}?${params}`;

    // Put the params in the address bar too, so the link is still recoverable if
    // neither the share sheet nor the clipboard is available.
    setSearchParams(params, { replace: true, preventScrollReset: true });

    // Phones get the native share sheet; everything else copies the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${dayLabel(day)} | The Rave Roster`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={share} className="ml-auto">
      {shareState === "idle"
        ? <Share2Icon />
        : shareState === "copied"
          ? <CheckIcon />
          : "Couldn't copy, share link in address bar"}
    </Button>
  );
}

export function CalendarView({ events, bookmarkedOnly }: { events: Event[]; bookmarkedOnly: boolean; }) {
  const { selectedRegions, excludedSubregions, inSelectedRegions } = useRegion();
  const { selectedGenres, hideClubs, matchesSelectedGenres } = useGenres();
  const [searchParams, setSearchParams] = useSearchParams();
  const { value: openDialogId, show } = useUrlDialogParam("event");
  const { isBookmarked } = useBookmarks();
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) =>
          inSelectedRegions(event) &&
          matchesSelectedGenres(event) &&
          isFutureEvent(event) &&
          // Keep the open event while its dialog is up, so un-bookmarking it there
          // doesn't pull it out from under the dialog.
          (!bookmarkedOnly || isBookmarked(event.id) || openDialogId?.startsWith(`${event.id}-`))
        )
        .sort((a, b) => moment.parseZone(a.start_at).diff(moment.parseZone(b.start_at))),
    [events, selectedRegions, excludedSubregions, selectedGenres, hideClubs, bookmarkedOnly, isBookmarked, openDialogId]
  );

  // Use the same 10am cutoff so last night's show still shows in the early hours.
  const today = moment().subtract(WINDOW_START_HOUR, "hours").format("YYYY-MM-DD");
  // The "Today" badge goes on the browser's local calendar date, no cutoff.
  const localToday = moment().format("YYYY-MM-DD");

  const allDayGroups = useMemo(() => buildDayGroups(filteredEvents), [filteredEvents]);
  // Numbered across every day, so a festival that started weeks ago counts on.
  const eventDay = useMemo(
    () => eventDayNumberer(allDayGroups.flatMap((group) => group.items)),
    [allDayGroups]
  );
  // From today on, as in the list view: past days, and the earlier days of a
  // festival still running, are dropped. A day with nothing on but festivals
  // winding up isn't worth a card.
  const dayGroups = useMemo(
    () => allDayGroups.filter((group) =>
      group.day >= today &&
      !group.items.every((item) => isClosingDay(eventDay(item.event, item.day)))
    ),
    [allDayGroups, eventDay, today]
  );
  // The same day strip as the list view, over the calendar's show days.
  const stripGroups = useMemo(
    () => dayGroups.map((group) => ({ day: group.day, events: group.items.map((item) => item.event) })),
    [dayGroups]
  );
  const weekLabel = useMemo(() => weekLabeller(stripGroups), [stripGroups]);

  // Start on the day in the URL (the list view's, or a shared link's), else an
  // older link's ?week=, else today or the next day with something on.
  const initialIndex = () => {
    const byDay = dayGroups.findIndex((group) => group.day === searchParams.get("day"));
    if (byDay !== -1) return byDay;
    const week = searchParams.get("week");
    const byWeek = week ? dayGroups.findIndex((group) => weekKey(group.day) === week) : -1;
    if (byWeek !== -1) return byWeek;
    return Math.max(dayGroups.findIndex((group) => group.day >= today), 0);
  };

  const [index, setIndex] = useState(initialIndex);
  const current = Math.min(index, Math.max(dayGroups.length - 1, 0));
  const day = dayGroups[current]?.day;

  // The day to bring into view once its week has rendered, starting with the
  // one the view opens on.
  const pendingScroll = useRef<{ day: string; behavior: ScrollBehavior } | null>(
    day ? { day, behavior: "instant" } : null
  );

  function select(i: number) {
    const group = dayGroups[i];
    if (!group) return;
    // Within the week the page is already showing, glide there; a new week
    // swaps the cards out, so jump.
    const sameWeek = weekKey(group.day) === weekKey(day ?? "");
    pendingScroll.current = { day: group.day, behavior: sameWeek ? "smooth" : "instant" };
    setIndex(i);
  }

  // Back to the starting day when the region, genre or bookmark filter changes
  // the set of days.
  useLayoutEffect(() => {
    const i = initialIndex();
    setIndex(i);
    if (dayGroups[i]) pendingScroll.current = { day: dayGroups[i].day, behavior: "instant" };
  }, [selectedRegions.join(","), excludedSubregions.join(","), selectedGenres.join(","), hideClubs, bookmarkedOnly]);

  // Brings the day's card up under the stuck strip. A week's first day goes
  // back to the top of the page instead, so the controls above come back too.
  useLayoutEffect(() => {
    const target = pendingScroll.current;
    const card = target && document.getElementById(dayCardId(target.day));
    const bar = rootRef.current?.firstElementChild as HTMLElement | null;
    if (!target || !card || !bar) return;
    pendingScroll.current = null;
    const top = card.previousElementSibling
      ? card.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 12
      : 0;
    window.scrollTo({ top, behavior: target.behavior });
  });

  // Record the day in the URL, as the list view does, so switching views or
  // refreshing keeps it. Edits the live URL, as an open dialog may have just
  // replaced ?event=.
  useEffect(() => {
    if (!day || searchParams.get("day") === day) return;
    const params = new URLSearchParams(window.location.search);
    params.set("day", day);
    params.delete("week");
    setSearchParams(params, { replace: true, preventScrollReset: true });
  }, [day]);

  if (dayGroups.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        {bookmarkedOnly ? "No bookmarked events to show." : "No events to show, check your filters."}
      </div>
    );
  }

  const week = weekKey(dayGroups[current].day);
  const weekGroups = dayGroups.filter((group) => weekKey(group.day) === week);
  // The week's bars in the order they're laid out, for the dialog to step through.
  const weekItems = weekGroups.flatMap((group) => group.items);

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <DayStripBar groups={stripGroups} index={current} weekLabel={weekLabel} onSelect={select} />

      <div className="flex flex-col gap-3">
        {weekGroups.map((group) => (
          <DayCard
            key={group.day}
            group={group}
            today={localToday}
            regions={selectedRegions}
            onOpen={(item) => show(itemDialogId(item))}
          />
        ))}
      </div>

      <EventListDialog
        events={weekItems.map((item) => item.event)}
        dialogId={(_, i) => itemDialogId(weekItems[i])}
        eventDay={(event, i) => eventDay(event, weekItems[i].day)}
      />
    </div>
  );
}
