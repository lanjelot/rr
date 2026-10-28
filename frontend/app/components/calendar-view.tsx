import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Share2Icon } from "lucide-react";
import moment from "moment";
import { REGIONS, type Event } from "~/lib/data";
import { cn, isFutureEvent } from "~/lib/utils";
import { useRegion } from "~/contexts/region-context";
import { Button } from "~/components/ui/button";
import { EventListDialog } from "./event-details-card";
import { useUrlDialogParam } from "~/hooks/url-dialog";

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

function dayWindowStart(day: string): moment.Moment {
  return moment(day, "YYYY-MM-DD").startOf("day").add(WINDOW_START_HOUR, "hours");
}

// Clips an event to a day's window, or returns null when it doesn't actually overlap it.
// An event finishing at exactly 10am, or starting at exactly 6am, touches the neighbouring
// day's window without spending any time in it, and would otherwise leave that day empty.
function clipToDay(event: Event, day: string): DayItem | null {
  const windowStart = dayWindowStart(day);
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
  const leftPct = (startMin / WINDOW_MINUTES) * 100;
  const widthPct = ((endMin - startMin) / WINDOW_MINUTES) * 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-y-0 flex items-center gap-1.5 rounded-lg pl-1 pr-2 min-w-0 bg-white hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 overflow-hidden transition-colors text-left"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        maxWidth: `calc(100% - ${leftPct}%)`,
      }}
    >
      <img
        src={event.flyer}
        alt=""
        loading="lazy"
        className="flex-none size-10 rounded-md object-cover"
      />
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-xs font-medium truncate">{event.name}</span>
        {/* <span className="text-[11px] text-muted-foreground truncate">{eventTime(event)}</span> */}
        <span className="text-xs text-muted-foreground truncate">{event.location}</span>
      </div>
    </button>
  );
}

function dayLabel(day: string): string {
  return moment(day).format("dddd D MMMM");
}

type WeekTab = {
  key: string;
  label: string;
  groups: DayGroup[];
};

type MonthTab = {
  key: string;
  label: string;
  weeks: WeekTab[];
};

function monthKey(day: string): string {
  return moment(day).startOf("month").format("YYYY-MM-DD");
}

function monthLabel(monthStart: string): string {
  return moment(monthStart).format("MMM YYYY");
}

// Weeks run Tuesday to Tuesday, not Monday to Sunday.
function weekKey(day: string): string {
  const d = moment(day);
  const daysSinceTuesday = (d.day() - 2 + 7) % 7;
  return d.clone().subtract(daysSinceTuesday, "days").format("YYYY-MM-DD");
}

// Weeks are labelled by their Fri-Sun span, since that's when raves actually happen.
function weekLabel(weekStart: string): string {
  const friday = moment(weekStart).add(3, "days");
  const sunday = moment(weekStart).add(5, "days");
  const sameMonth = friday.isSame(sunday, "month");

  return `Fri ${friday.format(sameMonth ? "D" : "D MMM")} - Sun ${sunday.format("D")}`;
}

// Whether the event falls in the current Tue-Tue week (using the same show-day cutoff),
// so e.g. last Monday's events, which belong to the previous week, are excluded.
// 10am cutoff: "today" is shifted by the same 10am cutoff the rest of the calendar uses.
// For example, at 5am on a Tuesday the current week is still the previous one, which
// matches how the tabs and the "Today" tag behave.
function isThisShowWeek(event: Event): boolean {
  const today = moment().subtract(WINDOW_START_HOUR, "hours").format("YYYY-MM-DD");
  return weekKey(showDay(event.start_at)) === weekKey(today);
}

function groupByWeek(dayGroups: DayGroup[]): WeekTab[] {
  const map = new Map<string, DayGroup[]>();

  for (const group of dayGroups) {
    const key = weekKey(group.day);
    map.set(key, [...(map.get(key) ?? []), group]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groups]) => ({ key, label: weekLabel(key), groups }));
}

// Months are built out of whole weeks, and a week that straddles two months belongs to
// the month its Friday falls in, matching the Fri-Sun span the week is labelled by.
function groupByMonth(weeks: WeekTab[]): MonthTab[] {
  const map = new Map<string, WeekTab[]>();

  for (const week of weeks) {
    const key = monthKey(moment(week.key).add(3, "days").format("YYYY-MM-DD"));
    map.set(key, [...(map.get(key) ?? []), week]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthWeeks]) => ({ key, label: monthLabel(key), weeks: monthWeeks }));
}

