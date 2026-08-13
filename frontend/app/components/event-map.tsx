import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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

  return (
    <div className="flex flex-col gap-4">
      {maxDay > 0 && (
        <div className="flex flex-col gap-2">
          {/* <label className="text-sm font-medium">Date Range</label> */}
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
        {visible.map((event) => (
          <CircleMarker
            key={event.id}
            center={[event.latitude, event.longitude]}
            radius={6}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.8 }}
          >
            <Popup>
              <Link to={`/events/${event.id}`} className="flex flex-col gap-1 w-36" style={{ color: "inherit" }}>
                <img src={event.flyer} alt="" className="object-cover aspect-square w-full rounded" />
                <div className="font-semibold leading-tight">{event.name}</div>
                <div className="text-xs">{event.venue || event.location}</div>
                <div className="text-xs">{eventDate(event)}</div>
              </Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
