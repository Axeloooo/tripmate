import type { ButtonHTMLAttributes } from "react";
import { ArrowGlyph } from "./Pictogram";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  quiet?: boolean;
}

export function Button({ quiet, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={["button", quiet && "button--quiet", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span className="button__label">{children}</span>
      <span className="button__arrow">
        <ArrowGlyph />
      </span>
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: string }) {
  return (
    <a className="button" href={href}>
      <span className="button__label">{children}</span>
      <span className="button__arrow">
        <ArrowGlyph />
      </span>
    </a>
  );
}
