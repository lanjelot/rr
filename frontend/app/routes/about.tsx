import type { Route } from "./+types/about";

export function meta({ }: Route.MetaArgs) {
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
          The Rave Roster is a curated directory of upcoming raves, doofs, and festivals across Australia.
        </p>

        <p>
          New events are constantly collected from places like:
        </p>

        <ul className="list-disc pl-6">
          <li>Ticketing sites (Humanitix, Moshtix, Triniq etc.)</li>
          <li>
            <a href="https://chat.whatsapp.com/IpCM00onsZrJMpNWCG6lYU"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600">
              The Rave Roster
            </a>{" "}WhatsApp
          </li>
          <li>
            Facebook groups doof/rave related.
          </li>
        </ul>
        <p>
          and organised using AI, making it easy to see what's coming up next.
        </p>

        <p>
          Got feedback or want to get in touch? Click {" "}
          <a href="https://chat.whatsapp.com/CCVdKsZa4yhJVqoN8ShKLS?s=cl&p=a&ilr=0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600">
            this
          </a> or scan below:
        </p>
        <img
          src="/public/raveroster/qr_code.png"
          alt="WhatsApp QR code"
          className="h-48 mx-auto"
        />
      </div>
    </div>
  );
}

