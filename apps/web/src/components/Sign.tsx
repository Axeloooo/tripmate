import type { ReactNode } from "react";

export type SignTone = "default" | "now" | "decision" | "done" | "wait";

export interface SignProps {
  /** Shown first, in large tabular figures. Omit for signs that have no clock time. */
  time?: string;
  arrow?: string;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  tone?: SignTone;
  href?: string;
}

const TONE_LABEL: Partial<Record<SignTone, string>> = {
  now: "Now. ",
  decision: "Needs your decision. ",
  done: "Done. ",
};

/** One wayfinding sign. The tone is also spoken, so colour is never the only signal. */
export function Sign({
  time,
  arrow = "→",
  title,
  detail,
  trailing,
  tone = "default",
  href,
}: SignProps) {
  const className = ["sign", tone !== "default" && `sign--${tone}`, !time && "sign--no-time"]
    .filter(Boolean)
    .join(" ");
  const body = (
    <>
      {time && <span className="sign__time">{time}</span>}
      <span className="sign__arrow" aria-hidden="true">
        {tone === "decision" ? "?" : arrow}
      </span>
      <span>
        <span className="visually-hidden">{TONE_LABEL[tone]}</span>
        <span className="sign__title">{title}</span>
        {detail && <span className="sign__detail">{detail}</span>}
      </span>
      {trailing && <span className="sign__trailing">{trailing}</span>}
    </>
  );
  return href ? (
    <a className={className} href={href}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function SignStack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className="sign-stack" aria-label={label}>
      {children}
    </ul>
  );
}
