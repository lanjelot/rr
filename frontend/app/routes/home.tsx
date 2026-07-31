import { EventList } from "~/components/event-list";
import type { Route } from "./+types/home";
import { DATA_URL } from "~/lib/data";
import { EventsOverview } from "~/components/events-overview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Rave Roster" },
    { name: "description", content: "Welcome to The Rave Roster!" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const res = await fetch(DATA_URL);
  const events = await res.json();
  return { events };
}

export default function Home({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  return <EventsOverview events={events} />;
}

