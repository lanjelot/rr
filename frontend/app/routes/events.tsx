import { EventList } from "~/components/event-list";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/events";
import { fetchEvents } from "~/lib/data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Events | The Rave Roster" },
    { name: "description", content: "Browse upcoming events across Australia" },
  ];
}

// Typing in the search box rewrites the URL on every keystroke; only refetch
// when actually navigating to the page.
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (currentUrl.pathname === nextUrl.pathname) return false;
  return defaultShouldRevalidate;
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

