import { useState, type FormEvent } from "react";
import type { TripApi } from "../api/client";
import { Button } from "../components/Button";
import { Sign } from "../components/Sign";
import { TextField } from "../components/TextField";
import { PRODUCT_TAGLINE } from "../config";
import { formatUsd, parseInterests } from "../lib";
import { navigate } from "../router";

interface Errors {
  destination?: string;
  days?: string;
  budget?: string;
  interests?: string;
  submit?: string;
}

export function NewTrip({ api }: { api: TripApi }) {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("3");
  const [budget, setBudget] = useState("900");
  const [interests, setInterests] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const dayCount = Number(days);
    const budgetUsd = Number(budget);
    if (destination.trim().length < 2)
      next.destination = "Enter a city or region, at least 2 characters.";
    if (destination.trim().length > 200)
      next.destination = "Keep the destination under 200 characters.";
    if (parseInterests(interests).some((i) => i.length > 50))
      next.interests = "Keep each interest under 50 characters.";
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 14)
      next.days = "Enter 1 to 14 days.";
    if (!Number.isInteger(budgetUsd) || budgetUsd < 100 || budgetUsd > 100_000)
      next.budget = "Enter a budget from $100 to $100,000.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>('form [aria-invalid="true"]')?.focus(),
      );
      return;
    }

    setBusy(true);
    try {
      const trip = await api.createTrip({
        destination: destination.trim(),
        days: dayCount,
        budgetUsd,
        interests: parseInterests(interests),
      });
      navigate(`/trips/${trip.id}/progress`);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "The trip could not be created. Try again.",
      });
      setBusy(false);
    }
  }

  const previewDays = Number(days);
  const previewBudget = Number(budget);
  const previewDetail =
    Number.isInteger(previewDays) && previewDays > 0 && previewBudget > 0
      ? `${previewDays} ${previewDays === 1 ? "day" : "days"} · ${formatUsd(previewBudget)}`
      : "Add days and a budget";

  return (
    <div className="split split--form">
      <div className="split__main stack">
        <header className="page__head">
          <h1>Where to?</h1>
        </header>
        <p className="page__lede">{PRODUCT_TAGLINE}</p>
        <form className="form plate" onSubmit={onSubmit} noValidate>
          <TextField
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            error={errors.destination}
            autoComplete="off"
            placeholder="Barcelona"
          />
          <div className="form__row">
            <TextField
              label="Days"
              type="number"
              inputMode="numeric"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              error={errors.days}
            />
            <TextField
              label="Budget in USD"
              type="number"
              inputMode="numeric"
              min={100}
              step={50}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              error={errors.budget}
            />
          </div>
          <TextField
            label="Interests"
            hint="Separate with commas. Up to 10. Optional."
            error={errors.interests}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="food, architecture"
          />
          {errors.submit && (
            <p className="status status--error" role="alert">
              {errors.submit}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending the crew" : "Plan my trip"}
          </Button>
        </form>
      </div>
      <aside className="split__aside" aria-label="Preview">
        <p className="aside__title">Your first row</p>
        <div className="board board--preview">
          <ul className="board__rows" aria-label="First row">
            <li>
              <Sign
                gate={String(previewDays > 0 && previewDays < 100 ? previewDays : 0).padStart(
                  2,
                  "0",
                )}
                tone="wait"
                status="Planning"
                title={destination.trim() || "Your destination"}
                detail={previewDetail}
              />
            </li>
          </ul>
        </div>
        <p className="aside__note">
          Four agents take it from there: research, itinerary, budget, then a review.
        </p>
      </aside>
    </div>
  );
}
