import seedrandom from "seedrandom";

/**
 * Compute today’s percent for a plan deterministically.
 * It changes slightly every day but stays within allowed range.
 */
export function computePercentForDay(plan, date = new Date()) {
  const dayKey = `${plan.slug}_${date.toISOString().slice(0,10)}`;
  const rng = seedrandom(dayKey);

  // pick random delta within [-volatility, +volatility]
  const rawDelta = (rng() * 2 - 1) * plan.volatility;
  let percent = plan.basePercent * (1 + rawDelta);

  // clamp between min and max
  percent = Math.max(plan.minPercent, Math.min(plan.maxPercent, percent));

  // round to 4 decimals (e.g. 0.0400)
  percent = Math.round(percent * 10000) / 10000;

  return percent;
}