import { Outlet } from "react-router";
import type { Route } from "./+types/main-and-footer";
import { BeakerIcon, CalendarDaysIcon, HomeIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import { FooterNavLink } from "~/components/footer-nav-link";
import { ThemeToggle } from "~/components/theme-toggle";
import { ThemeProvider } from "~/contexts/theme-context";
import { RegionProvider, useRegion } from "~/contexts/region-context";
import { RegionSelection } from "~/components/region-selection-multiple";

function Navbar() {
  const { selectedRegions, setSelectedRegions } = useRegion();

  return (
    <div className="flex items-center gap-3 pb-3 mb-3 border-b dark:border-white/25">
      <Link to="/" className="font-semibold flex gap-3 items-center">
        <img
          src="/raveroster/avatar.jpg"
          alt=""
          className="size-8 rounded-md"
        />
        The Rave Roster
      </Link>
      <div className="ms-auto flex items-center gap-2">
        <RegionSelection selectedRegions={selectedRegions} onSelectedRegions={setSelectedRegions} />
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function Component(_: Route.ComponentProps) {

  return (
    <ThemeProvider>
      <RegionProvider>
        <div className="max-w-3xl mx-auto">
          <main className="pb-20 min-h-screen p-3">
            <Navbar />

            {/* <hr className="my-3 mx-auto w-full" /> */}

            <Outlet />
          </main>

          <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-zinc-100/80 border-t border-black/10 dark:bg-zinc-900/80 dark:border-t dark:border-white/10">
            <div className="max-w-3xl mx-auto flex gap-3 justify-evenly">
              <FooterNavLink
                to="/"
                label="Home"
                icon={<HomeIcon className="size-5" />}
              />
              <FooterNavLink
                to="/events"
                label="Events"
                icon={<BeakerIcon className="size-5" />}
              />
              <FooterNavLink
                to="/calendar"
                label="Calendar"
                icon={<CalendarDaysIcon className="size-5" />}
              />
              <FooterNavLink
                to="/about"
                label="About"
                icon={<InformationCircleIcon className="size-5" />}
              // icon={<EllipsisVerticalIcon className="size-5" />}
              />
            </div>
          </footer>
        </div>
      </RegionProvider>
    </ThemeProvider>
  );
}
