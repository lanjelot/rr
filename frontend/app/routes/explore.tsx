import type { ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/explore";
import { fetchEvents } from "~/lib/data";
import { Explore } from "~/components/explore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Explore | The Rave Roster" },
    { name: "description", content: "Search and filter upcoming events across Australia" },
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

export default function ExplorePage({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;
  return <Explore events={events} />;
}
