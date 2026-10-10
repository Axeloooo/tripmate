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
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  quiet,
}: {
  href: string;
  children: string;
  quiet?: boolean;
}) {
  return (
    <a className={quiet ? "button button--quiet" : "button"} href={href}>
      {children}
    </a>
  );
}
