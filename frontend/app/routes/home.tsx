import { EventList } from "~/components/event-list";
import type { Route } from "./+types/home";
import { fetchEvents } from "~/lib/data";
import { EventsOverview } from "~/components/events-overview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Rave Roster" },
    { name: "description", content: "An event discovery platform for Australian rave/electronic music events" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const events = await fetchEvents();
  return { events };
}

export default function Home({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  return <EventsOverview events={events} />;
}

