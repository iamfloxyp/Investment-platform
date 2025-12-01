// utils/planPercent.js
import seedrandom from "seedrandom";

/**
 * Compute today percent for a plan in a stable way.
 * Each day gets one random percent inside [minPercent, maxPercent].
 * The value is deterministic for that date and that plan.
 */
export function computePercentForDay(plan, date = new Date()) {
  if (!plan) return 0;

  const slug = plan.slug || plan.name || "plan";
  const dayKey = `${slug.toLowerCase()}_${date.toISOString().slice(0, 10)}`;

  const rng = seedrandom(dayKey);

  const base = typeof plan.basePercent === "number" ? plan.basePercent : 0;
  const vol = typeof plan.volatility === "number" ? plan.volatility : 0;

  // random value in [-volatility, +volatility]
  const rawDelta = (rng() * 2 - 1) * vol;

  let percent = base * (1 + rawDelta);

  if (typeof plan.minPercent === "number") {
    percent = Math.max(plan.minPercent, percent);
  }
  if (typeof plan.maxPercent === "number") {
    percent = Math.min(plan.maxPercent, percent);
  }

  // round nicely, for example 0.0423
  percent = Math.round(percent * 10000) / 10000;

  return percent;
}