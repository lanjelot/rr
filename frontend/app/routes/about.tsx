import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About | The Rave Roster" },
    { name: "description", content: "About The Rave Roster" },
  ];
}

export default function About() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-semibold text-lg">About</h1>

      <div className="flex flex-col gap-4 text-muted-foreground leading-relaxed">
        <p>
          The Rave Roster is a curated directory of upcoming raves,
          doofs, and festivals across Australia, designed to make
          discovering and tracking events simple and efficient.
        </p>

        <p>
          Events are announced in{" "}
          <a
            href="https://chat.whatsapp.com/IpCM00onsZrJMpNWCG6lYU"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600"
          >
            The Rave Roster
          </a>{" "}WhatsApp, but chat groups aren't ideal
          for finding them later. Posts get buried and tracking
          down event details can be a hassle.
        </p>

        <p>
          Events are pulled directly from WhatsApp and organised here,
          making it easy to see what's coming up next.
        </p>
      </div>
    </div>
  );
}

