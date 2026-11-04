import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("./layouts/main-and-footer.tsx", [
        index("routes/home.tsx"),
        route("explore/", "routes/explore.tsx"),
        route("saved/", "routes/saved.tsx"),
        // route("archive/", "routes/archive.tsx"),
        route("events/:eventId", "routes/event.tsx"),
        route("about/", "routes/about.tsx"),
        // route("editor/", "routes/editor.tsx"),
        // Old pages, redirected so shared links still land.
        route("events/", "routes/events.tsx"),
        route("calendar/", "routes/calendar.tsx"),
        route("map/", "routes/map.tsx"),
    ]),
] satisfies RouteConfig;
