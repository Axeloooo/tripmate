import { formatUsd } from "../lib";

const CELLS = 24;

export function BudgetBar({ spentUsd, budgetUsd }: { spentUsd: number; budgetUsd: number }) {
  const over = spentUsd > budgetUsd;
  const lit =
    budgetUsd > 0 ? Math.min(CELLS, Math.max(0, Math.round((spentUsd / budgetUsd) * CELLS))) : 0;
  const left = over
    ? `${formatUsd(spentUsd - budgetUsd)} over`
    : `${formatUsd(budgetUsd - spentUsd)} left`;
  const valueText = over ? `${left} budget` : left;
  return (
    <div className={`budget${over ? " budget--over" : ""}`}>
      <div className="budget__figures">
        <span>{formatUsd(spentUsd)} planned</span>
        <span>{left}</span>
      </div>
      <div
        className="budget__track"
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={budgetUsd}
        aria-valuenow={Math.min(spentUsd, budgetUsd)}
        aria-valuetext={valueText}
      >
        {Array.from({ length: CELLS }, (_, i) => (
          <span key={i} className={i < lit ? "budget__cell budget__cell--lit" : "budget__cell"} />
        ))}
      </div>
    </div>
  );
}
