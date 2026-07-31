import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("./layouts/main-and-footer.tsx", [
        index("routes/home.tsx"),
        route("events/", "routes/events.tsx"),
        // route("archive/", "routes/archive.tsx"),
        route("events/:eventId", "routes/event.tsx"),
        route("calendar/", "routes/calendar.tsx"),
        route("about/", "routes/about.tsx"),
        // route("editor/", "routes/editor.tsx"),
    ]),
] satisfies RouteConfig;
