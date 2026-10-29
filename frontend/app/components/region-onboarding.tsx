import { MapPinIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ZONES } from "~/lib/data";
import { cn } from "~/lib/utils";

type LonLat = [number, number];

// Simplified outlines, in [longitude, latitude], with the zone boundaries
// following state borders (QLD split at 21.5°S, North NSW = Northern Rivers).
const ZONE_SHAPES: Record<string, { outline?: LonLat[]; label: LonLat; labelText?: string }> = {
  WA: {
    outline: [
      [129, -31.7], [127, -32.3], [125, -32.8], [123.6, -33.9], [121.9, -33.9], [119.9, -34], [118, -35],
      [116.6, -35], [115, -34.3], [115.6, -33.4], [115.7, -32], [115, -29.5], [114.2, -28], [113.5, -26.5],
      [113.2, -25.5], [113.7, -24], [113.4, -22.6], [114.1, -21.8], [115.5, -21.3], [116.7, -20.6],
      [118.6, -20.3], [121, -19.5], [122.2, -18], [123.5, -17], [124.5, -16], [125.5, -14.5], [126.9, -13.9],
      [128.1, -14.9], [129, -14.9],
    ],
    label: [122, -25],
  },
  NT: {
    outline: [
      [129, -14.9], [130.1, -13.4], [130.8, -12.4], [131.3, -12], [132.6, -11.5], [132.9, -12.2], [134.2, -12],
      [135.6, -12], [136.6, -11.9], [136.9, -12.3], [136, -13.2], [135.9, -14], [135.4, -14.8], [136.3, -15.6],
      [137, -15.8], [138, -16.6], [138, -26], [129, -26],
    ],
    label: [133.5, -20],
  },
  FQLD: {
    outline: [
      [138, -16.6], [139.3, -17.4], [140.8, -17.5], [141.4, -16.7], [141.6, -15], [141.5, -13.5], [141.6, -12.5],
      [142, -11], [142.5, -10.7], [142.8, -11], [143.5, -12.8], [143.6, -14], [144.5, -14.2], [145.3, -15],
      [145.4, -16.4], [145.9, -17], [146.1, -18.3], [146.8, -19.2], [148, -19.9], [148.8, -20.4], [149.2, -21.1],
      [149.4, -21.5], [138, -21.5],
    ],
    label: [143, -19.3],
    labelText: "FQLD",
  },
  "QLD+NNSW": {
    outline: [
      [138, -21.5], [149.4, -21.5], [149.6, -22.3], [150.6, -22.5], [150.8, -23.5], [151.6, -24.1], [152.4, -24.9],
      [153.1, -25.8], [153.1, -27], [153.4, -27.6], [153.55, -28.17], [153.6, -28.6], [153.3, -29.6],
      [152.2, -29.6], [152.2, -28.5], [151.5, -28.9], [148.9, -29], [141, -29], [141, -26], [138, -26],
    ],
    label: [145.5, -24.8],
    labelText: "QLD + NNSW",
  },
  NSW: {
    outline: [
      [141, -29], [148.9, -29], [151.5, -28.9], [152.2, -28.5], [152.2, -29.6], [153.3, -29.6], [153.1, -30.3],
      [152.9, -31.5], [152.5, -32.4], [151.8, -32.9], [151.3, -33.6], [151.2, -34], [150.9, -34.6], [150.5, -35.4],
      [150.1, -36.3], [150, -37], [149.98, -37.5], [148.2, -36.8], [147, -36], [146.9, -36.1], [144.9, -36.1], [143.5, -35.3],
      [141, -34],
    ],
    label: [146, -32],
  },
  VIC: {
    outline: [
      [141, -34], [143.5, -35.3], [144.9, -36.1], [146.9, -36.1], [147, -36], [148.2, -36.8], [149.98, -37.5], [148.3, -37.8],
      [147, -38.4], [146.4, -39.1], [145.5, -38.6], [144.9, -37.9], [144.4, -38.3], [143.5, -38.8], [142.4, -38.4],
      [141.6, -38.3], [141, -38.05],
    ],
    label: [144.3, -37.3],
  },
  TAS: {
    outline: [
      [144.6, -40.7], [146, -41.1], [147, -40.9], [148.3, -40.9], [148.3, -42], [147.9, -43.2], [146.9, -43.6],
      [146, -43.5], [145.3, -42.2], [144.7, -41.4],
    ],
    label: [146.5, -42.2],
  },
  SA: {
    outline: [
      [129, -26], [141, -26], [141, -38.05], [140.4, -37.9], [139.7, -37.1], [139.3, -35.7], [138.5, -35.6],
      [138.5, -34.9], [138.1, -34.2], [137.6, -35.1], [136.9, -35.2], [137.5, -34], [137.8, -32.6], [136.6, -33.9],
      [135.9, -34.7], [135.2, -34.5], [134.2, -33], [133.5, -32.2], [132.2, -32], [131.1, -31.5], [129, -31.7],
    ],
    label: [134.5, -29.5],
  },
  // Too small to click at this scale, so drawn as a dot over Canberra.
  ACT: { label: [149.13, -35.3] },
};

