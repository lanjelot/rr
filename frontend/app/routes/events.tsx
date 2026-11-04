import { redirect } from "react-router";
import type { Route } from "./+types/events";

// The Events page became Explore, which reads the same search params.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  throw redirect(`/explore${new URL(request.url).search}`);
}

export default function Events() {
  return null;
}
