import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  quiet?: boolean;
}

export function Button({ quiet, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={["button", quiet && "button--quiet", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: string }) {
  return (
    <a className="button" href={href}>
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}
