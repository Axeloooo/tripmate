import { formatUsd } from "../lib";

export function BudgetBar({ spentUsd, budgetUsd }: { spentUsd: number; budgetUsd: number }) {
  const over = spentUsd > budgetUsd;
  const pct = Math.min(100, Math.round((spentUsd / budgetUsd) * 100));
  return (
    <div className={`budget${over ? " budget--over" : ""}`}>
      <div className="budget__figures">
        <span>{formatUsd(spentUsd)} planned</span>
        <span>
          {over
            ? `${formatUsd(spentUsd - budgetUsd)} over`
            : `${formatUsd(budgetUsd - spentUsd)} left`}
        </span>
      </div>
      <div
        className="budget__track"
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={budgetUsd}
        aria-valuenow={Math.min(spentUsd, budgetUsd)}
        aria-valuetext={
          over
            ? `${formatUsd(spentUsd - budgetUsd)} over budget`
            : `${formatUsd(budgetUsd - spentUsd)} left`
        }
      >
        <div className="budget__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
