import type { ReactNode } from "react";
import { ArrowGlyph, Pictogram, type PictogramName } from "./Pictogram";

export type SignTone = "default" | "now" | "decision" | "done" | "wait";

export interface SignProps {
  /** Shown first, in large figures. Omit for signs that have no clock time. */
  time?: string;
  /** Gate-style label shown in the time column when there is no clock time. */
  gate?: string;
  icon?: PictogramName;
  title: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  tone?: SignTone;
  href?: string;
  id?: string;
}

const TONE_LABEL: Partial<Record<SignTone, string>> = {
  now: "Now. ",
  decision: "Needs your decision. ",
  done: "Done. ",
};

/**
 * One mounted wayfinding plate: time, pictogram tile, text, price, and an arrow.
 * The tone is also spoken and drawn as a shape, so colour is never the only signal.
 */
export function Sign({
  time,
  gate,
  icon,
  title,
  detail,
  trailing,
  tone = "default",
  href,
  id,
}: SignProps) {
  const className = ["sign", `sign--${tone}`, !time && !gate && "sign--no-time"]
    .filter(Boolean)
    .join(" ");
  const tile = tone === "decision" ? "decision" : icon;
  const arrow =
    tone === "now" ? (
      <ArrowGlyph direction="up" />
    ) : tone === "default" && href ? (
      <ArrowGlyph />
    ) : null;
  const body = (
    <>
      {time && (
        <span className="sign__time">
          {time}
          {tone === "done" && (
            <svg className="sign__check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" />
            </svg>
          )}
        </span>
      )}
      {!time && gate && <span className="sign__gate">{gate}</span>}
      {tile && (
        <span className="sign__tile">
          <Pictogram name={tile} />
        </span>
      )}
      <span className="sign__text">
        <span className="visually-hidden">{TONE_LABEL[tone]}</span>
        <span className="sign__title">{title}</span>
        {detail && <span className="sign__detail">{detail}</span>}
      </span>
      {trailing && <span className="sign__trailing">{trailing}</span>}
      <span className="sign__arrow">{arrow}</span>
    </>
  );
  return href ? (
    <a className={className} href={href} id={id}>
      {body}
    </a>
  ) : (
    <div className={className} id={id}>
      {body}
    </div>
  );
}

export function SignStack({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className="sign-stack" aria-label={label}>
      {children}
    </ul>
  );
}
