import type { Event } from "~/lib/data";
import { EventCard } from "~/components/event-card";
import { ThumbnailCard } from "~/components/thumbnail-card";
import { isFutureEvent } from "~/lib/utils";
import { useState } from "react";
import { Input } from "./ui/input";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";
import { useRegion } from "~/contexts/region-context";

type ViewMode = "thumbnail" | "detailed" ;

export function EventList({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("thumbnail");

  const normalizedSearchText = searchText.trim().toLowerCase();

  const filteredEvents = events.filter((event: Event) =>
    selectedRegions.includes(event.region) &&
    isFutureEvent(event) &&
    (normalizedSearchText === "" ||
      event.name.toLowerCase().includes(normalizedSearchText) ||
      event.location.toLowerCase().includes(normalizedSearchText))
  );

  return (
    <div className="flex flex-col gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Events</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-3 justify-between items-center">
          <Input placeholder="Search..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />

          <ToggleGroup
            type="single"
            variant="outline"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <ToggleGroupItem value="thumbnail" aria-label="Thumbnail view">
              <Squares2X2Icon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="detailed" aria-label="Detailed view">
              <ListBulletIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No events to show, check your filters.
          </div>
        ) : viewMode === "detailed" ? (
          <div className="flex flex-col gap-6">
            {filteredEvents.map((event: Event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredEvents.map((event: Event) => (
              <ThumbnailCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}