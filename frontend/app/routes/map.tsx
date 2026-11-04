import { redirect } from "react-router";
import type { Route } from "./+types/map";

// The map is now a view on Explore. A shared viewport (?bbox=) carries over; the
// old date range doesn't, as Explore filters dates by week instead.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = new URL(request.url).searchParams;
  params.delete("from");
  params.delete("to");
  params.set("view", "map");
  throw redirect(`/explore?${params}`);
}

export default function MapPage() {
  return null;
}
