import { redirect } from "react-router";
import { EventList } from "~/components/event-list";
import type { Route } from "./+types/event";
import { DATA_URL, type Event } from "~/lib/data";
import { EventDetails } from "~/components/event-details";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Event Details | The Rave Roster" },
    { name: "description", content: "Welcome to The Rave Roster!" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const res = await fetch(DATA_URL);
  const events: Event[] = await res.json();
  const event = events.find((e) => String(e.id) === params.eventId);
  if (!event) throw redirect("/events");
  return { event };
}

export default function Event({
  loaderData,
}: Route.ComponentProps) {
  const { event } = loaderData;
  return <EventDetails event={event} />;
}

