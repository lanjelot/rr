import {
  AdjustmentsHorizontalIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { useGenres } from "~/contexts/genre-context";
import { useRegion } from "~/contexts/region-context";
import { useTheme } from "~/contexts/theme-context";
import { REGIONS, regionLabel } from "~/lib/data";
import { GENRES } from "~/lib/genres";
import { cn } from "~/lib/utils";

// "Electronic" is the catch-all genre, and every event is already shown when
// no genre is picked.
const SELECTABLE_GENRES = GENRES.filter(({ genre }) => genre !== "Electronic");

function toggled(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

// A ticked row, so it reads as a multiple choice.
function CheckboxButton({
  checked,
  onClick,
  className,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      className={cn("justify-start", className)}
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-[4px] border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        {checked && <CheckIcon className="size-3 stroke-3" />}
      </span>
      {children}
    </Button>
  );
}

function ListFooter({
  canClear,
  onClear,
  onClose,
}: {
  canClear: boolean;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex justify-between gap-1">
      <Button variant="ghost" disabled={!canClear} className="text-muted-foreground" onClick={onClear}>
        <ArrowUturnLeftIcon className="size-4" />
        Clear
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function GenreList({ onClose }: { onClose: () => void }) {
  const { selectedGenres, setSelectedGenres } = useGenres();
  // Subgenre lists are long, so each parent's list only shows once asked for.
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      {SELECTABLE_GENRES.map(({ genre, subgenres }) => {
        const isExpanded = expanded === genre;
        return (
          <div key={genre}>
            <div className="flex gap-1">
              <CheckboxButton
                className="flex-1"
                checked={selectedGenres.includes(genre)}
                onClick={() => setSelectedGenres(toggled(selectedGenres, genre))}
              >
                {genre}
              </CheckboxButton>
              <Button
                variant="ghost"
                size="icon"
                className={cn("text-muted-foreground", isExpanded && "text-foreground")}
                aria-label={`${isExpanded ? "Hide" : "Show"} ${genre} subgenres`}
                aria-expanded={isExpanded}
                onClick={() => setExpanded(isExpanded ? null : genre)}
              >
                <InformationCircleIcon className="size-4" />
              </Button>
            </div>
            {isExpanded && (
              <p className="px-2.5 pt-1 pb-2 text-xs text-muted-foreground">
                {subgenres.join(", ")}
              </p>
            )}
          </div>
        );
      })}
      <Separator orientation="horizontal" />
      <ListFooter
        canClear={selectedGenres.length > 0}
        onClear={() => setSelectedGenres([])}
        onClose={onClose}
      />
    </div>
  );
}

function RegionList({ onClose }: { onClose: () => void }) {
  const { selectedRegions, setSelectedRegions } = useRegion();

  return (
    <div className="flex flex-col gap-1">
      {REGIONS.map((region) => (
        <CheckboxButton
          key={region}
          checked={selectedRegions.includes(region)}
          onClick={() => setSelectedRegions((prev) => toggled(prev, region))}
        >
          {regionLabel(region)}
        </CheckboxButton>
      ))}
      <Separator orientation="horizontal" />
      <ListFooter
        canClear={selectedRegions.length > 0}
        onClear={() => setSelectedRegions([])}
        onClose={onClose}
      />
    </div>
  );
}

// Shows the theme a click switches to.
function ThemeButton() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      className="justify-start"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
    >
      Theme
      {isDark ? <SunIcon className="ms-auto size-4" /> : <MoonIcon className="ms-auto size-4" />}
    </Button>
  );
}

type View = "main" | "regions" | "genres";

// What a row's list has selected: a couple of names, or how many.
function summary(selected: string[], label: (item: string) => string = (i) => i): string {
  return selected.length <= 2 ? selected.map(label).join(", ") : `${selected.length} selected`;
}

// A row of the main view that opens one of the lists.
function MenuRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <Button variant="ghost" className="justify-start" onClick={onClick}>
      {label}
      <span className="ms-auto truncate text-muted-foreground font-normal">{value}</span>
      <ChevronRightIcon className="size-4 text-muted-foreground" />
    </Button>
  );
}

function SubView({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col gap-1 animate-in fade-in-0 slide-in-from-right-8 duration-200">
      <Button variant="ghost" className="justify-start font-semibold" onClick={onBack}>
        <ChevronLeftIcon className="size-4" />
        {title}
      </Button>
      <Separator orientation="horizontal" />
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}

// The region and genre filters, plus the theme. The filters open as their own
// view, sliding in over the main one. Pages that don't filter events only get
// the theme.
export function SettingsMenu({ showFilters }: { showFilters: boolean }) {
  const { selectedGenres } = useGenres();
  const { selectedRegions } = useRegion();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  // The main view only slides back in when coming back from a list, not on open.
  const [returned, setReturned] = useState(false);
  const genreFilterOn = showFilters && selectedGenres.length > 0;

  function back() {
    setView("main");
    setReturned(true);
  }

  function openChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setView("main");
      setReturned(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button
          className="relative p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label={showFilters ? "Filters and theme" : "Theme"}
        >
          <AdjustmentsHorizontalIcon className="size-5" />
          {genreFilterOn && (
            <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1 gap-1 max-h-[80vh] overflow-hidden">
        {view === "regions" ? (
          <SubView title="Regions" onBack={back}>
            <RegionList onClose={() => openChange(false)} />
          </SubView>
        ) : view === "genres" ? (
          <SubView title="Genres" onBack={back}>
            <GenreList onClose={() => openChange(false)} />
          </SubView>
        ) : (
          <div
            className={cn(
              "flex flex-col gap-1",
              returned && "animate-in fade-in-0 slide-in-from-left-8 duration-200"
            )}
          >
            {showFilters && (
              <>
                <MenuRow
                  label="Regions"
                  value={
                    selectedRegions.length === 0 ? "None"
                      : selectedRegions.length === REGIONS.length ? "All"
                      : summary(selectedRegions, regionLabel)
                  }
                  onClick={() => setView("regions")}
                />
                <MenuRow
                  label="Genres"
                  value={selectedGenres.length === 0 ? "All" : summary(selectedGenres)}
                  onClick={() => setView("genres")}
                />
                <Separator orientation="horizontal" />
              </>
            )}
            <ThemeButton />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
