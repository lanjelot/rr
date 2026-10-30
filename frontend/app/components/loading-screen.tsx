export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center"
    >
      {/* delayed fade-in so fast loads don't flash a spinner */}
      <div className="flex flex-col items-center gap-3 animate-in fade-in fill-mode-both duration-300 delay-300">
        <div className="size-10 rounded-full border-4 border-muted border-t-primary animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="text-sm text-muted-foreground">Loading events…</p>
      </div>
    </div>
  );
}
