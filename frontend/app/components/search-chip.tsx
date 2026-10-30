import { FunnelIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { SEARCH_LABELS, type SearchParam } from "~/lib/search";

const CHIP_CLASS = "inline-flex h-8 max-w-full items-center gap-1 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium";

// One search filter, e.g. "Artist: nina". Clicking the text edits it in place;
// results follow as you type. Leaving it empty removes the filter.
export function SearchChip({
  param,
  value,
  onEdit,
  onRemove,
}: {
  param: SearchParam;
  value: string;
  onEdit: (value: string) => void;
  onRemove: () => void;
}) {
  // Non-null while editing.
  const [draft, setDraft] = useState<string | null>(null);

  function finishEditing() {
    if (draft !== null && draft.trim() === "") onRemove();
    setDraft(null);
  }

  return (
    <div className={`${CHIP_CLASS} ps-2.5 pe-1`}>
      <span className="text-muted-foreground shrink-0">{SEARCH_LABELS[param]}:</span>
      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          size={Math.max(draft.length, 1)}
          onChange={(e) => {
            setDraft(e.target.value);
            onEdit(e.target.value);
          }}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          className="min-w-0 bg-transparent outline-none border-b border-current"
          aria-label={`Edit ${SEARCH_LABELS[param]} search`}
        />
      ) : (
        <button
          onClick={() => setDraft(value)}
          className="truncate cursor-text"
          aria-label={`Edit ${SEARCH_LABELS[param]} search: ${value}`}
        >
          {value}
        </button>
      )}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
        aria-label={`Remove ${SEARCH_LABELS[param]} search`}
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
}

// Funnel when no filters are set yet, "+" once there are some to add to.
export function AddSearchChip({ hasFilters, onClick }: { hasFilters: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${CHIP_CLASS} px-2 cursor-pointer hover:bg-secondary/80`}
      aria-label="Add search filter"
    >
      {hasFilters ? <PlusIcon className="size-4" /> : <FunnelIcon className="size-4" />}
    </button>
  );
}
