import { useState } from "react";
import type { Event } from "~/lib/data";
import { isHappeningNow, eventDate, eventTime } from "~/lib/utils";
import { renderTextWithLinks, renderTextWithLinksAndBreaks } from "./render-text-with-links";
import { useFlyerOverlay, FlyerOverlay } from "../hooks/flyer-overlay";
import { DateBadge, RegionBadge } from "./event-badges";
import { TicketLink } from "./ticket-link";

const NOTES_PREVIEW_LENGTH = 256;


export function EventCard({ event }: { event: Event; }) {
  const { open, setOpen } = useFlyerOverlay(event.id);
  const [notesExpanded, setNotesExpanded] = useState(false);

  return (
    <>
      <div className="w-full mx-auto flex flex-col gap-3 pt-0 border rounded-xl">
        <div className="w-full relative">
          <img
            src={event.flyer}
            alt=""
            className="object-cover h-96 w-full rounded-t-xl"
            onClick={() => setOpen(true)}
          />
          <div className="absolute top-2 left-2">
            <DateBadge event={event} />
          </div>
          <div className="absolute top-2 right-2">
            <RegionBadge event={event} />
          </div>
          {isHappeningNow(event) && (
          <div className="absolute bottom-2 right-2">
            <span className="bg-red-300 rounded-md px-3 text-black">Happening now</span>
          </div>
          )}
        </div>

        <div>
          <div className="text-center font-medium px-3">{event.name}</div>
          <div className="text-sm text-muted-foreground p-3">
            <div className="flex flex-col gap-6">
              <ul>
                {event.artists && event.djs ? (
                  <>
                  <li>🎧 Headline: {event.artists}</li>
                  <li>🎧 Supports: {event.djs}</li>
                  </>
                ) : (
                  <>
                  {event.artists && <li>🎧 {event.artists}</li>}
                  {event.djs && <li>🎧 {event.djs}</li>}
                  </>
                )}
                {event.promoter && <li>🌀 {event.promoter}</li>}
              </ul>
              <ul>
                <li>📅 {eventDate(event)}</li>
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
                <div>
                  ✨ {renderTextWithLinksAndBreaks(
                    notesExpanded || event.notes.length <= NOTES_PREVIEW_LENGTH
                      ? event.notes
                      : event.notes.slice(0, NOTES_PREVIEW_LENGTH) + " ..."
                  )}
                  {event.notes.length > NOTES_PREVIEW_LENGTH && (
                    <button
                      className="ml-1 text-blue-400 hover:text-blue-600 cursor-pointer"
                      onClick={() => setNotesExpanded(e => !e)}
                    >
                      {notesExpanded ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              )} */}
            </div>
          </div>
        </div>
      </div>

      <FlyerOverlay src={event.flyer} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
