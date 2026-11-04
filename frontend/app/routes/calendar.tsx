import { redirect } from "react-router";
import type { Route } from "./+types/calendar";

// The calendar is now a view on Home. Its shared ?day= and ?region= links carry over.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const params = new URL(request.url).searchParams;
  params.set("view", "calendar");
  throw redirect(`/?${params}`);
}

export default function Calendar() {
  return null;
}
