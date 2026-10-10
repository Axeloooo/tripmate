import { formatUsd } from "../lib";

export function BudgetBar({ spentUsd, budgetUsd }: { spentUsd: number; budgetUsd: number }) {
  const over = spentUsd > budgetUsd;
  const fill =
    budgetUsd > 0 && spentUsd > 0
      ? (Math.min(spentUsd, budgetUsd) / Math.max(spentUsd, budgetUsd)) * 100
      : 0;
  const overPct = over ? 100 - fill : 0;
  const valueText = over
    ? `${formatUsd(spentUsd - budgetUsd)} over budget`
    : `${formatUsd(budgetUsd - spentUsd)} left`;
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
        aria-valuetext={valueText}
      >
        <div className="budget__fill" style={{ width: `${fill}%` }} />
        {over && <div className="budget__over" style={{ width: `${overPct}%` }} />}
      </div>
      <p className="budget__note">of {formatUsd(budgetUsd)}</p>
    </div>
  );
}
