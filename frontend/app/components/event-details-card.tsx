import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import type { Event } from "~/lib/data";
import { cn, eventDate, eventTime, isHappeningNow } from "~/lib/utils";
import { useUrlDialog, useUrlDialogParam } from "~/hooks/url-dialog";
import { DateBadge, RegionBadge } from "./event-badges";
import { TicketLink } from "./ticket-link";
import { Dialog, DialogClose, DialogContent, DialogPortal, DialogTitle, DialogTrigger } from "./ui/dialog";
import { BookmarkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ShareIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { useBookmarks } from "~/contexts/bookmarks-context";

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
      <EventDialogContent>
        <EventDetailsCard event={event} />
      </EventDialogContent>
    </Dialog>
  );
}

// One dialog for a whole list of events, with Previous/Next, the arrow keys and
// swipes to flick through them. It opens whenever the "event" param names one of
// `events`, so the list items only need to call useUrlDialogParam().show(id);
// stepping replaces the param, so Back still closes the dialog in one go.
//
// Being a single dialog rather than one per item is what lets it step without
// the close/open animation of swapping between two dialogs.
//
// dialogId is the param value for each entry, defaulting to the event id; the
// calendar keys on the day too, as a multi-day event is an entry per day it spans.
export function EventListDialog({
  events,
  dialogId = (event) => event.id,
}: {
  events: Event[];
  dialogId?: (event: Event, index: number) => number | string;
}) {
  const { value, replace, close } = useUrlDialogParam("event");

  const index = events.findIndex((event, i) => String(dialogId(event, i)) === value);
  const open = index !== -1;

  // Keep showing the last event while the dialog animates closed, instead of
  // unmounting its content the moment the param goes.
  const lastIndex = useRef(index);
  if (open) lastIndex.current = index;
  const shownIndex = open ? index : lastIndex.current;

  const event = events[shownIndex];
  const prev = events[shownIndex - 1];
  const next = events[shownIndex + 1];

  const step = (offset: -1 | 1) => {
    const target = shownIndex + offset;
    if (events[target]) replace(dialogId(events[target], target));
  };

  // Where a touch started, to tell a horizontal swipe from a scroll or a tap.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && close()}>
      {event && (
        <EventDialogContent
          // Narrower than the default on phones, to leave a thumb-sized strip
          // for the step buttons either side. A fixed height keeps the dialog
          // from jumping as you step; EventDetailsCard scrolls its details if
          // they don't fit.
          className="max-w-[calc(100%-6rem)] flex flex-col h-[min(40rem,calc(100dvh-4rem))]"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") step(-1);
            if (e.key === "ArrowRight") step(1);
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(e) => {
            if (!touchStart.current) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStart.current.x;
            const dy = touch.clientY - touchStart.current.y;
            touchStart.current = null;
            if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
            step(dx < 0 ? 1 : -1);
          }}
        >
          <EventDetailsCard event={event}>
            <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 text-xs text-white">
              {shownIndex + 1} / {events.length}
            </div>
          </EventDetailsCard>
        </EventDialogContent>
      )}
      {open && (
        <DialogPortal>
          <StepStrip side="left" target={prev} onClick={() => step(-1)} />
          <StepStrip side="right" target={next} onClick={() => step(1)} />
        </DialogPortal>
      )}
    </Dialog>
  );
}

