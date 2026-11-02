import { BookmarkIcon } from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { useBookmarks } from "~/contexts/bookmarks-context";
import { cn } from "~/lib/utils";

export function BookmarkButton({ eventId, className, iconClassName = "size-6" }: { eventId: number; className?: string; iconClassName?: string }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(eventId);

  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark event"}
      title={bookmarked ? "Remove bookmark" : "Bookmark event"}
      onClick={() => toggleBookmark(eventId)}
      className={cn("hover:text-foreground cursor-pointer", className)}
    >
      {bookmarked ? <BookmarkSolidIcon className={iconClassName} /> : <BookmarkIcon className={iconClassName} />}
    </button>
  );
}
