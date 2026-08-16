import { MapPinIcon } from "@heroicons/react/24/outline";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "~/components/ui/popover";
import { REGIONS, regionLabel } from "~/lib/data";
import { Separator } from "./ui/separator";

function triggerLabel(selectedRegions: string[]): string {
  if (selectedRegions.length === 0) return "Select states";
  if (selectedRegions.length === 1) return regionLabel(selectedRegions[0]);
  return `${selectedRegions.length} states selected`;
}

export function RegionSelection({
  selectedRegions,
  onSelectedRegions
}: {
  selectedRegions: string[];
  onSelectedRegions: React.Dispatch<React.SetStateAction<string[]>>;
}) {

  function toggleRegion(region: string) {
    onSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  }

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Select regions"
        >
          <MapPinIcon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1 gap-1">
        {REGIONS.map((region) => {
          const isSelected = selectedRegions.includes(region);
          return (
            <Button
              key={region}
              variant={isSelected ? "secondary" : "ghost"}
              className="w-full justify-start"
              aria-selected={isSelected}
              onClick={() => toggleRegion(region)}
            >
              {regionLabel(region)}
              {isSelected && <CheckIcon className="ms-auto size-4" />}
            </Button>
          );
        })}
        <Separator orientation="horizontal" />
        <div className="flex gap-1">
          <Button
            variant="ghost"
            disabled={selectedRegions.length === REGIONS.length}
            className="flex-auto justify-start text-muted-foreground flex gap-1 justify-between"
            onClick={() => onSelectedRegions(REGIONS)}
          >
            <span className="">All</span>
            <CheckIcon className="size-4"/>
          </Button>
          <Button
            variant="ghost"
            disabled={selectedRegions.length === 0}
            className="flex-auto justify-start text-muted-foreground flex gap-1 justify-between"
            onClick={() => onSelectedRegions([])}
          >
            <span className="">Clear</span>
            <RotateCcwIcon className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
