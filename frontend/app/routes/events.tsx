import { EventList } from "~/components/event-list";
import type { Route } from "./+types/events";
import { DATA_URL } from "~/lib/data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Events | The Rave Roster" },
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

export default function Events({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;

  return <EventList events={events} />;
}

