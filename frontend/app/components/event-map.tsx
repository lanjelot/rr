import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from "react-leaflet";
import { Link } from "react-router";
import moment from "moment";
import "leaflet/dist/leaflet.css";
import type { Event } from "~/lib/data";
import { eventDate } from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";

const AUSTRALIA_CENTER: [number, number] = [-25.2744, 133.7751];
const AUSTRALIA_ZOOM = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(startAt: string, now: number) {
  return Math.floor((new Date(startAt).getTime() - now) / DAY_MS);
}

export function EventMap({ events }: { events: Event[] }) {
  const now = useMemo(() => Date.now(), []);

  const located = useMemo(
    () =>
      events.filter(
        (event): event is Event & { latitude: number; longitude: number } =>
          typeof event.latitude === "number" && typeof event.longitude === "number"
      ),
    [events]
  );

  const maxDay = useMemo(
    () => located.reduce((max, event) => Math.max(max, daysFromNow(event.start_at, now)), 0),
    [located, now]
  );

  const [dayRange, setDayRange] = useState<[number, number]>([0, maxDay]);

  const visible = located.filter((event) => {
    const day = daysFromNow(event.start_at, now);
    return day >= dayRange[0] && day <= dayRange[1];
  });

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

  return (
    <div className="flex flex-col gap-4">
      {maxDay > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="slider-date-range">Date Range</Label>
            <span className="text-sm text-muted-foreground">
              {moment(now + dayRange[0] * DAY_MS).format("D MMM YYYY")}
              {" – "}
              {moment(now + dayRange[1] * DAY_MS).format("D MMM YYYY")}
            </span>
          </div>
          <Slider
            id="slider-date-range"
            min={0}
            max={maxDay}
            step={1}
            value={dayRange}
            onValueChange={(value) => setDayRange(value as [number, number])}
          />
        </div>
      )}

      <MapContainer
        center={AUSTRALIA_CENTER}
        zoom={AUSTRALIA_ZOOM}
        scrollWheelZoom
        className="h-[70vh] w-full rounded-lg z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
  );
}
