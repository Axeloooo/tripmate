import type { ReactNode } from "react";
import { PRODUCT_NAME } from "../config";

function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect
        x="6"
        y="10"
        width="52"
        height="44"
        rx="3"
        fill="#161616"
        stroke="#2a2a2a"
        strokeWidth="2"
      />
      <rect x="12" y="18" width="40" height="10" fill="#ffb400" />
      <rect x="12" y="32" width="26" height="10" fill="#ffb400" opacity=".55" />
      <rect x="12" y="46" width="34" height="4" fill="#5be37d" />
    </svg>
  );
}

export function Shell({
  section,
  children,
}: {
  section: "new" | "trips" | null;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="#/">
          <Logo />
          <span className="brand__name">{PRODUCT_NAME}</span>
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#/" aria-current={section === "new" ? "page" : undefined}>
            New trip
          </a>
          <a href="#/trips" aria-current={section === "trips" ? "page" : undefined}>
            Your trips
          </a>
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
