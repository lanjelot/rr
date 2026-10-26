import { useLocation, useNavigate, useSearchParams } from "react-router";

// Ties a dialog's open state to a search param, the same trick useFlyerOverlay()
// uses: opening pushes a history entry, so the browser Back button (and Android's
// back gesture) closes the dialog instead of leaving the page.
//
// This is the param-level form, for a single dialog that can show any of several
// items (the overview's Previous/Next): `value` is whatever the param holds, and
// `replace` swaps it in place so stepping through items doesn't pile up history
// — Back still closes the dialog in one go.
export function useUrlDialogParam(param: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(param);

  // Merge rather than replace the search string, so a page that keeps its own
  // state in the URL (the map's bbox and date range) doesn't lose it.
  const withParam = (value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(param);
    else next.set(param, value);
    return next;
  };

  const show = (id: number | string) => {
    navigate({ search: `?${withParam(String(id))}` }, { preventScrollReset: true });
  };

  const replace = (id: number | string) => {
    setSearchParams(withParam(String(id)), { replace: true, preventScrollReset: true });
  };

  // Popping the entry we pushed keeps Back and the dialog's own close button in
  // sync. location.key is 'default' when this is the first entry of the session
  // — a shared link landing straight on an open dialog — so there's nothing to
  // pop and we drop the param instead of navigating off the site.
  const close = () => {
    if (location.key === "default") {
      setSearchParams(withParam(null), { replace: true, preventScrollReset: true });
    } else {
      navigate(-1);
    }
  };

  return { value, show, replace, close };
}

// A dialog that opens when `param` equals `id`.
export function useUrlDialog(param: string, id: number | string) {
  const { value, show, close } = useUrlDialogParam(param);

  const open = value === String(id);
  const setOpen = (value: boolean) => (value ? show(id) : close());

  return { open, setOpen };
}
