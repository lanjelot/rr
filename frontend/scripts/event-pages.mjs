// Writes a copy of the app shell to <build>/events/<id>/index.html for every
// event in the static data snapshot, with the event's title and flyer as Open
// Graph tags. GitHub Pages serves those files as-is, so a shared event link
// gets a proper preview in WhatsApp and the like (crawlers don't run the app),
// then the app boots on the event page as usual.
//
//   node scripts/event-pages.mjs build/client

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const buildDir = process.argv[2] ?? "build/client";

const shell = readFileSync(join(buildDir, "index.html"), "utf8");
const events = JSON.parse(readFileSync(join(buildDir, "data/events.json"), "utf8"));
const origin = `https://${readFileSync(join(buildDir, "CNAME"), "utf8").trim()}`;

// Same as previewPath in app/lib/data.ts: /data/flyers/abc.png → /data/previews/abc.jpg
const previewPath = (flyer) =>
  flyer.replace("/flyers/", "/previews/").replace(/\.\w+$/, ".jpg");

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// start_at carries the venue's UTC offset; format its local part as-is, so the
// date reads in the event's own timezone, e.g. "Wed 14 Oct, 8:00 pm".
function formatStart(startAt) {
  return new Date(`${startAt.slice(0, 19)}Z`).toLocaleString("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

for (const event of events) {
  const url = `${origin}/events/${event.id}/`;
  const title = `${event.name} | The Rave Roster`;
  const description = [
    formatStart(event.start_at),
    [event.venue, event.location].filter(Boolean).join(", "),
    event.artists || event.djs,
  ].filter(Boolean).join(" · ");

  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="The Rave Roster"/>`,
    `<meta property="og:url" content="${escape(url)}"/>`,
    `<meta property="og:title" content="${escape(event.name)}"/>`,
    `<meta property="og:description" content="${escape(description)}"/>`,
    `<meta property="og:image" content="${escape(origin + previewPath(event.flyer))}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
  ].join("");

  const dir = join(buildDir, "events", String(event.id));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell.replace("</head>", `${tags}</head>`));
}

console.log(`Wrote ${events.length} event pages to ${join(buildDir, "events")}`);
