import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Popup, Marker, useMapEvents } from "react-leaflet";
import type { LatLngBounds, LatLngBoundsLiteral } from "leaflet";
import { Link, useSearchParams } from "react-router";
import { Share2Icon } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "~/lib/leaflet-icons";
import type { Event } from "~/lib/data";
import { eventDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { EventThumbnailCard } from "~/components/event-thumbnail-card";
import { EventDialog, EventListDialog } from "./event-details-card";
import { useUrlDialogParam } from "~/hooks/url-dialog";

const AUSTRALIA_CENTER: [number, number] = [-25.2744, 133.7751];
const AUSTRALIA_ZOOM = 4;

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

// The box around every event, or null when there's no area to fit (a single
// spot would zoom in to street level).
function eventsBbox(events: { latitude: number; longitude: number }[]): LatLngBoundsLiteral | null {
  if (events.length === 0) return null;
  const lats = events.map((event) => event.latitude);
  const lngs = events.map((event) => event.longitude);
  const south = Math.min(...lats), north = Math.max(...lats);
  const west = Math.min(...lngs), east = Math.max(...lngs);
  if (south === north && west === east) return null;
  return [
    [south, west],
    [north, east],
  ];
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

// The events are already filtered (Explore's date, genre and region filters), so
// the map only adds the viewport: markers for all of them, and cards for the
// ones on screen.
export function EventMap({ events }: { events: Event[] }) {
  const located = useMemo(
    () =>
      events.filter(
        (event): event is Event & { latitude: number; longitude: number } =>
          typeof event.latitude === "number" && typeof event.longitude === "number"
      ),
    [events]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const { show } = useUrlDialogParam("event");

  // Read once, on mount: after that the map owns its viewport, and the URL is
  // only rewritten when someone shares the view. Without a shared one, it opens
  // on the events, which are usually in a region or two.
  const [initialBounds] = useState(() => parseBbox(searchParams.get("bbox")) ?? eventsBbox(located));

  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  // getBounds() hands back a fresh object every time, so drop the ones that
  // describe the same viewport (a click, or the moveend that trails a zoom)
  // instead of re-rendering the list and markers for nothing.
  const changeBounds = useCallback((next: LatLngBounds) => {
    setBounds((previous) => (previous?.equals(next) ? previous : next));
  }, []);

  // The markers stay on every event; only the card list follows the viewport,
  // since offscreen markers are invisible anyway.
  const inView = useMemo(
    () =>
      bounds
        ? located.filter((event) => bounds.contains([event.latitude, event.longitude]))
        : located,
    [located, bounds]
  );

  const groups = useMemo(() => {
    const byLocation = new Map<string, typeof located>();
    for (const event of located) {
      const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`;
      const group = byLocation.get(key);
      if (group) group.push(event);
      else byLocation.set(key, [event]);
    }
    return [...byLocation.values()];
  }, [located]);

  // Held as elements rather than data: the markers only depend on the events,
  // so reusing them lets React skip the whole layer — popups and their dialogs
  // included — when only the viewport changed.
  const markers = useMemo(
    () =>
      groups.map((group) => (
        <Marker
          key={group[0].id}
          position={[group[0].latitude, group[0].longitude]}
        >
          <Popup>
            {group.length === 1 ? (
              <EventMarkerCard event={group[0]} />
            ) : (
              <div className="flex flex-col gap-2 w-40 max-h-80 overflow-y-auto">
                {group.map((event) => (
                  <EventMarkerCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </Popup>
        </Marker>
      )),
    [groups]
  );

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = setTimeout(() => setShareState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [shareState]);

  async function share() {
    // Keeps Explore's search and filters, so the link shows the same events.
    const params = new URLSearchParams(searchParams);
    params.delete("event");
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
      <div className="relative overflow-hidden">
        {/* Overlaid on the top-right corner: Leaflet's own controls own the top
            left, and z-[1000] clears its control panes. */}
        <div className="absolute top-2 right-2 z-[10]">
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
          bounds={initialBounds ?? undefined}
          boundsOptions={{ padding: [24, 24] }}
          center={initialBounds ? undefined : AUSTRALIA_CENTER}
          zoom={initialBounds ? undefined : AUSTRALIA_ZOOM}
          scrollWheelZoom
          className="h-[50vh] w-full rounded-lg z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onChange={changeBounds} />
          {markers}
        </MapContainer>
      </div>
      {inView.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No events in this area, try zooming out or widening your filters.
        </div>
      ) : (
        <>
          <div className="font-medium">{inView.length} events in view</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {inView.map((event) => (
              <EventThumbnailCard key={event.id} event={event} onClick={() => show(event.id)} />
            ))}
          </div>
        </>
      )}
      {/* Steps through the cards in view; the marker popups keep their own
          namespaced EventDialog, so their "map-" ids never open this one. */}
      <EventListDialog events={inView} />
    </div>
  );
}


function EventMarkerCard({ event }: { event: Event; }) {

  return (
    // Namespaced so the marker's dialog doesn't share a param value with the
    // ThumbnailCard for the same event in the list below: both triggers are
    // mounted at once, so a bare id opened two dialogs, and closing them
    // restored focus to the thumbnail — scrolling the page down to it.
    <EventDialog event={event} dialogId={`map-${event.id}`}>
      <button
        type="button"
        className="flex items-center text-start gap-2 w-40"
      >
        <img src={event.preview} alt="" className="object-cover size-10 rounded shrink-0" />
        <div className="flex flex-col leading-tight overflow-hidden">
          <div className="font-semibold truncate">{event.name}</div>
          <div className="text-xs truncate">{event.location}</div>
          <div className="text-xs truncate">{eventDate(event)}</div>
        </div>
      </button>
    </EventDialog>
  );
}


function EventMarkerLink({ event }: { event: Event; }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-2 w-40"
      style={{ color: "inherit" }}
    >
      <img src={event.preview} alt="" className="object-cover aspect-square w-10 h-10 rounded shrink-0" />
      <div className="flex flex-col leading-tight overflow-hidden">
        <div className="font-semibold truncate">{event.name}</div>
        <div className="text-xs">{event.location}</div>
        <div className="text-xs truncate">{eventDate(event)}</div>
      </div>
    </Link>
  );
}