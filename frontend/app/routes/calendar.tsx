import { useState } from "react";
import type { Route } from "./+types/calendar";
import { useTheme } from "~/contexts/theme-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calendar | The Rave Roster" },
    { name: "description", content: "Welcome to The Rave Roster!" },
  ];
}

export default function Calendar() {
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  return (
    <div className="p-3">
      {loading && (
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <iframe
        src="https://calendar.google.com/calendar/embed?src=theraveroster%40gmail.com&ctz=Australia%2FSydney&wkst=2"
        className="w-full"
        style={{
          height: 'calc(100vh - 150px)',
          ...(isDark && { filter: 'invert(1) hue-rotate(180deg)' }),
        }}
        onLoad={() => setLoading(false)}
      ></iframe>
    </div>
  );
}

