import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Popup, Marker, useMapEvents } from "react-leaflet";
import type { LatLngBounds, LatLngBoundsLiteral } from "leaflet";
import { Link, useSearchParams } from "react-router";
import { Share2Icon } from "lucide-react";
import moment from "moment";
import "leaflet/dist/leaflet.css";
import "~/lib/leaflet-icons";
import type { Event } from "~/lib/data";
import { eventDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { ThumbnailCard } from "~/components/thumbnail-card";

const AUSTRALIA_CENTER: [number, number] = [-25.2744, 133.7751];
const AUSTRALIA_ZOOM = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

// Days since the epoch for a moment's wall-clock date, so week arithmetic is
// immune to DST shifts.
function dayIndex(value: moment.Moment) {
  return Math.floor(Date.UTC(value.year(), value.month(), value.date()) / DAY_MS);
}

// start_at carries the event's region offset, so parseZone keeps the event's own
// date — the one eventDate() displays.
function eventDayIndex(startAt: string) {
  return dayIndex(moment.parseZone(startAt));
}

// A shared link carries the viewport as "south,west,north,east".
function parseBbox(value: string | null): LatLngBoundsLiteral | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return null;
  return [
    [south, west],
    [north, east],
  ];
}

// Shared links carry plain dates; the slider works in day offsets from `base`.
function parseDayParam(value: string | null, base: number) {
  if (!value) return null;
  const parsed = moment(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? dayIndex(parsed) - base : null;
}

// Snap to the Mon–Sun boundaries the slider steps on, then keep it in range.
function clampWeek(day: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(day / 7) * 7, min), max);
}

// Reports the map's viewport to the parent whenever panning or zooming settles,
// so the card list below can be narrowed to what's on screen.
function BoundsWatcher({ onChange }: { onChange: (bounds: LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  });

  useEffect(() => {
    onChange(map.getBounds());
  }, [map, onChange]);

  return null;
}

