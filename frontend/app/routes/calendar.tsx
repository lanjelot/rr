import { useState } from "react";
import type { Route } from "./+types/calendar";
import { fetchEvents } from "~/lib/data";
import { CalendarView } from "~/components/calendar-view";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { GoogleCalendarView } from "~/components/calendar-view-google";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calendar | The Rave Roster" },
    { name: "description", content: "Browse upcoming events by date" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const events = await fetchEvents();
  return { events };
}

type ViewMode = "tabs" | "google" ;

export default function Calendar({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  const [viewMode, setViewMode] = useState<ViewMode>("tabs");

  return (
    <div className="flex flex-col gap-3">

      <div className="flex justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Calendar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>


        <ToggleGroup
          type="single"
          variant="outline"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
        >
          <ToggleGroupItem value="tabs" aria-label="Tabs view">
            <CalendarIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="google" aria-label="Google view">
            <img src="/raveroster/google-calendar.svg" alt="Google" className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === "google" ? <GoogleCalendarView /> : <CalendarView events={events} />}
    </div>
  );
}
