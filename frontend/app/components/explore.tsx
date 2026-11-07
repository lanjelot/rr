import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router";
import moment from "moment";
import {
  ChevronDownIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MapPinIcon,
  MusicalNoteIcon,
  Squares2X2Icon,
  TicketIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { REGIONS, inRegions, regionLabel, type Event } from "~/lib/data";
import { GENRES, matchesGenres } from "~/lib/genres";
import { cn, isFutureEvent, isMultiDay, raveWeekStart } from "~/lib/utils";
import {
  buildSuggestionIndex,
  isSearchParam,
  matchesSearch,
  MIN_QUERY_LENGTH,
  suggest,
  type SearchField,
  type SearchParam,
} from "~/lib/search";
import { useRegion } from "~/contexts/region-context";
import { useGenres } from "~/contexts/genre-context";
import { useUrlDialogParam } from "~/hooks/url-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { CheckboxButton, toggled } from "./settings-menu";
import { SearchChip } from "./search-chip";
import { EventThumbnailCard } from "./event-thumbnail-card";
import { EventLargeCard } from "./event-large-card";
import { EventListDialog } from "./event-details-card";
import { EventMap } from "./event-map";

const DAY_FMT = "YYYY-MM-DD";
// The hour a night's partying counts as over, as on Home.
const DAY_CUTOFF_HOUR = 10;

// "Electronic" is the catch-all genre, as in the settings menu.
const SELECTABLE_GENRES = GENRES.filter(({ genre }) => genre !== "Electronic");
const ALL_GENRES = SELECTABLE_GENRES.map(({ genre }) => genre);

const SUGGESTION_GROUPS: { field: SearchField; heading: string; icon: ReactNode }[] = [
  { field: "name", heading: "Events", icon: <TicketIcon /> },
  { field: "artist", heading: "Artists", icon: <UserIcon /> },
  { field: "place", heading: "Venues & locations", icon: <MapPinIcon /> },
  { field: "genre", heading: "Genres", icon: <MusicalNoteIcon /> },
];

type ViewMode = "grid" | "list" | "map";

function parseViewMode(value: string | null): ViewMode {
  return value === "list" || value === "map" ? value : "grid";
}

// Dates are picked by rave week (Tuesday to Monday), the way Home groups them.
type When = "this-week" | "next-week" | "later";

function parseWhen(value: string | null): When | null {
  return value === "this-week" || value === "next-week" || value === "later" ? value : null;
}

// By Monday the weekend's over, so "This week" is already the one starting
// tomorrow, as on Home.
function thisWeekStart() {
  return raveWeekStart(moment().add(1, "day"));
}

// A week is labelled by its Friday to Sunday, e.g. "14 - 16 Nov".
function weekendLabel(weekStart: moment.Moment) {
  const friday = weekStart.clone().add(3, "days");
  const sunday = weekStart.clone().add(5, "days");
  return `${friday.format(friday.isSame(sunday, "month") ? "D" : "D MMM")} - ${sunday.format("D MMM")}`;
}

function whenOptions(): { value: When | null; label: string; detail?: string }[] {
  const thisWeek = thisWeekStart();
  const nextWeek = thisWeek.clone().add(7, "days");
  return [
    { value: null, label: "Any date" },
    { value: "this-week", label: "This week", detail: weekendLabel(thisWeek) },
    { value: "next-week", label: "Next week", detail: weekendLabel(nextWeek) },
    { value: "later", label: "Later" },
  ];
}

// The first and last rave weeks an event runs in, in its own timezone. A
// festival's last day is the one it's still going in before the morning cutoff.
function eventWeeks(event: Event): [string, string] {
  const start = raveWeekStart(moment.parseZone(event.start_at));
  const finish = isMultiDay(event)
    ? raveWeekStart(moment.parseZone(event.finish_at).subtract(DAY_CUTOFF_HOUR, "hours").subtract(1, "minute"))
    : start;
  return [start.format(DAY_FMT), finish.format(DAY_FMT)];
}

// "This week" also covers anything already under way, so an event that started
// last week and is still going isn't lost between the options.
function matchesWhen(event: Event, when: When | null): boolean {
  if (!when) return true;
  const thisWeek = thisWeekStart();
  const nextWeek = thisWeek.clone().add(7, "days").format(DAY_FMT);
  const [first, last] = eventWeeks(event);
  if (when === "this-week") return first <= thisWeek.format(DAY_FMT);
  if (when === "next-week") return first <= nextWeek && last >= nextWeek;
  return last > nextWeek;
}

// ?genres= and ?regions= override the defaults picked in the settings menu, for
// this search only: "all", "none", or a comma list of the ticked ones. No
// genre ticked shows every genre, as in the settings menu; no region, none.
function parseList(value: string | null, valid: string[]): string[] | null {
  if (value === null) return null;
  if (value === "all") return valid;
  return value.split(",").filter((item) => valid.includes(item));
}

// The param for a ticked list, kept in `valid`'s order.
function listParam(ticked: string[], valid: string[]): string {
  if (ticked.length === 0) return "none";
  if (ticked.length === valid.length) return "all";
  return valid.filter((item) => ticked.includes(item)).join(",");
}

function regionsLabel(regions: string[]): string {
  if (regions.length === 0) return "No regions";
  if (regions.length === REGIONS.length) return "All regions";
  return regions.length <= 2 ? regions.map(regionLabel).join(", ") : `${regions.length} regions`;
}

function genresLabel(genres: string[], allGenres: boolean): string {
  if (allGenres) return "All genres";
  return genres.length <= 2 ? genres.join(", ") : `${genres.length} genres`;
}

// A row of a browse dropdown, the phone version of a BrowseChip.
function BrowseOption({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <Button variant="ghost" className="justify-start" onClick={onClick}>
      <span className="truncate">{label}</span>
      <span className="ms-auto font-normal text-muted-foreground">{count}</span>
    </Button>
  );
}

// A dropdown in the filter row. Highlighted while it's narrowing the results.
function FilterButton({
  label,
  narrowing,
  className,
  children,
}: {
  label: string;
  narrowing: boolean;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={narrowing ? "secondary" : "outline"} size="sm" className={cn("max-w-full", className)}>
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1 gap-1 max-h-[60vh] overflow-y-auto">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

// Resetting goes back to the settings menu's defaults; "All" widens past them.
function ListFooter({ onDefaults, onAll, onClose }: { onDefaults?: () => void; onAll?: () => void; onClose: () => void }) {
  return (
    <>
      <Separator orientation="horizontal" />
      <div className="flex gap-1">
        {onAll && <Button variant="ghost" size="sm" onClick={onAll}>All</Button>}
        {onDefaults && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onDefaults}>
            My defaults
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ms-auto" onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

// A row of the search dropdown. Rows without an icon are indented under the
// one above.
function SuggestionButton({ icon, label, count, onClick }: { icon?: ReactNode; label: ReactNode; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      // Keeps the box focused until the click lands.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent cursor-pointer [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground ${icon ? "" : "ps-8"}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span className="ms-auto text-muted-foreground">{count}</span>
    </button>
  );
}

// A one-tap shortcut with how many events it covers. The genre ones are
// toggles, so they take `pressed`.
function BrowseChip({ label, count, pressed, onClick }: { label: string; count: number; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors cursor-pointer",
        pressed
          ? "bg-foreground text-background"
          : "bg-zinc-100 hover:bg-zinc-300 dark:bg-white/5 dark:hover:bg-white/10",
      )}
    >
      <span className="truncate">{label}</span>
      <span className={pressed ? "opacity-70" : "text-muted-foreground"}>{count}</span>
    </button>
  );
}

// Phones get these as dropdowns in the filter row instead.
function BrowseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="hidden md:flex flex-col gap-2">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Explore({ events }: { events: Event[] }) {
  const { selectedRegions } = useRegion();
  const { selectedGenres } = useGenres();
  const [searchParams, setSearchParams] = useSearchParams();
  const { show } = useUrlDialogParam("event");
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // The text being typed. It narrows the results as you type, and becomes an
  // "Any" chip once searched for.
  const [query, setQuery] = useState("");
  const viewMode = parseViewMode(searchParams.get("view"));
  const when = parseWhen(searchParams.get("when"));
  // Searches picked from the suggestions (or shared links), e.g.
  // ?q=techno&artist=nina&place=brunswick. Every one has to match.
  const chips = [...searchParams].filter(([param]) => isSearchParam(param)) as [SearchParam, string][];
  const hasSearch = query.trim() !== "" || chips.length > 0;

  const genresParam = parseList(searchParams.get("genres"), ALL_GENRES);
  const regionsParam = parseList(searchParams.get("regions"), REGIONS);
  // Regions are searched whole: the dropdown only shows regions, so subregions
  // unticked in the settings menu would silently hide events in the rest.
  const regions = regionsParam ?? selectedRegions;
  // The ticked genres. A search looks across every genre unless some are
  // picked here, so a default genre doesn't hide the artist someone searched for.
  const genres = genresParam ?? (hasSearch ? [] : selectedGenres);
  // None or every genre ticked is no genre filter at all, which also keeps the
  // events only tagged with the catch-all "Electronic".
  const allGenres = genres.length === 0 || genres.length === ALL_GENRES.length;

  // The navbar's search button lands here asking for the box.
  useEffect(() => {
    if ((location.state as { focusSearch?: unknown } | null)?.focusSearch) inputRef.current?.focus();
  }, [location.state]);

  function update(edit: (params: URLSearchParams) => void, replace = false) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      edit(params);
      return params;
    }, { replace, preventScrollReset: true });
  }

  // Keyed on the filters themselves rather than searchParams, so opening an
  // event's dialog (?event=) doesn't hand the map a fresh list to redraw.
  const chipsKey = JSON.stringify(chips);
  const scope = useMemo(
    () =>
      events
        .filter((event) => isFutureEvent(event) && inRegions(event, regions))
        .sort((a, b) => moment(a.start_at).diff(moment(b.start_at))),
    [events, regions.join(",")]
  );
  // Everything the filters and chips let through, before the typed text.
  const filtered = useMemo(
    () =>
      scope.filter((event) =>
        (allGenres || matchesGenres(event, genres)) &&
        matchesWhen(event, when) &&
        chips.every(([param, value]) => matchesSearch(event, param, value))
      ),
    [scope, genres.join(","), when, chipsKey]
  );
  const results = useMemo(
    () => filtered.filter((event) => matchesSearch(event, "q", query)),
    [filtered, query]
  );

  // Suggestions and the browse panel draw on what the filters let through,
  // sorted by date, so ties go to whatever's on soonest.
  const index = useMemo(() => buildSuggestionIndex(filtered), [filtered]);
  const showSuggestions = focused && query.trim().length >= MIN_QUERY_LENGTH;

  function addChip(param: SearchParam, value: string) {
    update((params) => params.append(param, value));
    setQuery("");
    inputRef.current?.blur();
  }

  // Searching for the typed text as is keeps it as an "Any" chip.
  function searchQuery() {
    if (query.trim()) addChip("q", query.trim());
    else inputRef.current?.blur();
  }

  const setChips = (next: [SearchParam, string][], replace = false) =>
    update((params) => {
      for (const [param] of chips) params.delete(param);
      for (const [param, value] of next) params.append(param, value);
    }, replace);

  const genreCounts = useMemo(
    () =>
      SELECTABLE_GENRES
        .map(({ genre }) => ({ genre, count: scope.filter((event) => matchesGenres(event, [genre])).length }))
        .filter(({ genre, count }) => count > 0 || genres.includes(genre)),
    [scope, genres.join(",")]
  );
  const top = (field: SearchField, limit: number) =>
    [...index[field]].sort((a, b) => b.count - a.count).slice(0, limit);
  const toggleGenre = (genre: string) =>
    update((params) => params.set("genres", listParam(toggled(allGenres ? [] : genres, genre), ALL_GENRES)));
  // Somewhere to start before there's a search.
  const browsing = !hasSearch && viewMode !== "map" && scope.length > 0;
  const browseFields: { field: SearchField; label: string; title: string; limit: number }[] = [
    { field: "place", label: "Venues", title: "Venues & locations", limit: 8 },
    { field: "artist", label: "Artists", title: "Artists", limit: 10 },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={query}
          placeholder="Events, artists, venues, genres..."
          aria-label="Search events"
          className="h-10 ps-9 pe-9 [&::-webkit-search-cancel-button]:hidden"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchQuery();
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Clear search"
          >
            <XMarkIcon className="size-4" />
          </button>
        )}

        {/* Searches for the text as typed, anywhere or in one field, or for one of
            the values it matches. Narrowing to a field adds it as a chip. */}
        {showSuggestions && (
          <div className="absolute z-20 top-full mt-1 inset-x-0 max-h-[60vh] overflow-y-auto rounded-lg border bg-popover text-popover-foreground p-1 shadow-md">
            <SuggestionButton
              icon={<MagnifyingGlassIcon />}
              label={<>Search everything for “{query.trim()}”</>}
              count={results.length}
              onClick={searchQuery}
            />
            {SUGGESTION_GROUPS.map(({ field, heading, icon }) => {
              const count = filtered.filter((event) => matchesSearch(event, field, query)).length;
              if (count === 0) return null;
              const matches = suggest(index[field], query, 3);
              return (
                <div key={field} className="flex flex-col pt-1">
                  <SuggestionButton
                    icon={icon}
                    label={<>{heading} containing “{query.trim()}”</>}
                    count={count}
                    onClick={() => addChip(field, query.trim())}
                  />
                  {matches.map((s) => (
                    <SuggestionButton
                      key={s.value}
                      label={s.value}
                      count={s.count}
                      onClick={() => addChip(field, s.value)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The filters wrap beside the view toggle, which stays top right. */}
      <div className="flex items-start gap-2">
        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
          <FilterButton
            label={whenOptions().find((option) => option.value === when)!.label}
            narrowing={when !== null}
          >
            {(close) => (
              <div className="flex flex-col gap-1">
                {whenOptions().map((option) => (
                  <CheckboxButton
                    key={option.value ?? "any"}
                    checked={when === option.value}
                    onClick={() => {
                      update((params) => {
                        if (option.value) params.set("when", option.value);
                        else params.delete("when");
                      });
                      close();
                    }}
                  >
                    {option.label}
                    {option.detail && (
                      <span className="ms-auto font-normal text-muted-foreground">{option.detail}</span>
                    )}
                  </CheckboxButton>
                ))}
              </div>
            )}
          </FilterButton>

          <FilterButton label={regionsLabel(regions)} narrowing={regions.length < REGIONS.length}>
            {(close) => (
              <div className="flex flex-col gap-1">
                {REGIONS.map((region) => (
                  <CheckboxButton
                    key={region}
                    checked={regions.includes(region)}
                    onClick={() => update((params) => params.set("regions", listParam(toggled(regions, region), REGIONS)))}
                  >
                    {regionLabel(region)}
                  </CheckboxButton>
                ))}
                <ListFooter
                  onAll={() => update((params) => params.set("regions", "all"))}
                  onDefaults={regionsParam ? () => update((params) => params.delete("regions")) : undefined}
                  onClose={close}
                />
              </div>
            )}
          </FilterButton>

          {genreCounts.length > 0 && (
            <FilterButton label={genresLabel(genres, allGenres)} narrowing={!allGenres} className="md:hidden">
              {(close) => (
                <div className="flex flex-col gap-1">
                  {genreCounts.map(({ genre, count }) => (
                    <CheckboxButton
                      key={genre}
                      checked={!allGenres && genres.includes(genre)}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                      <span className="ms-auto font-normal text-muted-foreground">{count}</span>
                    </CheckboxButton>
                  ))}
                  <ListFooter
                    onDefaults={genresParam ? () => update((params) => params.delete("genres")) : undefined}
                    onClose={close}
                  />
                </div>
              )}
            </FilterButton>
          )}

          {browsing && browseFields.map(({ field, label, limit }) => (
            <FilterButton key={field} label={label} narrowing={false} className="md:hidden">
              {(close) => (
                <div className="flex flex-col gap-1">
                  {top(field, limit).map((s) => (
                    <BrowseOption
                      key={s.value}
                      label={s.value}
                      count={s.count}
                      onClick={() => {
                        addChip(field, s.value);
                        close();
                      }}
                    />
                  ))}
                </div>
              )}
            </FilterButton>
          ))}

        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          className="shrink-0"
          value={viewMode}
          onValueChange={(value) => value && update((params) => {
            if (value === "grid") params.delete("view");
            else params.set("view", value);
          }, true)}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid">
            <Squares2X2Icon />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" title="List">
            <ListBulletIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label="Map view" title="Map">
            <MapIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(([param, value], i) => (
            <SearchChip
              key={i}
              param={param}
              value={value}
              // Edits replace the history entry so Back doesn't step through keystrokes.
              onEdit={(text) => setChips(chips.map((chip, j) => (j === i ? [param, text] : chip)), true)}
              onRemove={() => setChips(chips.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      {/* The genre filter: none pressed shows every genre. */}
      {genreCounts.length > 0 && (
        <BrowseSection title="Genres">
          {genreCounts.map(({ genre, count }) => (
            <BrowseChip
              key={genre}
              label={genre}
              count={count}
              pressed={!allGenres && genres.includes(genre)}
              onClick={() => toggleGenre(genre)}
            />
          ))}
        </BrowseSection>
      )}

      {browsing && (
        <div className="hidden md:flex flex-col gap-4 py-2">
          {browseFields.map(({ field, title, limit }) => (
            <BrowseSection key={field} title={title}>
              {top(field, limit).map((s) => (
                <BrowseChip key={s.value} label={s.value} count={s.count} onClick={() => addChip(field, s.value)} />
              ))}
            </BrowseSection>
          ))}
        </div>
      )}

      {viewMode === "map" ? (
        <EventMap events={results} />
      ) : results.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No events match, try removing a filter.
        </div>
      ) : (
        <>
          <div className="font-medium">
            {results.length} {results.length === 1 ? "event" : "events"}
          </div>
          {viewMode === "list" ? (
            <div className="flex flex-col gap-6">
              {results.map((event) => (
                <EventLargeCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.map((event) => (
                <EventThumbnailCard key={event.id} event={event} onClick={() => show(event.id)} />
              ))}
            </div>
          )}
          {/* The map keeps its own dialog over the cards in view. */}
          <EventListDialog events={results} />
        </>
      )}
    </div>
  );
}
