import type { Event } from "~/lib/data";
import { isNextWeek, isThisWeek } from "~/lib/utils";
import { EventCompact } from "./event-compact";
import { useRegion } from "~/contexts/region-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useSearchParams } from "react-router";
import moment from 'moment';

function groupEventsByDay(events: Event[]) {
  const groups: { day: string; events: Event[]; }[] = [];

  for (const event of events) {
    const day = moment.parseZone(event.start_at).format("YYYY-MM-DD");
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.day === day) {
      lastGroup.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }
  }

  return groups;
}

function EventList({ events }: { events: Event[]; }) {
  return (
    <div className="flex flex-col gap-3">
      {groupEventsByDay(events).map(group => (
        <div key={group.day} className="flex flex-col gap-1">
          <div className="text-muted-foreground text-end">
            {moment(group.day, "YYYY-MM-DD").format("ddd D MMM")}
          </div>
          {group.events.map((event: Event) => (
            <EventCompact key={event.id} event={event} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EventsOverview({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") === "next-weekend" ? "next-weekend" : "this-weekend";

  const selectTab = (value: string) => {
    setSearchParams(params => {
      params.set("tab", value);
      return params;
    }, { replace: true, preventScrollReset: true });
  };

  const regionEvents = events.filter((event: Event) => selectedRegions.includes(event.region));

  const thisWeek = regionEvents.filter((event: Event) => isThisWeek(event));
  const nextWeek = regionEvents.filter((event: Event) => isNextWeek(event));

  return (
    <Tabs value={tab} onValueChange={selectTab} className="gap-0">
      <TabsList variant="line">
        <TabsTrigger value="this-weekend">This weekend</TabsTrigger>
        <TabsTrigger value="next-weekend">Next weekend</TabsTrigger>
      </TabsList>

      <TabsContent value="this-weekend">
        {thisWeek.length > 0 ? (
          <EventList events={thisWeek} />
        ) : (
          <div className="text-center">... nothing yet 🤞 stay tuned ...</div>
        )}
      </TabsContent>

      <TabsContent value="next-weekend">
        {nextWeek.length > 0 ? (
          <EventList events={nextWeek} />
        ) : (
          <div className="text-center">... nothing yet 🤞 stay tuned ...</div>
        )}
      </TabsContent>
    </Tabs>
  );
}