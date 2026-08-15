import { useMemo, useState } from "react";
import moment from "moment";
import type { Event } from "~/lib/data";
import { cn, eventDate, eventTime, isFutureEvent, isHappeningNow } from "~/lib/utils";
import { useRegion } from "~/contexts/region-context";
import { DateBadge, RegionBadge } from "./event-badges";
import { TicketLink } from "./ticket-link";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { XCircleIcon } from "@heroicons/react/24/outline";

// Day cards run from 10am to 6am the next day, since that's when raves actually happen.
const WINDOW_START_HOUR = 10;
const WINDOW_MINUTES = 20 * 60;
const HOUR_MARKS = [12, 18, 0];
const MAX_EVENT_DAYS = 21;

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

function buildDayGroups(events: Event[]): DayGroup[] {
  const eventDays = new Map<number, string[]>();
  const allDays = new Set<string>();

  for (const event of events) {
    const days = eventShowDays(event);
    eventDays.set(event.id, days);
    days.forEach((day) => allDays.add(day));
  }

  const sortedDays = Array.from(allDays).sort();

  return sortedDays.map((day) => {
    const windowStart = moment(day, "YYYY-MM-DD").startOf("day").add(WINDOW_START_HOUR, "hours");

    const items: DayItem[] = events
      .filter((event) => eventDays.get(event.id)!.includes(day))
      .map((event) => {
        const startMin = Math.max(0, moment.parseZone(event.start_at).diff(windowStart, "minutes"));
        const endMin = Math.min(
          WINDOW_MINUTES,
          moment.parseZone(event.finish_at).diff(windowStart, "minutes")
        );
        return { event, startMin, endMin: Math.max(endMin, startMin + 1) };
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    return { day, items };
  });
}

function EventDetailsCard({ event }: { event: Event }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <img
          src={event.flyer}
          alt=""
          className="w-full object-cover h-80 rounded-t-xl"
        />
        <div className="absolute top-2 left-2">
          <DateBadge event={event} />
        </div>
        <div className="absolute top-2 right-2">
          <RegionBadge event={event} />
        </div>
        <DialogClose className="absolute bottom-2 right-2 text-white">
          <XCircleIcon className="size-6" />
        </DialogClose>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <DialogTitle className="text-center">{event.name}</DialogTitle>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <ul>
            {event.artists && <li>🎧 {event.artists}</li>}
            {event.djs && <li>🎧 {event.djs}</li>}
            {event.promoter && <li>🌀 {event.promoter}</li>}
          </ul>
          <ul>
            <li className="flex justify-between gap-1">
              <span>📅 {eventDate(event)}</span>
              {isHappeningNow(event) && (
                <span className="bg-red-300 rounded-md px-3 text-black">Happening now</span>
              )}
            </li>
            <li>⏰ {eventTime(event)}</li>
            <li>📍 {event.location}</li>
            {event.venue && <li>🏛️ {event.venue}</li>}
          </ul>
          <ul>
            {event.genre && <li>🎶 {event.genre}</li>}
            {event.ticket && (
              <li>🎫 <TicketLink event={event} /></li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EventBar({ event, startMin, endMin }: DayItem) {
  const leftPct = (startMin / WINDOW_MINUTES) * 100;
  const widthPct = ((endMin - startMin) / WINDOW_MINUTES) * 100;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
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
            <span className="text-[11px] text-muted-foreground truncate">{event.location}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <EventDetailsCard event={event} />
      </DialogContent>
    </Dialog>
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

// Months are built out of whole weeks, so a week that straddles two months shows up
// under both month tabs rather than having its days split between them.
function groupByMonth(weeks: WeekTab[]): MonthTab[] {
  const map = new Map<string, WeekTab[]>();

  for (const week of weeks) {
    const keys = new Set(week.groups.map((group) => monthKey(group.day)));
    for (const key of keys) {
      map.set(key, [...(map.get(key) ?? []), week]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthWeeks]) => ({ key, label: monthLabel(key), weeks: monthWeeks }));
}

function DayCard({ group, today }: { group: DayGroup; today: string }) {
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
            <EventBar {...item} />
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

export function CalendarView({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => selectedRegions.includes(event.region) && isFutureEvent(event))
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

  const currentMonth = months.find((month) => month.key === activeMonth) ?? months[0];
  const currentWeek =
    currentMonth.weeks.find((week) => week.key === activeWeek) ?? currentMonth.weeks[0];

  // Use the same 10am cutoff so "Today" still tags last night's show in the early hours.
  const today = moment().subtract(WINDOW_START_HOUR, "hours").format("YYYY-MM-DD");

  return (
    <div className="flex flex-col gap-3">
      <TabRow tabs={months} activeKey={currentMonth.key} onSelect={setActiveMonth} />
      <TabRow tabs={currentMonth.weeks} activeKey={currentWeek.key} onSelect={setActiveWeek} />

      <div className="flex flex-col gap-3">
        {currentWeek.groups.map((group) => (
          <DayCard key={group.day} group={group} today={today} />
        ))}
      </div>
    </div>
  );
}