// A full-height strip beside the dialog, so the whole strip is the button. On
// phones it fills the 3rem gap EventListDialog leaves either side; from sm up
// it's a fixed-width strip butting against the max-w-sm (24rem) dialog.
//
// It has to live outside DialogContent, whose translate makes it the containing
// block for anything `fixed` inside it. That puts it outside the dialog's
// dismissable layer, hence pointer-events-auto (Radix disables pointer events on
// the body while a modal is open) and the data-dialog-keep-open that
// EventDialogContent checks so a press here doesn't count as clicking away.
// It also means a separate portal from the overlay's, and portals don't reliably
// land in the same order on every open, so z-[60] keeps it above the overlay's
// z-50 rather than under its blur.
function StepStrip({
  side,
  target,
  onClick,
}: {
  side: "left" | "right";
  target: Event | undefined;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      type="button"
      data-dialog-keep-open
      aria-label={side === "left" ? "Previous" : "Next"}
      title={target?.name}
      disabled={!target}
      onClick={onClick}
      className={cn(
        "group fixed inset-y-0 z-[60] w-12 sm:w-20 flex items-center justify-center pointer-events-auto cursor-pointer disabled:invisible",
        side === "left" ? "left-0 sm:left-auto sm:right-[calc(50%+12rem)]" : "right-0 sm:right-auto sm:left-[calc(50%+12rem)]"
      )}
    >
      <span className="rounded-full bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md p-1.5 sm:p-2 transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="size-6 sm:size-7" />
      </span>
    </button>
  );
}

function EventDialogContent({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("p-0", className)}
      onPointerDownOutside={(event) => {
        const { button, target } = event.detail.originalEvent;
        // A mouse back/forward button (3/4) arrives as a pointerdown on the
        // overlay, which Radix reads as a backdrop dismiss — but the browser is
        // already doing its own history back for that same press, so setOpen's
        // navigate(-1) would pop a second entry and take us off the page.
        // Ignoring non-primary buttons keeps it to one pop; touch and pen both
        // report button 0, and Radix already handles right-click itself.
        if (button !== 0) event.preventDefault();
        // Controls that belong to the dialog but sit outside its frame.
        if (target instanceof Element && target.closest("[data-dialog-keep-open]")) event.preventDefault();
      }}
      {...props}
    />
  );
}

// The body of the event dialog opened from a calendar bar or a thumbnail card.
// Renders DialogTitle/DialogClose, so it has to live inside a <DialogContent>.
// `children` are overlaid on the flyer, for EventListDialog's counter.
export function EventDetailsCard({ event, children }: { event: Event; children?: ReactNode }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(event.id);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col gap-3">
      <div className="relative shrink-0">
        {/* Keyed so stepping to another event blanks the old flyer rather than
            leaving it up beside the new event's details until the new one loads. */}
        <img
          key={event.id}
          src={event.preview}
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
        {children}
      </div>

      <div className="min-h-0 overflow-y-auto flex flex-col gap-3 px-4 pb-12">
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

      {/* Pinned to the card's corner rather than following the details, so they
          stay put whether or not the details are long enough to scroll. */}
      <div className="absolute bottom-3 right-4 flex items-center gap-5 text-muted-foreground">
        <ShareEventButton event={event} />
        <button
          type="button"
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark event"}
          title={bookmarked ? "Remove bookmark" : "Bookmark event"}
          onClick={() => toggleBookmark(event.id)}
          className="hover:text-foreground cursor-pointer"
        >
          {bookmarked ? <BookmarkSolidIcon className="size-6" /> : <BookmarkIcon className="size-6" />}
        </button>
      </div>
    </div>
  );
}

// Shares the event's own page, which loads it by id, so the link works whatever
// regions the recipient has picked.
function ShareEventButton({ event }: { event: Event }) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (shareState === "idle") return;
    const timer = setTimeout(() => setShareState("idle"), 4000);
    return () => clearTimeout(timer);
  }, [shareState]);

  // Stepping to another event in EventListDialog shouldn't carry over the last one's state.
  useEffect(() => setShareState("idle"), [event.id]);

  async function share() {
    const url = `${window.location.origin}/events/${event.id}/`;

    // Phones get the native share sheet; everything else copies the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: `${event.name} | The Rave Roster`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
  }

  return (
    <>
      {shareState !== "idle" && (
        <span className="text-xs">{shareState === "copied" ? "Link copied" : "Couldn't copy link"}</span>
      )}
      <button
        type="button"
        aria-label="Share event"
        title="Share event"
        onClick={share}
        className="hover:text-foreground cursor-pointer"
      >
        {shareState === "copied" ? <CheckIcon className="size-6" /> : <ShareIcon className="size-6" />}
      </button>
    </>
  );
}
