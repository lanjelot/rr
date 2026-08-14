import type { Event } from "~/lib/data";
import { isHappeningNow, eventDate, eventTime } from "~/lib/utils";
import { renderTextWithLinksAndBreaks } from "./render-text-with-links";
import { useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useFlyerOverlay, FlyerOverlay } from "../hooks/flyer-overlay";
import { DateBadge, RegionBadge } from "./event-badges";
import { TicketLink } from "./ticket-link";
import { EventLocationMap } from "./event-location-map";


export function EventDetails({ event }: { event: Event; }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { open, setOpen, closeOverlay } = useFlyerOverlay(event.id);

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-24 cursor-pointer"
          onClick={() => {
            // location.key is 'default' if it's the very first page loaded in this session
            if (location.key !== 'default') {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <div className="relative">
          <img
            src={event.flyer}
            alt=""
            className="w-full object-cover h-96 rounded-xl"
            onClick={() => setOpen(true)}
          />
          <div className="absolute top-2 left-2">
            <DateBadge event={event} />
          </div>
          <div className="absolute top-2 right-2">
            <RegionBadge event={event} />
          </div>

          <div className="text-center font-medium m-3">{event.name}</div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <ul>
              {event.artists && (
                <li>🎧 {event.artists}</li>
              )}
              {event.djs && (
                <li>🎧 {event.djs}</li>
              )}
              {event.promoter && (
                <li>🌀 {event.promoter}</li>
              )}
            </ul>
            <ul>
              <li className="flex justify-between gap-1">
                <span>📅 {eventDate(event)}</span>
                {isHappeningNow(event) && (
                  <span className="bg-red-300 rounded-md px-3 text-black">Happening now</span>
                )}
              </li>
              <li>⏰ {eventTime(event)}</li>
              <li>📍 {event.location}</li>
              {event.venue && (
                <li>🏛️ {event.venue}</li>
              )}
            </ul>
            <ul>
              {event.genre && (
                <li>🎶 {event.genre}</li>
              )}
              {event.ticket && (
                <li>🎫 <TicketLink event={event} /></li>
              )}
            </ul>
            {/* {event.notes && (
              <div>✨ {renderTextWithLinksAndBreaks(event.notes)}</div>
            )} */}
            {typeof event.latitude === "number" && typeof event.longitude === "number" && (
              <EventLocationMap latitude={event.latitude} longitude={event.longitude} />
            )}
          </div>
        </div >
      </div>

      <FlyerOverlay src={event.flyer} open={open} onClose={closeOverlay} />
    </>
  );
}
