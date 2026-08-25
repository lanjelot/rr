import type { ReactNode } from "react";
import type { Event } from "~/lib/data";
import { eventDate, eventTime, isHappeningNow } from "~/lib/utils";
import { useUrlDialog } from "~/hooks/url-dialog";
import { DateBadge, RegionBadge } from "./event-badges";
import { TicketLink } from "./ticket-link";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { XCircleIcon } from "@heroicons/react/24/outline";

// Wraps `children` as the trigger for this event's details dialog. Open state
// lives in the URL, so Back closes the dialog rather than leaving the page.
//
// dialogId is the param value that opens this trigger, and must be unique among
// the triggers mounted at once: every dialog matching the param opens its own
// content, so a multi-day event's calendar bars would otherwise stack an overlay
// and a title per day it spans. Default to the event id where there can only be
// one trigger per event.
export function EventDialog({
  event,
  dialogId = event.id,
  children,
}: {
  event: Event;
  dialogId?: number | string;
  children: ReactNode;
}) {
  const { open, setOpen } = useUrlDialog("event", dialogId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="p-0"
        // A mouse back/forward button (3/4) arrives as a pointerdown on the
        // overlay, which Radix reads as a backdrop dismiss — but the browser is
        // already doing its own history back for that same press, so setOpen's
        // navigate(-1) would pop a second entry and take us off the page.
        // Ignoring non-primary buttons keeps it to one pop; touch and pen both
        // report button 0, and Radix already handles right-click itself.
        onPointerDownOutside={(event) => {
          if (event.detail.originalEvent.button !== 0) event.preventDefault();
        }}
      >
        <EventDetailsCard event={event} />
      </DialogContent>
    </Dialog>
  );
}

// The body of the event dialog opened from a calendar bar or a thumbnail card.
// Renders DialogTitle/DialogClose, so it has to live inside a <DialogContent>.
export function EventDetailsCard({ event }: { event: Event }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <img
          src={event.flyer}
          alt=""
          className="w-full object-cover h-80 rounded-t-xl"
        />
        <div className="absolute top-2 left-2">
          <DateBadge event={event} />
        </div>
        <div className="absolute top-2 right-2">
          <RegionBadge event={event} />
        </div>
        <DialogClose className="absolute bottom-2 right-2 text-white">
          <XCircleIcon className="size-6" />
        </DialogClose>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <DialogTitle className="text-center">{event.name}</DialogTitle>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <ul>
            {event.artists && <li>🎧 {event.artists}</li>}
            {event.djs && <li>🎧 {event.djs}</li>}
            {event.promoter && <li>🌀 {event.promoter}</li>}
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
            {event.venue && <li>🏛️ {event.venue}</li>}
          </ul>
          <ul>
            {event.genre && <li>🎶 {event.genre}</li>}
            {event.ticket && (
              <li>🎫 <TicketLink event={event} /></li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