export function EventMap({ events }: { events: Event[] }) {
  // Anchor the slider on the Monday of the current week so every step lands on a
  // Mon–Sun week boundary.
  const monday = useMemo(() => moment().startOf("isoWeek"), []);
  const base = useMemo(() => dayIndex(monday), [monday]);

  const located = useMemo(
    () =>
      events.filter(
        (event): event is Event & { latitude: number; longitude: number } =>
          typeof event.latitude === "number" && typeof event.longitude === "number"
      ),
    [events]
  );

  // Number of days from `base` to the end of the last week containing an event,
  // always a multiple of 7 so the slider ends on a Sunday.
  const maxDay = useMemo(() => {
    const lastDay = located.reduce(
      (max, event) => Math.max(max, eventDayIndex(event.start_at) - base),
      0
    );
    return (Math.floor(lastDay / 7) + 1) * 7;
  }, [located, base]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Both read once, on mount: after that the map and slider own their state, and
  // the URL is only rewritten when someone shares the view.
  const [sharedBbox] = useState(() => parseBbox(searchParams.get("bbox")));
  const [dayRange, setDayRange] = useState<[number, number]>(() => {
    const from = parseDayParam(searchParams.get("from"), base);
    const to = parseDayParam(searchParams.get("to"), base);
    if (from === null && to === null) return [0, maxDay];
    const start = clampWeek(from ?? 0, 0, maxDay - 7);
    return [start, clampWeek(to === null ? maxDay : to + 1, start + 7, maxDay)];
  });

  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  const visible = useMemo(
    () =>
      located.filter((event) => {
        const day = eventDayIndex(event.start_at) - base;
        return day >= dayRange[0] && day < dayRange[1];
      }),
    [located, base, dayRange]
  );

  // The markers stay on every event in the date range; only the card list
  // follows the viewport, since offscreen markers are invisible anyway.
  const inView = useMemo(
    () =>
      bounds
        ? visible.filter((event) => bounds.contains([event.latitude, event.longitude]))
        : visible,
    [visible, bounds]
  );

  const groups = useMemo(() => {
    const byLocation = new Map<string, typeof visible>();
    for (const event of visible) {
      const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
      const group = byLocation.get(key);
      if (group) group.push(event);
      else byLocation.set(key, [event]);
    }
    return [...byLocation.values()];
  }, [visible]);

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = setTimeout(() => setShareState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [shareState]);

  async function share() {
    const params = new URLSearchParams();
    if (bounds) {
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      params.set(
        "bbox",
        [southWest.lat, southWest.lng, northEast.lat, northEast.lng]
          .map((degrees) => degrees.toFixed(4))
          .join(",")
      );
    }
    params.set("from", monday.clone().add(dayRange[0], "days").format("YYYY-MM-DD"));
    params.set("to", monday.clone().add(dayRange[1] - 1, "days").format("YYYY-MM-DD"));

    // Put the params in the address bar too, so the link is still recoverable if
    // the clipboard is unavailable (older browsers, or a non-HTTPS origin).
    setSearchParams(params, { replace: true, preventScrollReset: true });

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}?${params}`
      );
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {maxDay > 7 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="slider-date-range">Date Range</Label>
            <span className="text-sm text-muted-foreground">
              {monday.clone().add(dayRange[0], "days").format("ddd D MMM YYYY")}
              {" – "}
              {monday.clone().add(dayRange[1] - 1, "days").format("ddd D MMM YYYY")}
            </span>
          </div>
          <Slider
            id="slider-date-range"
            min={0}
            max={maxDay}
            step={7}
            minStepsBetweenThumbs={1}
            value={dayRange}
            onValueChange={(value) => setDayRange(value as [number, number])}
          />
        </div>
      )}

      <div className="relative overflow-hidden">
        {/* Overlaid on the top-right corner: Leaflet's own controls own the top
            left, and z-[1000] clears its control panes. */}
        <div className="absolute top-2 right-2 z-[1000]">
          <Button variant="secondary" size="sm" onClick={share} className="">
            <Share2Icon />
            {shareState === "idle" ? (
              <span>Share this view</span>
            ) :
              (
                <span className="">
                  {shareState === "copied"
                    ? "Link copied"
                    : "Couldn't copy to clipboard, share link in address bar"}
                </span>
              )}
          </Button>
        </div>

        <MapContainer
          bounds={sharedBbox ?? undefined}
          center={sharedBbox ? undefined : AUSTRALIA_CENTER}
          zoom={sharedBbox ? undefined : AUSTRALIA_ZOOM}
          scrollWheelZoom
          className="h-[50vh] w-full rounded-lg z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onChange={setBounds} />
          {groups.map((group) => (
            <Marker
              key={group[0].id}
              position={[group[0].latitude, group[0].longitude]}
            >
              <Popup>
                {group.length === 1 ? (
                  <Link
                    to={`/events/${group[0].id}`}
                    className="flex items-center gap-2 w-40"
                    style={{ color: "inherit" }}
                  >
                    <img src={group[0].flyer} alt="" className="object-cover aspect-square w-10 h-10 rounded shrink-0" />
                    <div className="flex flex-col leading-tight overflow-hidden">
                      <div className="font-semibold truncate">{group[0].name}</div>
                      <div className="text-xs">{group[0].venue || group[0].location}</div>
                      <div className="text-xs truncate">{eventDate(group[0])}</div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2 w-40 max-h-80 overflow-y-auto">
                    {group.map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="flex items-center gap-2"
                        style={{ color: "inherit" }}
                      >
                        <img src={event.flyer} alt="" className="object-cover aspect-square w-10 h-10 rounded shrink-0" />
                        <div className="flex flex-col leading-tight overflow-hidden">
                          <div className="font-semibold truncate">{event.name}</div>
                          <div className="text-xs">{group[0].venue || group[0].location}</div>
                          <div className="text-xs truncate">{eventDate(event)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {inView.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No events in this area, try zooming out or widening the date range.
        </div>
      ) : (
        <>
          <div className="font-medium">{inView.length} events in view</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {inView.map((event) => (
              <ThumbnailCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
