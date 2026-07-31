import type { Event } from "~/lib/data";
import { isNextWeek, isThisWeek } from "~/lib/utils";
import { EventCompact } from "./event-compact";
import { useRegion } from "~/contexts/region-context";
import moment from 'moment';

function getWeekLabel(events: Event[], fallbackStart: moment.Moment, end: moment.Moment) {
  const start =
    events.length > 0
      ? moment.min(events.map(event => moment(event.start_at)))
      : fallbackStart;

  return `${start.format("ddd D")} - ${end.format("ddd D MMM YYYY")}`;
}

export function EventsOverview({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();

  const regionEvents = events.filter((event: Event) => selectedRegions.includes(event.region));

  const thisWeek = regionEvents.filter((event: Event) => isThisWeek(event));
  const nextWeek = regionEvents.filter((event: Event) => isNextWeek(event));

  const thisWeekLabel = getWeekLabel(
    thisWeek,
    moment().startOf("isoWeek"),
    moment().endOf("isoWeek")
  );

  const nextWeekLabel = getWeekLabel(
    nextWeek,
    moment().startOf("isoWeek").add(1, "week"),
    moment().endOf("isoWeek").add(1, "week")
  );

  return (
    <div className="flex flex-col gap-6">
      {/* <h1 className="font-semibold text-xl text-center">🎉 Raves in Australia 🦘</h1> */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-3 justify-between items-center">
          <div className="font-semibold">✦ This weekend</div>
          <div className="text-muted-foreground text-sm">{thisWeekLabel}</div>
        </div>

        {thisWeek.length > 0 ? (
          <div className="flex flex-col gap-1">
            {thisWeek.map((event: Event) => (
              <EventCompact key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center">... nothing yet 🤞 stay tuned ...</div>
        )}
      </div>

      {/* <hr className="mx-auto w-[256px] my-3" /> */}

      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-3 justify-between items-center">
          <div className="font-semibold">✦ Next weekend</div>
          <div className="text-muted-foreground text-sm">{nextWeekLabel}</div>
        </div>


        {nextWeek.length > 0 ? (
          <div className="flex flex-col gap-1">
            {nextWeek.map((event: Event) => (
              <EventCompact key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center">... nothing yet 🤞 stay tuned ...</div>
        )}
      </div>

    </div>
  );
}