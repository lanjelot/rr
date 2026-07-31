import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "~/contexts/theme-context";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? <MoonIcon className="size-5" /> : <SunIcon className="size-5" />}
    </button>
  );
}
