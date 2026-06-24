import mongoose, { Document, Schema } from "mongoose";
import { VapiCallModel } from "./Vapi";

export interface MonthlyStatsObject {
  month: string;
  year: number;
  totalCalls: number;
  totalDurationMinutes: number;
  totalCost: number;
  averageCallDurationMinutes: number;
  averageCostPerCall: number;
  callMongoIds: string[];
  totalRevenueMade: number;
}

export interface MonthlyCallStatsDocument extends MonthlyStatsObject, Document {}

const MonthlyCallStatsSchema = new Schema<MonthlyCallStatsDocument>(
  {
    month: { type: String, required: true },
    year: { type: Number, required: true },
    totalCalls: { type: Number, default: 0 },
    totalDurationMinutes: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    averageCallDurationMinutes: { type: Number, default: 0 },
    averageCostPerCall: { type: Number, default: 0 },
    callMongoIds: { type: [String], default: [] },
    // Revenue is accumulated incrementally as appointments are booked, so it is
    // never recomputed from calls — populate() preserves whatever has been added.
    totalRevenueMade: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One stats document per calendar month.
MonthlyCallStatsSchema.index({ month: 1, year: 1 }, { unique: true });

export const MonthlyCallStatsModel =
  (mongoose.models.MonthlyCallStats as mongoose.Model<MonthlyCallStatsDocument>) ||
  mongoose.model<MonthlyCallStatsDocument>("MonthlyCallStats", MonthlyCallStatsSchema);

/** Returns the long month name + year for a given date (defaults to now). */
export function getMonthYear(date: Date = new Date()): { month: string; year: number } {
  return {
    month: date.toLocaleString("default", { month: "long" }),
    year: date.getFullYear(),
  };
}

/**
 * Recomputes the call-derived stats for a month from the VapiCall collection and
 * upserts them into the MonthlyCallStats document. The accumulated
 * `totalRevenueMade` is left untouched on existing docs and seeded to 0 on insert.
 */
export async function populateMonthlyStats(
  month: string,
  year: number,
): Promise<MonthlyCallStatsDocument> {
  const dateBegin = new Date(`${month} 1 ${year}`);
  if (isNaN(dateBegin.getTime())) {
    throw new Error(`Invalid month/year: "${month} ${year}"`);
  }
  const dateEnd = new Date(dateBegin.getFullYear(), dateBegin.getMonth() + 1, 0);
  dateEnd.setHours(23, 59, 59, 999);

  const ISOdateBegin = dateBegin.toISOString();
  const ISOdateEnd = dateEnd.toISOString();

  const agg = await VapiCallModel.aggregate([
    { $match: { startedAt: { $gte: ISOdateBegin, $lte: ISOdateEnd } } },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        totalDurationMinutes: { $sum: { $ifNull: ["$durationMinutes", 0] } },
        totalCost: { $sum: { $ifNull: ["$cost", 0] } },
        callMongoIds: { $push: { $toString: "$_id" } },
      },
    },
  ]);

  const base = agg[0] ?? {
    totalCalls: 0,
    totalDurationMinutes: 0,
    totalCost: 0,
    callMongoIds: [] as string[],
  };

  const totalCalls = base.totalCalls || 0;
  const totalDurationMinutes = base.totalDurationMinutes || 0;
  const totalCost = base.totalCost || 0;
  const averageCallDurationMinutes = totalCalls > 0 ? totalDurationMinutes / totalCalls : 0;
  const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

  const updated = await MonthlyCallStatsModel.findOneAndUpdate(
    { month, year },
    {
      $set: {
        totalCalls,
        totalDurationMinutes,
        totalCost,
        averageCallDurationMinutes,
        averageCostPerCall,
        callMongoIds: base.callMongoIds || [],
      },
      $setOnInsert: { totalRevenueMade: 0 },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return updated;
}

/**
 * Adds booked-appointment revenue to the current month's stats, creating the
 * month document if it doesn't exist yet. No-ops for invalid/non-positive amounts.
 */
export async function addRevenueToCurrentMonth(amount: number | null | undefined): Promise<void> {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return;

  const { month, year } = getMonthYear();
  await MonthlyCallStatsModel.findOneAndUpdate(
    { month, year },
    { $inc: { totalRevenueMade: amount } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
