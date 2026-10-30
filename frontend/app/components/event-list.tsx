import type { Event } from "~/lib/data";
import { EventCard } from "~/components/event-card";
import { ThumbnailCard } from "~/components/thumbnail-card";
import { isFutureEvent } from "~/lib/utils";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Squares2X2Icon, ListBulletIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import { Toggle } from "./ui/toggle";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";
import { useRegion } from "~/contexts/region-context";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { EventListDialog } from "./event-details-card";
import { isSearchParam, matchesSearch, type SearchParam } from "~/lib/search";
import { AddSearchChip, SearchChip } from "./search-chip";
import { SearchDialog } from "./nav-search";

type ViewMode = "thumbnail" | "detailed" ;

export function EventList({ events }: { events: Event[]; }) {
  const { selectedRegions } = useRegion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("thumbnail");
  const { value: openEventId, show } = useUrlDialogParam("event");
  const { isBookmarked } = useBookmarks();
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Set by the navbar search and refined with the "+" chip, e.g.
  // ?artist=nina&genre=techno. Every filter has to match.
  const filters = [...searchParams].filter(([param]) => isSearchParam(param)) as [SearchParam, string][];
  const [refining, setRefining] = useState(false);

  const filteredEvents = events.filter((event: Event) =>
    selectedRegions.includes(event.region) &&
    isFutureEvent(event) &&
    // Keep the open event while its dialog is up, so un-bookmarking it there
    // doesn't pull it out from under the dialog.
    (!bookmarkedOnly || isBookmarked(event.id) || String(event.id) === openEventId) &&
    filters.every(([param, value]) => matchesSearch(event, param, value))
  );

  function setFilters(next: [SearchParam, string][], replace = false) {
    setSearchParams((prev) => {
      const params = new URLSearchParams();
      for (const [key, value] of prev) if (!isSearchParam(key)) params.append(key, value);
      for (const [param, value] of next) params.append(param, value);
      return params;
    }, { replace, preventScrollReset: true });
  }

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
        <div className="flex flex-row gap-3 justify-between items-start">
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
            {filters.map(([param, value], i) => (
              <SearchChip
                key={i}
                param={param}
                value={value}
                // Edits replace the history entry so Back doesn't step through keystrokes.
                onEdit={(text) => setFilters(filters.map((f, j) => (j === i ? [param, text] : f)), true)}
                onRemove={() => setFilters(filters.filter((_, j) => j !== i))}
              />
            ))}
            <AddSearchChip hasFilters={filters.length > 0} onClick={() => setRefining(true)} />
          </div>

          <div className="flex items-center gap-2">
            <Toggle
              variant="outline"
              pressed={bookmarkedOnly}
              onPressedChange={setBookmarkedOnly}
              aria-label="Bookmarked only"
              title="Bookmarked only"
            >
              {bookmarkedOnly ? <BookmarkSolidIcon className="size-4" /> : <BookmarkIcon className="size-4" />}
            </Toggle>
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
              <ThumbnailCard key={event.id} event={event} onClick={() => show(event.id)} />
            ))}
          </div>
        )}
        <EventListDialog events={filteredEvents} />
        <SearchDialog
          open={refining}
          onOpenChange={setRefining}
          events={filteredEvents}
          onSearch={(param, value) => setFilters([...filters, [param, value]])}
        />
      </div>
    </div>
  );
}