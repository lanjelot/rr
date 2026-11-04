import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Event } from "~/lib/data";
import { cn, isMultiDay, raveWeekStart as weekStart } from "~/lib/utils";
import { EventCompact } from "./event-compact";
import { EventListDialog } from "./event-details-card";
import { eventDayNumberer } from "./event-badges";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { useRegion } from "~/contexts/region-context";
import { useGenres } from "~/contexts/genre-context";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { useSearchParams } from "react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "./ui/button";
import moment from 'moment';

const DAY_FMT = "YYYY-MM-DD";
// The hour a night's partying counts as over, matching the calendar's show day.
const DAY_CUTOFF_HOUR = 10;

// One group per calendar day, in the event's own timezone. A multi-day event
// (a festival) is listed on every day it runs, not just the first, so it's
// still there when someone swipes to the Sunday.
function groupEventsByDay(events: Event[]) {
  const byDay = new Map<string, Event[]>();

  for (const event of events) {
    const start = moment.parseZone(event.start_at).startOf("day");
    // Its last day is the one it's still going in before the morning cutoff,
    // so a festival finishing at 10am Monday ends on the Sunday.
    const finish = isMultiDay(event)
      ? moment.parseZone(event.finish_at).subtract(DAY_CUTOFF_HOUR, "hours").subtract(1, "minute")
      : start;

    for (const day = start.clone(); day.isSameOrBefore(finish, "day"); day.add(1, "day")) {
      const key = day.format(DAY_FMT);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(event);
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, events]) => ({ day, events }));
}

// Every week shows at least its Friday to Sunday, even on days with nothing on.
function weekendDays(weekStart: moment.Moment) {
  return [3, 4, 5].map(offset => weekStart.clone().add(offset, "days"));
}

export type WeekLabel = { key: string; tag?: "This week" | "Next week"; range: string; };

// Labels each week by the days that have events in it, widened to at least
// Friday to Sunday, e.g. "13 - 15 Nov" or "30 Oct - 2 Nov". Only shown past
// next week, where "This week"/"Next week" stop being enough.
export function weekLabeller(groups: { day: string; }[]) {
  const ranges = new Map<string, { first: moment.Moment; last: moment.Moment; }>();
  for (const group of groups) {
    const day = moment(group.day, DAY_FMT);
    const start = weekStart(day);
    const key = start.format(DAY_FMT);
    if (!ranges.has(key)) {
      const [friday, , sunday] = weekendDays(start);
      ranges.set(key, { first: friday, last: sunday });
    }
    const range = ranges.get(key)!;
    if (day.isBefore(range.first)) range.first = day;
    if (day.isAfter(range.last)) range.last = day;
  }

  // By Monday the weekend's over, so "This week" is already the one starting
  // tomorrow rather than the one ending today.
  const thisWeek = weekStart(moment().add(1, "day"));

  return (day: string): WeekLabel => {
    const start = weekStart(moment(day, DAY_FMT));
    const key = start.format(DAY_FMT);
    const { first, last } = ranges.get(key)!;
    const range = first.isSame(last, "day")
      ? first.format("D MMM")
      : `${first.format(first.isSame(last, "month") ? "D" : "D MMM")} - ${last.format("D MMM")}`;
    const weeksAway = Math.round(start.diff(thisWeek, "days") / 7);
    const tag = weeksAway === 0 ? "This week" : weeksAway === 1 ? "Next week" : undefined;
    return { key, tag, range };
  };
}