function DayCard({
  group,
  today,
  onOpen,
}: {
  group: DayGroup;
  today: string;
  onOpen: (item: DayItem) => void;
}) {
  const { day, items } = group;
  const isToday = day === today;

  const hourLines = HOUR_MARKS.map((hour) => ({
    pct: hourMarkPct(hour),
    hour,
  }));

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-white/5 dark:border dark:border-white/10">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>✦ {dayLabel(day)}</span>
        {isToday && (
          <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
            Today
          </span>
        )}
      </div>

      <div className="relative h-4">
        {hourLines.map(({ pct, hour }) => (
          <span
            key={hour}
            className="absolute top-0 text-[9px] leading-none text-muted-foreground/60 -translate-x-1/2"
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

function TabRow({
  tabs,
  activeKey,
  onSelect,
}: {
  tabs: { key: string; label: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cn(
            "flex-none px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
            tab.key === activeKey
              ? "bg-primary text-primary-foreground font-medium"
              : "bg-zinc-100 text-muted-foreground hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Shared links carry the regions too, since the week alone would otherwise show
// whatever regions the recipient last had selected.
function regionParam(regions: string[]): string {
  return REGIONS.every((region) => regions.includes(region)) ? "all" : regions.join(",");
}

function ShareWeekButton({ week, regions }: { week: WeekTab; regions: string[] }) {
  const [, setSearchParams] = useSearchParams();
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = setTimeout(() => setShareState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [shareState]);

  async function share() {
    const params = new URLSearchParams({ week: week.key, region: regionParam(regions) });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;

    // Put the params in the address bar too, so the link is still recoverable if
    // neither the share sheet nor the clipboard is available.
    setSearchParams(params, { replace: true, preventScrollReset: true });

    // Phones get the native share sheet; everything else copies the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${week.label} | The Rave Roster`, url });
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
    <Button variant="secondary" size="sm" onClick={share} className="flex-none">
      <Share2Icon />
      <span>
        {shareState === "idle"
          ? "Share"
          : shareState === "copied"
            ? "Link copied"
            : "Couldn't copy, share link in address bar"}
      </span>
    </Button>
  );
}

export function CalendarView({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [searchParams] = useSearchParams();
  const { show } = useUrlDialogParam("event");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  // Read once, on mount: a shared link opens on its week, then the tabs own the state.
  const [activeWeek, setActiveWeek] = useState<string | null>(() => searchParams.get("week"));

  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => selectedRegions.includes(event.region) && (isThisShowWeek(event) || isFutureEvent(event)))
        .sort((a, b) => moment.parseZone(a.start_at).diff(moment.parseZone(b.start_at))),
    [events, selectedRegions]
  );

  const dayGroups = useMemo(() => buildDayGroups(filteredEvents), [filteredEvents]);
  const weeks = useMemo(() => groupByWeek(dayGroups), [dayGroups]);
  const months = useMemo(() => groupByMonth(weeks), [weeks]);

  if (months.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No events to show, check your filters.
      </div>
    );
  }

  const currentMonth =
    months.find((month) => month.key === activeMonth) ??
    months.find((month) => month.weeks.some((week) => week.key === activeWeek)) ??
    months[0];
  const currentWeek =
    currentMonth.weeks.find((week) => week.key === activeWeek) ?? currentMonth.weeks[0];

  // The week's bars in the order they're laid out, for the dialog to step through.
  const weekItems = currentWeek.groups.flatMap((group) => group.items);

  // Use the same 10am cutoff so "Today" still tags last night's show in the early hours.
  const today = moment().subtract(WINDOW_START_HOUR, "hours").format("YYYY-MM-DD");

  return (
    <div className="flex flex-col gap-3">
      <TabRow tabs={months} activeKey={currentMonth.key} onSelect={setActiveMonth} />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <TabRow tabs={currentMonth.weeks} activeKey={currentWeek.key} onSelect={setActiveWeek} />
        </div>
        <ShareWeekButton week={currentWeek} regions={selectedRegions} />
      </div>

      <div className="flex flex-col gap-3">
        {currentWeek.groups.map((group) => (
          <DayCard key={group.day} group={group} today={today} onOpen={(item) => show(itemDialogId(item))} />
        ))}
      </div>

      <EventListDialog
        events={weekItems.map((item) => item.event)}
        dialogId={(_, i) => itemDialogId(weekItems[i])}
      />
    </div>
  );
}
