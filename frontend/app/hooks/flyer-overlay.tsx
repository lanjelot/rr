import { useNavigate, useSearchParams } from "react-router";
import { XCircleIcon } from "@heroicons/react/24/outline";

export function useFlyerOverlay(eventId: number) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const open = searchParams.get("flyer") === String(eventId);
  const setOpen = (value: boolean) => {
    if (value) navigate({ search: `?flyer=${eventId}` });
    else navigate(-1);
  };
  const closeOverlay = () => navigate(-1);

  return { open, setOpen, closeOverlay };
}

export function FlyerOverlay({
  src,
  open,
  onClose,
}: {
  src: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute right-4 top-4 text-white">
        <XCircleIcon className="size-6" />
      </button>
    </div>
  );
}