const ACT_RADIUS = 7;

// Equirectangular projection, x squashed by cos(27°) so the continent isn't stretched.
function project([lon, lat]: LonLat): [number, number] {
  return [(lon - 112.5) * 8.9 + 5, (-10 - lat) * 10 + 5];
}

function toPath(outline: LonLat[]): string {
  return "M" + outline.map((point) => project(point).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";
}

export function RegionOnboarding({ onSubmit }: { onSubmit: (regions: string[]) => void }) {
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  function toggleZone(zone: string) {
    setSelectedZones((prev) => (prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]));
  }

  function submit() {
    onSubmit(ZONES.filter((zone) => selectedZones.includes(zone.id)).flatMap((zone) => zone.regions));
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen p-4 flex flex-col items-center justify-center gap-5">
      <div className="flex gap-3 items-center font-semibold">
        <img src="/raveroster/avatar.jpg" alt="" className="size-8 rounded-md" />
        The Rave Roster
      </div>

      <div className="text-center">
        <h1 className="text-xl font-semibold">Find events near you</h1>
        <p className="text-sm text-muted-foreground">
          Pick the regions where you're chasing vibes.
        </p>
      </div>

      <svg viewBox="0 0 390 350" className="w-full max-w-md select-none" role="group" aria-label="Map of zones">
        {ZONES.map((zone) => {
          const shape = ZONE_SHAPES[zone.id];
          const isSelected = selectedZones.includes(zone.id);
          const [labelX, labelY] = project(shape.label);
          const shapeProps = {
            role: "checkbox",
            "aria-checked": isSelected,
            "aria-label": zone.label,
            tabIndex: 0,
            className: cn(
              "cursor-pointer stroke-background stroke-[1.5] transition-colors outline-none focus-visible:stroke-ring",
              isSelected ? "fill-primary hover:fill-primary/85" : "fill-muted-foreground/25 hover:fill-muted-foreground/40"
            ),
            onClick: () => toggleZone(zone.id),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleZone(zone.id);
              }
            },
          };

          return (
            <g key={zone.id}>
              {shape.outline ? (
                <path d={toPath(shape.outline)} {...shapeProps} />
              ) : (
                <circle cx={labelX} cy={labelY} r={ACT_RADIUS} {...shapeProps} />
              )}
              <text
                x={shape.outline ? labelX : labelX + ACT_RADIUS + 12}
                y={labelY}
                textAnchor={shape.outline ? "middle" : "start"}
                dominantBaseline="central"
                className={cn(
                  "pointer-events-none text-[11px] font-semibold",
                  isSelected && shape.outline ? "fill-primary-foreground" : "fill-foreground"
                )}
              >
                {shape.labelText ?? zone.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* <div className="flex flex-wrap justify-center gap-1.5">
        {ZONES.map((zone) => {
          const isSelected = selectedZones.includes(zone.id);
          return (
            <Button
              key={zone.id}
              size="sm"
              variant={isSelected ? "default" : "outline"}
              aria-pressed={isSelected}
              onClick={() => toggleZone(zone.id)}
            >
              {zone.label}
            </Button>
          );
        })}
      </div> */}

      <Button className="w-full max-w-xs" disabled={selectedZones.length === 0} onClick={submit}>
        Submit
      </Button>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        You can change this later with the <MapPinIcon className="size-4" /> button.
      </p>
    </div>
  );
}
