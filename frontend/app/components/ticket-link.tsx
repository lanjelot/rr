import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { Event } from "~/lib/data";


export function TicketLink({ event }: { event: Event }) {
  return (
    <a
      href={event.ticket}
      className="text-blue-400 hover:text-blue-600 break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
      {event.ticket}
      <ArrowTopRightOnSquareIcon className="inline size-[1em] ms-0.5 align-[-0.125em]" />
    </a>
  )
}
