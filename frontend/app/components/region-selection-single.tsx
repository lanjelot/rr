import { MapPinIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { REGIONS, regionLabel } from "~/lib/data";

export function RegionSelection({
  selectedRegion,
  onSelectedRegion
}: {
  selectedRegion: string;
  onSelectedRegion: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Select region"
        >
          <MapPinIcon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1">
        {REGIONS.map((region) => {
          const isSelected = region === selectedRegion;
          return (
            <Button
              key={region}
              variant={isSelected ? "secondary" : "ghost"}
              className="w-full justify-start"
              aria-selected={isSelected}
              onClick={() => {
                onSelectedRegion(region);
                setOpen(false);
              }}
            >
              {regionLabel(region)}
              {isSelected && <CheckIcon className="ms-auto size-4" />}
            </Button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
