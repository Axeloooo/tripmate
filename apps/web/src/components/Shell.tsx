import type { ReactNode } from "react";
import { PRODUCT_NAME } from "../config";

function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="14" width="52" height="36" rx="4" fill="#0A1E38" />
      <rect x="6" y="14" width="8" height="36" fill="#F7C948" />
      <path
        d="M24 32h22M38 24l8 8-8 8"
        stroke="#fff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="square"
      />
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
    <>
      <header className="shell__header">
        <a className="brand" href="#/">
          <Logo />
          {PRODUCT_NAME}
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
    </>
  );
}
