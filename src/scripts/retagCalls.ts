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
import { tagCall } from "../util/ai_util";

/**
 * Re-runs AI tagging for a set of calls, overwriting whatever tags they
 * currently have.
 *
 * Usage:
 *   npm run retag-calls -- --count 20          # oldest N calls, earliest first
 *   npm run retag-calls -- --untagged          # only calls with no tags
 *   npm run retag-calls -- --untagged --count 20
 *   npm run retag-calls -- --callId abc123
 *   npm run retag-calls -- --callId abc123,def456 --callId ghi789
 *
 * `--callId` accepts a comma-separated list and/or repeated flags; it matches
 * against both the Vapi `callId` field and the Mongo `_id`. `--callId` cannot be
 * combined with `--count` or `--untagged`; `--count` acts as a limit on
 * `--untagged`.
 */
async function retagCalls() {
  const { count, callIds, untagged } = parseArgs(process.argv.slice(2));

  await connectDB();

  try {
    let calls;
    if (callIds) {
      calls = await VapiCallModel.find({
        $or: [{ callId: { $in: callIds } }, { _id: { $in: safeObjectIds(callIds) } }],
      });
    } else {
      const filter = untagged
        ? { $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] }
        : {};
      const query = VapiCallModel.find(filter).sort({ startedAt: 1 });
      if (count !== undefined) query.limit(count);
      calls = await query;
    }

    if (callIds) {
      const found = new Set(calls.map((c) => c.callId));
      const missing = callIds.filter((id) => !found.has(id) && !calls.some((c) => c._id.toString() === id));
      if (missing.length) {
        console.warn(`No call found for: ${missing.join(", ")}`);
      }
    }

    console.log(`Retagging ${calls.length} call(s)...`);

    let succeeded = 0;
    let failed = 0;
    for (const call of calls) {
      try {
        const tags = await tagCall(call.summary, call.transcript);
        await VapiCallModel.findByIdAndUpdate(call._id, { tags });
        console.log(`  ${call.callId || call._id}: [${tags.join(", ")}]`);
        succeeded++;
      } catch (err) {
        console.error(`  ${call.callId || call._id}: FAILED -`, err instanceof Error ? err.message : err);
        failed++;
      }
    }

    console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
    if (failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error("Retag script failed:", err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

function parseArgs(argv: string[]): { count?: number; callIds?: string[]; untagged?: boolean } {
  const callIds: string[] = [];
  let count: number | undefined;
  let untagged = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--untagged") {
      untagged = true;
    } else if (arg === "--count") {
      const val = argv[++i];
      count = parseInt(val, 10);
      if (!Number.isFinite(count) || count <= 0) {
        throw new Error(`--count must be a positive integer, got "${val}"`);
      }
    } else if (arg === "--callId") {
      const val = argv[++i];
      if (!val) throw new Error("--callId requires a value");
      callIds.push(...val.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }

  if (callIds.length > 0 && (count !== undefined || untagged)) {
    throw new Error("--callId cannot be combined with --count or --untagged");
  }
  if (count === undefined && callIds.length === 0 && !untagged) {
    throw new Error(
      "Usage: retag-calls -- --count <N>  OR  --untagged [--count <N>]  OR  --callId <id1,id2,...>",
    );
  }

  return { count, callIds: callIds.length > 0 ? callIds : undefined, untagged };
}

function safeObjectIds(ids: string[]): string[] {
  // Mongoose will coerce valid ObjectId strings and ignore the rest via $in;
  // filtering here just avoids noisy CastErrors for obviously non-ObjectId values.
  return ids.filter((id) => /^[a-f0-9]{24}$/i.test(id));
}

retagCalls();
