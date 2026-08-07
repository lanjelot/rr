import { redirect } from "react-router";
import { EventList } from "~/components/event-list";
import type { Route } from "./+types/event";
import { fetchEvent } from "~/lib/data";
import { EventDetails } from "~/components/event-details";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Event Details | The Rave Roster" },
    { name: "description", content: "Details for this event" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const event = await fetchEvent(params.eventId);
  if (!event) throw redirect("/events");
  return { event };
}

export default function Event({
  loaderData,
}: Route.ComponentProps) {
  const { event } = loaderData;
  return <EventDetails event={event} />;
}

