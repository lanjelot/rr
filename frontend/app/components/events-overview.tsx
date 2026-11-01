import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Event } from "~/lib/data";
import { cn, isMultiDay } from "~/lib/utils";
import { EventCompact } from "./event-compact";
import { EventListDialog } from "./event-details-card";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { useRegion } from "~/contexts/region-context";
import { useSearchParams } from "react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "./ui/button";
import moment from 'moment';

const DAY_FMT = "YYYY-MM-DD";

// One group per calendar day, in the event's own timezone. A multi-day event
// (a festival) is listed on every day it runs, not just the first, so it's
// still there when someone swipes to the Sunday.
function groupEventsByDay(events: Event[]) {
  const byDay = new Map<string, Event[]>();

  for (const event of events) {
    const start = moment.parseZone(event.start_at).startOf("day");
    const finish = isMultiDay(event) ? moment.parseZone(event.finish_at) : start;

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

// A rave week runs Tuesday to Monday, so a Sunday-into-Monday party stays in
// the same week as its weekend.
function weekStart(day: moment.Moment) {
  return day.clone().startOf("day").subtract((day.isoWeekday() + 5) % 7, "days");
}

type WeekLabel = { key: string; tag?: "This week" | "Next week"; range: string; };

// Labels each week by the days that actually have events in it, e.g.
// "13 - 15 Nov" or "30 Oct - 1 Nov". Only shown past next week, where
// "This week"/"Next week" stop being enough.
function weekLabeller(groups: { day: string; }[]) {
  const ranges = new Map<string, { first: moment.Moment; last: moment.Moment; }>();
  for (const group of groups) {
    const day = moment(group.day, DAY_FMT);
    const key = weekStart(day).format(DAY_FMT);
    const range = ranges.get(key);
    if (!range) ranges.set(key, { first: day, last: day });
    else range.last = day;
  }

  const thisWeek = weekStart(moment());

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

  // Chips grouped into weeks, keeping each day's index into `groups`.
  const weeks: { label: WeekLabel; days: { group: typeof groups[number]; i: number; }[]; }[] = [];
  groups.forEach((group, i) => {
    const label = weekLabel(group.day);
    if (weeks[weeks.length - 1]?.label.key !== label.key) weeks.push({ label, days: [] });
    weeks[weeks.length - 1].days.push({ group, i });
  });

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
            {week.days.map(({ group, i }) => {
              const day = moment(group.day, DAY_FMT);
              return (
                <button
                  key={group.day}
                  ref={el => { chipRefs.current[i] = el; }}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-current={i === index ? "date" : undefined}
                  aria-label={`${day.format("dddd D MMMM")}, ${week.label.tag ?? week.label.range}, ${group.events.length} events`}
                  className={cn(
                    "flex-none w-12 py-1 rounded-lg flex flex-col items-center leading-tight transition-colors",
                    i === index
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

function DayPage({ day, events, week, render }: { day: string; events: Event[]; week: WeekLabel; render: boolean; }) {
  const { show } = useUrlDialogParam("event");

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground font-semibold text-base ms-3">
        {moment(day, DAY_FMT).format("dddd D MMMM")}
      </div>
      {render && events.map((event: Event) => (
        <EventCompact key={event.id} event={event} onClick={() => show(event.id)} />
      ))}
    </div>
  );
}

export function EventsOverview({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [searchParams, setSearchParams] = useSearchParams();
  const openEvent = searchParams.get("event");

  const regionEvents = events.filter((event: Event) => selectedRegions.includes(event.region));
  const allGroups = groupEventsByDay(regionEvents);
  const weekLabel = weekLabeller(allGroups);
  const today = moment().format(DAY_FMT);
  const groups = allGroups.filter(group => group.day >= today);

  // Start on the day in the URL, else the day of a linked event (so a shared
  // ?event= link opens its dialog), else the first upcoming day.
  const initialIndex = () => {
    const byDay = groups.findIndex(group => group.day === searchParams.get("day"));
    if (byDay !== -1) return byDay;
    const byEvent = groups.findIndex(group => group.events.some(event => String(event.id) === openEvent));
    return Math.max(byEvent, 0);
  };

  const [index, setIndex] = useState(initialIndex);
  const current = Math.min(index, Math.max(groups.length - 1, 0));

  const rootRef = useRef<HTMLDivElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();

  // The day strip is see-through at rest, and only gets a backing once it's
  // stuck to the top with events scrolling under it.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck((rootRef.current?.getBoundingClientRect().top ?? 0) < 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // Jump straight to the starting day, and back to it if the region selection
  // changes the set of days.
  useLayoutEffect(() => {
    const i = initialIndex();
    setIndex(i);
    pagerRef.current?.scrollTo({ left: pageLeft(i), behavior: "instant" });
  }, [selectedRegions.join(",")]);

  // The pager is clipped to the current page's height so a short day doesn't
  // sit above a screen of blank space left by its taller neighbours.
  useLayoutEffect(() => {
    const page = pageRefs.current[current];
    if (!page) return;
    const observer = new ResizeObserver(() => setHeight(page.offsetHeight));
    observer.observe(page);
    return () => observer.disconnect();
  }, [current, groups.length]);

  // On a new day, bring its top back into view if we'd scrolled down a long
  // one, and record it in the URL so Back/refresh/sharing keep the day.
  useEffect(() => {
    const root = rootRef.current;
    if (root && root.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top, behavior: "instant" });
    }
    const day = groups[current]?.day;
    if (day && searchParams.get("day") !== day) {
      setSearchParams(params => {
        params.set("day", day);
        params.delete("tab");
        return params;
      }, { replace: true, preventScrollReset: true });
    }
  }, [current, groups[current]?.day]);

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
    return <div className="text-center">... nothing yet 🤞 stay tuned ...</div>;
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div
        className={cn(
          "sticky top-0 z-10 -mx-3 px-3 py-2 flex items-center gap-1 border-b border-transparent transition-colors",
          stuck && "backdrop-blur-md bg-zinc-100/80 border-black/10 dark:bg-zinc-900/80 dark:border-white/10",
        )}
      >
        <Button variant="ghost" size="icon" aria-label="Previous day" disabled={current === 0} onClick={() => goTo(current - 1)}>
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 grow">
          <DayStrip groups={groups} index={current} weekLabel={weekLabel} onSelect={goTo} />
        </div>
        <Button variant="ghost" size="icon" aria-label="Next day" disabled={current === groups.length - 1} onClick={() => goTo(current + 1)}>
          <ChevronRightIcon />
        </Button>
      </div>

      {/* One page per day, each a little narrower than the screen so the edge
          of the next day peeks in and invites a swipe. Only the current day
          and its neighbours render their events. */}
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
            className="flex-none w-[88%] snap-start snap-always"
            aria-hidden={i !== current}
            inert={i !== current}
          >
            <DayPage day={group.day} events={group.events} week={weekLabel(group.day)} render={Math.abs(i - current) <= 1} />
          </div>
        ))}
        {/* Lets the last page scroll all the way to the start edge. */}
        <div aria-hidden className="flex-none w-[calc(12%-0.75rem)] h-px" />
      </div>

      <EventListDialog events={groups[current].events} />
    </div>
  );
}