function DayStrip({
  groups,
  index,
  weekLabel,
  onSelect,
}: {
  groups: { day: string; events: Event[]; }[];
  index: number;
  weekLabel: (day: string) => WeekLabel;
  onSelect: (index: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the active chip in view as the pages are swiped. Scrolling the strip
  // by hand rather than scrollIntoView() so the window doesn't jump vertically.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = chipRefs.current[index];
    if (!strip || !chip) return;
    const left = chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  // Chips grouped into weeks, keeping each day's index into `groups`. Any of
  // the week's Friday to Sunday still to come with nothing on gets a disabled
  // chip with no index.
  type Chip = { day: string; events: number; i?: number; };
  const weeks: { label: WeekLabel; days: Chip[]; }[] = [];
  groups.forEach((group, i) => {
    const label = weekLabel(group.day);
    if (weeks[weeks.length - 1]?.label.key !== label.key) weeks.push({ label, days: [] });
    weeks[weeks.length - 1].days.push({ day: group.day, events: group.events.length, i });
  });
  const today = moment().format(DAY_FMT);
  for (const week of weeks) {
    for (const weekend of weekendDays(moment(week.label.key, DAY_FMT))) {
      const day = weekend.format(DAY_FMT);
      if (day >= today && !week.days.some(chip => chip.day === day)) week.days.push({ day, events: 0 });
    }
    week.days.sort((a, b) => a.day.localeCompare(b.day));
  }

  return (
    <div ref={stripRef} className="relative flex overflow-x-auto no-scrollbar">
      {weeks.map((week, w) => (
        <div
          key={week.label.key}
          className={cn("flex-none flex flex-col gap-1", w > 0 && "ms-2 ps-2 border-s border-zinc-300 dark:border-white/15")}
        >
          {/* Sticks to the strip's left edge while its week is in view. */}
          <div
            className={cn(
              "sticky left-0 self-start px-1 text-sm whitespace-nowrap",
              week.label.tag === "This week" ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {week.label.tag ?? week.label.range}
          </div>
          <div className="flex gap-1.5">
            {week.days.map(chip => {
              const day = moment(chip.day, DAY_FMT);
              const i = chip.i;
              return (
                <button
                  key={chip.day}
                  ref={el => { if (i !== undefined) chipRefs.current[i] = el; }}
                  type="button"
                  disabled={i === undefined}
                  onClick={() => i !== undefined && onSelect(i)}
                  aria-current={i === index ? "date" : undefined}
                  aria-label={`${day.format("dddd D MMMM")}, ${week.label.tag ?? week.label.range}, ${chip.events} events`}
                  className={cn(
                    "flex-none w-12 py-1 rounded-lg flex flex-col items-center leading-tight transition-colors",
                    i === undefined
                      ? "bg-zinc-100 opacity-40 dark:bg-white/5"
                      : i === index
                        ? "bg-foreground text-background"
                        : "bg-zinc-100 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10",
                  )}
                >
                  <span className="text-sm">{day.format("ddd")}</span>
                  <span className="text-base font-semibold">{day.format("D")}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// The day strip with its Previous/Next arrows, stuck to the top of the screen
// as the page scrolls. Shared by Home's list and calendar views, and has to be
// the first child of the view so its parent's top says when it's stuck.
export function DayStripBar({
  groups,
  index,
  weekLabel,
  onSelect,
}: {
  groups: { day: string; events: Event[]; }[];
  index: number;
  weekLabel: (day: string) => WeekLabel;
  onSelect: (index: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  // See-through at rest, and only gets a backing once it's stuck to the top
  // with events scrolling under it.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck((barRef.current?.parentElement?.getBoundingClientRect().top ?? 0) < 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={barRef}
      className={cn(
        "sticky top-0 z-10 -mx-3 px-3 py-2 flex items-center gap-1 border-b border-transparent transition-colors",
        stuck && "backdrop-blur-md bg-zinc-100/80 border-black/10 dark:bg-zinc-900/80 dark:border-white/10",
      )}
    >
      <Button variant="ghost" size="icon" aria-label="Previous day" disabled={index === 0} onClick={() => onSelect(index - 1)}>
        <ChevronLeftIcon />
      </Button>
      <div className="min-w-0 grow">
        <DayStrip groups={groups} index={index} weekLabel={weekLabel} onSelect={onSelect} />
      </div>
      <Button variant="ghost" size="icon" aria-label="Next day" disabled={index === groups.length - 1} onClick={() => onSelect(index + 1)}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

// The dialog steps through every upcoming day, so a multi-day event is an entry
// per day it's listed on, keyed on the day too (as in the calendar). The day in
// the param is also what the pager follows as the dialog steps across days.
function dialogId(event: Event, day: string) {
  return `${event.id}-${day}`;
}

function parseDialogId(value: string | null) {
  const match = value?.match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/);
  return match ? { id: match[1], day: match[2] } : null;
}

function DayPage({ day, events, week, render }: { day: string; events: Event[]; week: WeekLabel; render: boolean; }) {
  const { show } = useUrlDialogParam("event");

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground font-semibold text-base ms-3">
        {moment(day, DAY_FMT).format("dddd D MMMM")}
      </div>
      {render && events.map((event: Event) => (
        <EventCompact key={event.id} event={event} onClick={() => show(dialogId(event, day))} />
      ))}
    </div>
  );
}

export function EventsOverview({ events, bookmarkedOnly }: { events: Event[]; bookmarkedOnly: boolean; }) {
  const { selectedRegions } = useRegion();
  const { selectedGenres, matchesSelectedGenres } = useGenres();
  const [searchParams, setSearchParams] = useSearchParams();
  const openEvent = searchParams.get("event");
  const { isBookmarked } = useBookmarks();

  const regionEvents = events.filter((event: Event) =>
    selectedRegions.includes(event.region) &&
    matchesSelectedGenres(event) &&
    // Keep the open event while its dialog is up, so un-bookmarking it there
    // doesn't pull it out from under the dialog.
    (!bookmarkedOnly || isBookmarked(event.id) || parseDialogId(openEvent)?.id === String(event.id))
  );
  const allGroups = groupEventsByDay(regionEvents);
  const weekLabel = weekLabeller(allGroups);
  const today = moment().format(DAY_FMT);
  const groups = allGroups.filter(group => group.day >= today);

  // Every upcoming day's events in order, for the dialog to step through.
  const dialogEntries = groups.flatMap(group => group.events.map(event => ({ event, day: group.day })));
  // Numbered over past days too, so a festival that started yesterday is on day 2.
  const eventDay = eventDayNumberer(allGroups.flatMap(group => group.events.map(event => ({ event, day: group.day }))));

  // Start on the open event's day, else the day in the URL, else the day of a
  // plain ?event=<id> link, else the first upcoming day.
  const initialIndex = () => {
    const openDay = parseDialogId(openEvent)?.day;
    const byOpenDay = groups.findIndex(group => group.day === openDay);
    if (byOpenDay !== -1) return byOpenDay;
    const byDay = groups.findIndex(group => group.day === searchParams.get("day"));
    if (byDay !== -1) return byDay;
    const byEvent = groups.findIndex(group => group.events.some(event => String(event.id) === openEvent));
    return Math.max(byEvent, 0);
  };

  // Edits the live URL rather than setSearchParams' updater argument, which is
  // the params as of the last render: the dialog may have just replaced
  // ?event= as it stepped, and writing ?day= from stale params would undo it.
  const replaceParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    update(params);
    setSearchParams(params, { replace: true, preventScrollReset: true });
  };

  const [index, setIndex] = useState(initialIndex);
  const current = Math.min(index, Math.max(groups.length - 1, 0));

  const rootRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();

  const pageLeft = (i: number) => (pageRefs.current[i]?.offsetLeft ?? 0) - (pageRefs.current[0]?.offsetLeft ?? 0);

  // Set while an arrow/chip click smooth-scrolls the pager, so the days it
  // passes on the way don't each become current.
  const scrollTarget = useRef<number | null>(null);

  const goTo = useCallback((i: number, behavior: ScrollBehavior = "smooth") => {
    if (i < 0 || i >= groups.length) return;
    scrollTarget.current = behavior === "smooth" ? i : null;
    pagerRef.current?.scrollTo({ left: pageLeft(i), behavior });
    setIndex(i);
  }, [groups.length]);

  // Jump straight to the starting day, and back to it if the region, genre or
  // bookmark filter changes the set of days.
  useLayoutEffect(() => {
    const i = initialIndex();
    setIndex(i);
    pagerRef.current?.scrollTo({ left: pageLeft(i), behavior: "instant" });
  }, [selectedRegions.join(","), selectedGenres.join(","), bookmarkedOnly]);

  // The pager is clipped to the current page's height so a short day doesn't
  // sit above a screen of blank space left by its taller neighbours.
  useLayoutEffect(() => {
    const page = pageRefs.current[current];
    if (!page) return;
    const observer = new ResizeObserver(() => setHeight(page.offsetHeight));
    observer.observe(page);
    return () => observer.disconnect();
  }, [current, groups.length]);

  // On a new day, bring its top back into view if we'd scrolled down a long one.
  useEffect(() => {
    const root = rootRef.current;
    if (root && root.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top, behavior: "instant" });
    }
  }, [current]);

  // Record the day in the URL so refresh/sharing keep it. Also re-run when the
  // URL's day changes under us: closing the dialog pops back to the entry from
  // when it opened, whose ?day= predates the days the dialog stepped through.
  const day = groups[current]?.day;
  const dayParam = searchParams.get("day");
  useEffect(() => {
    if (day && dayParam !== day) {
      replaceParams(params => {
        params.set("day", day);
        params.delete("tab");
      });
    }
  }, [day, dayParam]);

  // Follow the dialog: stepping past the last event of a day moves the page
  // behind it on to the next, so closing the dialog leaves you on that day. A
  // plain ?event=<id> (an older link) is pinned to a day first, preferring the
  // one on screen.
  useEffect(() => {
    if (!openEvent) return;
    const parsed = parseDialogId(openEvent);
    if (parsed) {
      const i = groups.findIndex(group => group.day === parsed.day);
      if (i !== -1 && i !== current) goTo(i, "instant");
      return;
    }
    const hasEvent = (i: number) => groups[i]?.events.some(event => String(event.id) === openEvent);
    const i = hasEvent(current) ? current : groups.findIndex((_, i) => hasEvent(i));
    if (i === -1) return;
    replaceParams(params => {
      params.set("event", `${openEvent}-${groups[i].day}`);
      params.set("day", groups[i].day);
    });
  }, [openEvent]);

  // ←/→ step days, unless the event dialog (which steps events) is open or
  // focus is in a text field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (openEvent || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") goTo(current - 1);
      if (e.key === "ArrowRight") goTo(current + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openEvent, current, goTo]);

  const onScroll = () => {
    const pager = pagerRef.current;
    const stride = pageLeft(1);
    if (!pager || !stride) return;
    const i = Math.round(pager.scrollLeft / stride);
    if (scrollTarget.current !== null) {
      if (Math.abs(pager.scrollLeft - pageLeft(scrollTarget.current)) < 2) scrollTarget.current = null;
      return;
    }
    if (i !== current && groups[i]) setIndex(i);
  };

  if (groups.length === 0) {
    return bookmarkedOnly
      ? <div className="text-center text-muted-foreground py-10">No bookmarked events to show.</div>
      : <div className="text-center">... nothing yet 🤞 stay tuned ...</div>;
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <DayStripBar groups={groups} index={current} weekLabel={weekLabel} onSelect={goTo} />

      {/* One full-width page per day. Only the current day and its
          neighbours render their events. */}
      <div
        ref={pagerRef}
        onScroll={onScroll}
        // A swipe that interrupts a click's smooth scroll takes over again.
        onPointerDown={() => { scrollTarget.current = null; }}
        style={{ height }}
        className="relative flex items-start gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar overscroll-x-contain"
      >
        {groups.map((group, i) => (
          <div
            key={group.day}
            ref={el => { pageRefs.current[i] = el; }}
            className="flex-none w-full snap-start snap-always"
            aria-hidden={i !== current}
            inert={i !== current}
          >
            <DayPage day={group.day} events={group.events} week={weekLabel(group.day)} render={Math.abs(i - current) <= 1} />
          </div>
        ))}
      </div>

      <EventListDialog
        events={dialogEntries.map(entry => entry.event)}
        dialogId={(_, i) => dialogId(dialogEntries[i].event, dialogEntries[i].day)}
        eventDay={(event, i) => eventDay(event, dialogEntries[i].day)}
      />
    </div>
  );
}
