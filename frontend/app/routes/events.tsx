import { EventList } from "~/components/event-list";
import type { Route } from "./+types/events";
import { fetchEvents } from "~/lib/data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Events | The Rave Roster" },
    { name: "description", content: "Browse upcoming raves, doofs, and festivals across Australia" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const events = await fetchEvents();
  return { events };
}

export default function Events({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;

  return <EventList events={events} />;
}

