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
import {
  MonthlyCallStatsModel,
  getMonthYear,
} from "../models/MonthlyStats";

/**
 * Booker API usage analytics snapshot (per region). `callCountTotal` is the
 * number of requests that hit the API from each region, so summing it gives the
 * total Booker request count for the reporting period.
 */
const USAGE_REPORT = {
  value: [
    { country: "US", region: "MA", callCountTotal: 159 },
    { country: "CA", region: "QC", callCountTotal: 3 },
    { country: "US", region: "WA", callCountTotal: 128 },
    { country: "US", region: "CA", callCountTotal: 254 },
    { country: "CA", region: "ON", callCountTotal: 5 },
  ],
};

/**
 * Seeds the month's `totalBookerRequests` from the usage report above. This is
 * an authoritative snapshot, so it OVERWRITES the counter (not $inc). Re-running
 * is safe. Pass `--month=<1-12>` and/or `--year=<YYYY>` to target a specific
 * month; defaults to the current month.
 */
async function populateBookerRequests() {
  await connectDB();

  try {
    const args = process.argv.slice(2);
    const getArg = (name: string) =>
      args
        .find((a) => a.startsWith(`--${name}=`))
        ?.split("=")[1];

    const now = new Date();
    const monthArg = getArg("month");
    const yearArg = getArg("year");
    const targetMonthNum = monthArg ? parseInt(monthArg, 10) : now.getMonth() + 1;
    const targetYear = yearArg ? parseInt(yearArg, 10) : now.getFullYear();

    if (
      Number.isNaN(targetMonthNum) ||
      targetMonthNum < 1 ||
      targetMonthNum > 12 ||
      Number.isNaN(targetYear)
    ) {
      throw new Error(`Invalid --month/--year: ${monthArg} ${yearArg}`);
    }

    // Resolve to the long month name used by MonthlyCallStats documents.
    const { month, year } = getMonthYear(new Date(targetYear, targetMonthNum - 1, 1));

    const totalRequests = USAGE_REPORT.value.reduce(
      (sum, r) => sum + (r.callCountTotal || 0),
      0,
    );

    const updated = await MonthlyCallStatsModel.findOneAndUpdate(
      { month, year },
      { $set: { totalBookerRequests: totalRequests } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    console.log(
      `Set totalBookerRequests=${totalRequests} for ${month} ${year} ` +
        `(doc _id: ${updated._id}).`,
    );
  } catch (err) {
    console.error("Populate Booker requests failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

populateBookerRequests();
