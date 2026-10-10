import type { CSSProperties, ReactNode } from "react";

export type SignTone = "default" | "now" | "decision" | "done" | "wait";

export interface SignProps {
  /** Clock time such as "13:00", drawn as split-flap digits. Omit for rows without one. */
  time?: string;
  /** A step or gate number shown in the time column when there is no clock time. */
  gate?: string;
  title: ReactNode;
  detail?: ReactNode;
  /** Which agent checked this row. */
  by?: string;
  trailing?: ReactNode;
  /** Overrides the status word that the tone would give. */
  status?: string;
  tone?: SignTone;
  /** Position in the board, used to stagger the one-time flip on load. */
  index?: number;
}

const TONE_STATUS: Record<SignTone, string> = {
  default: "On time",
  now: "Now",
  decision: "Hold",
  done: "Done",
  wait: "Waiting",
};

function Flaps({ value, index = 0 }: { value: string; index?: number }) {
  return (
    <span className="flaps" aria-hidden="true">
      {value.split("").map((ch, i) =>
        ch === ":" ? (
          <span className="flaps__colon" key={i}>
            :
          </span>
        ) : (
          <span
            className="flap"
            key={i}
            style={{ "--flip": `${index * 90 + i * 40}ms` } as CSSProperties}
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * One row on the board: time in split-flap digits, the item, who checked it, its price and its
 * status. The status is a word, so colour is never the only signal.
 */
export function Sign({
  time,
  gate,
  title,
  detail,
  by,
  trailing,
  status,
  tone = "default",
  index = 0,
}: SignProps) {
  return (
    <div className={`row row--${tone}`}>
      <div className="row__time">
        {time ? (
          <>
            <span className="visually-hidden">{time}</span>
            <Flaps value={time} index={index} />
          </>
        ) : gate ? (
          <>
            <span className="visually-hidden">{gate}</span>
            <Flaps value={gate} index={index} />
          </>
        ) : null}
      </div>
      <div className="row__item">
        {tone === "decision" && <span className="visually-hidden">Needs your decision. </span>}
        <span className="row__title">{title}</span>
        {detail && <span className="row__detail">{detail}</span>}
      </div>
      <div className="row__by">{by}</div>
      <div className="row__cost">{trailing}</div>
      <div className="row__status">{status ?? TONE_STATUS[tone]}</div>
    </div>
  );
}

const DEFAULT_HEAD = ["Time", "Item", "Checked by", "Cost", "Status"];

export function SignStack({
  label,
  head,
  children,
}: {
  label: string;
  /** Show the column labels. Pass five labels to rename them: time, item, checked by, cost, status. */
  head?: boolean | string[];
  children: ReactNode;
}) {
  const labels = Array.isArray(head) ? head : DEFAULT_HEAD;
  return (
    <div className="board">
      {head && (
        <div className="row row--head" aria-hidden="true">
          <div className="row__time">{labels[0]}</div>
          <div className="row__item">{labels[1]}</div>
          <div className="row__by">{labels[2]}</div>
          <div className="row__cost">{labels[3]}</div>
          <div className="row__status">{labels[4]}</div>
        </div>
      )}
      <ul className="board__rows" aria-label={label}>
        {children}
      </ul>
    </div>
  );
}
