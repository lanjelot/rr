import { MagnifyingGlassIcon, MapPinIcon, MusicalNoteIcon, TicketIcon, UserIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { useRegion } from "~/contexts/region-context";
import { fetchEvents, type Event } from "~/lib/data";
import {
  buildSuggestionIndex,
  MIN_QUERY_LENGTH,
  suggest,
  type SearchField,
  type SearchParam,
} from "~/lib/search";
import { isFutureEvent } from "~/lib/utils";

const GROUPS: { field: SearchField; heading: string; icon: React.ReactNode }[] = [
  { field: "name", heading: "Events", icon: <TicketIcon /> },
  { field: "artist", heading: "Artists", icon: <UserIcon /> },
  { field: "place", heading: "Venues & locations", icon: <MapPinIcon /> },
  { field: "genre", heading: "Genres", icon: <MusicalNoteIcon /> },
];

// The search panel, shared by the navbar and the Upcoming page's "+" chip.
// `events` is what suggestions are drawn from (null while loading).
export function SearchDialog({
  open,
  onOpenChange,
  events,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Event[] | null;
  onSearch: (param: SearchParam, value: string) => void;
}) {
  const [query, setQuery] = useState("");

  const index = useMemo(() => buildSuggestionIndex(events ?? []), [events]);

  const showSuggestions = query.trim().length >= MIN_QUERY_LENGTH;

  function search(param: SearchParam, value: string) {
    onOpenChange(false);
    setQuery("");
    onSearch(param, value.trim());
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search events"
      description="Search by event name, artist, venue or genre"
      className="top-[10%] sm:top-1/4"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Events, artists, venues, genres..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          {!showSuggestions ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "Keep typing..."
                : "Find events by name, artist, venue or genre."}
            </div>
          ) : events === null ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading events...</div>
          ) : (
            // Each field is a single item: picking any suggestion in it searches
            // the typed text against that field, so the whole block highlights.
            <CommandGroup>
              <CommandItem value="q" onSelect={() => search("q", query)}>
                <MagnifyingGlassIcon />
                <span className="truncate">Search everything for “{query.trim()}”</span>
              </CommandItem>
              {GROUPS.map(({ field, heading, icon }) => {
                const matches = suggest(index[field], query);
                if (matches.length === 0) return null;
                return (
                  <CommandItem
                    key={field}
                    value={field}
                    onSelect={() => search(field, query)}
                    className="flex-col items-stretch gap-1 py-2 [&>svg:last-child]:hidden"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {icon}
                      {heading}
                    </div>
                    {matches.map((s) => (
                      <div key={s.value} className="truncate ps-6">{s.value}</div>
                    ))}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function NavSearch() {
  const { selectedRegions } = useRegion();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Event[] | null>(null);

  // Events are only fetched the first time the search is opened.
  useEffect(() => {
    if (open && events === null) fetchEvents().then(setEvents);
  }, [open, events]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Suggest only what the Upcoming page could show.
  const visibleEvents = useMemo(
    () => events && events.filter((event) => selectedRegions.includes(event.region) && isFutureEvent(event)),
    [events, selectedRegions]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Search events"
      >
        <MagnifyingGlassIcon className="size-5" />
      </button>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        events={visibleEvents}
        onSearch={(param, value) => navigate(`/events?${new URLSearchParams({ [param]: value })}`)}
      />
    </>
  );
}
