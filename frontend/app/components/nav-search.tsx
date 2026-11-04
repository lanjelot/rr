import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

// A shortcut to Explore's search box, from the navbar or Ctrl/Cmd+K. Already on
// Explore, it keeps the current search and just focuses the box.
export function NavSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const onExplore = location.pathname.replace(/\/+$/, "") === "/explore";

  function openSearch() {
    navigate(
      { pathname: "/explore", search: onExplore ? location.search : "" },
      { state: { focusSearch: Date.now() }, replace: onExplore },
    );
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <button
      onClick={openSearch}
      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
      aria-label="Search events"
    >
      <MagnifyingGlassIcon className="size-5" />
    </button>
  );
}
