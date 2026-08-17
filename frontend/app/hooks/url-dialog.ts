import { useLocation, useNavigate, useSearchParams } from "react-router";

// Ties a dialog's open state to a search param, the same trick useFlyerOverlay()
// uses: opening pushes a history entry, so the browser Back button (and Android's
// back gesture) closes the dialog instead of leaving the page.
export function useUrlDialog(param: string, id: number | string) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const open = searchParams.get(param) === String(id);

  // Merge rather than replace the search string, so a page that keeps its own
  // state in the URL (the map's bbox and date range) doesn't lose it.
  const withParam = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(param);
    else next.set(param, value);
    return next;
  };

  const setOpen = (value: boolean) => {
    if (value) {
      navigate({ search: `?${withParam(String(id))}` }, { preventScrollReset: true });
      return;
    }

    // Popping the entry we pushed keeps Back and the dialog's own close button in
    // sync. location.key is 'default' when this is the first entry of the session
    // — a shared link landing straight on an open dialog — so there's nothing to
    // pop and we drop the param instead of navigating off the site.
    if (location.key === "default") {
      setSearchParams(withParam(null), { replace: true, preventScrollReset: true });
    } else {
      navigate(-1);
    }
  };

  return { open, setOpen };
}
