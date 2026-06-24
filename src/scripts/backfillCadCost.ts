import path from "path";

// Load env the same way app.ts does, before anything reads process.env.
const dotenv = require("dotenv");
const env = process.env.NODE_ENV || "development";
dotenv.config({
  path: path.resolve(
    __dirname,
    "../../environments",
    env === "production" ? ".env.production" : ".env.development",
  ),
});

import { connectDB, disconnectDB } from "../config/database";
import { VapiCallModel } from "../models/Vapi";
import { populateMonthlyStats, getMonthYear } from "../models/MonthlyStats";
import { getUsdToCadRate } from "../util/currency_util";

/**
 * One-time migration: converts every call cost that is still stored in USD into
 * CAD and tags it with `costCurrency: "CAD"`. Costs already marked CAD are
 * skipped, so the script is safe to re-run. After converting the per-call costs
 * it recomputes the affected MonthlyCallStats documents (which derive totalCost
 * from the per-call costs); the accumulated `totalRevenueMade` is left untouched.
 */
async function backfillCadCost() {
  await connectDB();

  try {
    const rate = await getUsdToCadRate();
    console.log(`Using USD->CAD rate: ${rate}`);

    // Months we'll need to recompute, derived from the calls being converted.
    const legacyCalls = await VapiCallModel.find(
      { costCurrency: { $ne: "CAD" } },
      { startedAt: 1, startTime: 1 },
    ).lean();

    const months = new Map<string, { month: string; year: number }>();
    for (const call of legacyCalls) {
      const iso = call.startedAt || call.startTime;
      if (!iso) continue;
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      const { month, year } = getMonthYear(d);
      months.set(`${month}-${year}`, { month, year });
    }

    // Convert numeric costs in place and mark everything CAD (including
    // null-cost docs, so they're not reconsidered on a re-run).
    const result = await VapiCallModel.updateMany({ costCurrency: { $ne: "CAD" } }, [
      {
        $set: {
          cost: {
            $cond: [{ $isNumber: "$cost" }, { $multiply: ["$cost", rate] }, "$cost"],
          },
          costCurrency: "CAD",
        },
      },
    ]);

    console.log(`Converted ${result.modifiedCount} call(s) from USD to CAD.`);

    // Recompute the stored monthly aggregates so totalCost / averageCostPerCall
    // reflect the converted (CAD) per-call costs.
    for (const { month, year } of months.values()) {
      await populateMonthlyStats(month, year);
      console.log(`Recomputed monthly stats for ${month} ${year}.`);
    }

    console.log("Backfill complete.");
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

backfillCadCost();
