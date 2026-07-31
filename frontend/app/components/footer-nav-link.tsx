import type { ReactNode } from "react";
import { NavLink } from "react-router";

type FooterNavLinkProps = {
  to: string;
  label: string;
  icon: ReactNode;
};

export function FooterNavLink({ to, label, icon }: FooterNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex flex-col gap-1 items-center p-1",
          isActive ? "font-semibold" : ""
        ].join(" ")
      }
    >
      {icon}
      <span className="text-xs">{label}</span>
    </NavLink>
  );
}