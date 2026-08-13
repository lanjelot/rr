import type { Route } from "./+types/map";
import { fetchEvents } from "~/lib/data";
import { EventMap } from "~/components/event-map";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Map | The Rave Roster" },
    { name: "description", content: "See upcoming event on a map of Australia" },
  ];
}

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  const events = await fetchEvents();
  return { events };
}

export default function MapPage({
  loaderData,
}: Route.ComponentProps) {
  const { events } = loaderData;

  return (
    <div className="flex flex-col gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Map</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EventMap events={events} />
    </div>
  );
}
