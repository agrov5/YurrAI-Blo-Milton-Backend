import axios from "axios";

// Vapi reports call costs in USD, but we store and report everything in CAD.
// This module fetches a live USD->CAD rate, caches it, and falls back to a
// fixed rate (USD_TO_CAD_RATE) if the rate API is unavailable.

const FALLBACK_RATE = Number(process.env.USD_TO_CAD_RATE) || 1.37;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // refresh the live rate at most every 12h
const FAILURE_RETRY_MS = 5 * 60 * 1000; // after a failure, wait 5 min before hitting the API again

const RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

let cachedRate: number | null = null;
let cachedAt = 0;
let lastFailedAt = 0;

/**
 * Returns the current USD->CAD conversion rate. Uses a cached live rate when
 * fresh, otherwise refreshes from the FX API. On failure it returns the last
 * known rate (even if stale) or the configured fallback, and backs off from
 * the API for a short window so we don't hammer it while it's down.
 */
export async function getUsdToCadRate(): Promise<number> {
  const now = Date.now();

  if (cachedRate != null && now - cachedAt < CACHE_TTL_MS) {
    return cachedRate;
  }
  if (now - lastFailedAt < FAILURE_RETRY_MS) {
    return cachedRate ?? FALLBACK_RATE;
  }

  try {
    const { data } = await axios.get(RATE_API_URL, { timeout: 5000 });
    const rate = data?.rates?.CAD;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      cachedRate = rate;
      cachedAt = now;
      return rate;
    }
    throw new Error(`FX API returned an invalid CAD rate: ${rate}`);
  } catch (err) {
    lastFailedAt = now;
    console.error(
      "Failed to fetch USD->CAD rate, using last known/fallback rate:",
      err instanceof Error ? err.message : err,
    );
    return cachedRate ?? FALLBACK_RATE;
  }
}

/**
 * Converts a USD amount to CAD using the current rate. Returns null for
 * null/undefined/non-finite input so callers can pass it through unchanged.
 */
export async function convertUsdToCad(
  amountUsd: number | null | undefined,
): Promise<number | null> {
  if (typeof amountUsd !== "number" || !Number.isFinite(amountUsd)) return null;
  const rate = await getUsdToCadRate();
  return amountUsd * rate;
}
