import { Router, Request, Response } from "express";
import path from "path";
import { clearLogs } from "../middlewares/loggerMiddleware";
import { authMiddleware } from "../auth/auth";
import { RequestLogModel } from "../models/RequestLog";
import {
  getTreatmentsForDashboard,
  deleteTreatmentFromDB,
} from "../controllers/treatmentController";
import { EmployeeModel } from "../models/Employee";
import { getSettings } from "../models/Settings";
import { VapiCallModel } from "../models/Vapi";
import { MessageLogModel } from "../models/MessageLog";
import { MonthlyCallStatsModel, getMonthYear } from "../models/MonthlyStats";
import { sendMessage } from "../util/phone_util";
import { getMessageCharLimit } from "../models/MessageLog";

const router = Router();

// ── Log API (protected) ───────────────────────────────────────────────────────

router.get("/logs/api", authMiddleware, async (req: Request, res: Response) => {
  const {
    level,
    type,
    method,
    status,
    q,
    limit = "500",
  } = req.query as Record<string, string>;

  const query: Record<string, unknown> = {};
  if (level) query.level = level;
  if (type) query.type = type;
  if (method) query.method = method.toUpperCase();
  if (status) {
    const normalized = parseInt(status, 10);
    if (!Number.isNaN(normalized)) {
      if (status.length === 1) {
        query.status = { $gte: normalized * 100, $lt: normalized * 100 + 100 };
      } else {
        query.status = normalized;
      }
    }
  }

  const maxResults = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000);

  try {
    let logs = await RequestLogModel.find(query as Record<string, unknown>)
      .sort({ timestamp: -1 })
      .limit(maxResults)
      .lean();

    if (q) {
      const normalizedQuery = q.toLowerCase();
      logs = logs.filter((log) =>
        JSON.stringify(log).toLowerCase().includes(normalizedQuery),
      );
    }

    const total = logs.length;
    res.json({ total, count: logs.length, logs });
  } catch (error) {
    console.error("Failed to fetch request logs:", error);
    res.status(500).json({ ok: false, message: "Unable to fetch logs" });
  }
});

router.delete(
  "/logs/api",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      await RequestLogModel.deleteMany({});
      clearLogs();
      res.json({ ok: true, message: "Logs cleared" });
    } catch (error) {
      console.error("Failed to clear request logs:", error);
      res.status(500).json({ ok: false, message: "Unable to clear logs" });
    }
  },
);

// ── Treatment Management API (protected) ─────────────────────────────────────

router.get("/treatments", authMiddleware, getTreatmentsForDashboard);
router.delete("/treatments/:id", authMiddleware, deleteTreatmentFromDB);

// ── Employee Alias Management API (protected) ─────────────────────────────────

router.get("/employees", authMiddleware, async (req: Request, res: Response) => {
  try {
    const employees = await EmployeeModel.find({}, { ID: 1, DisplayName: 1, FirstName: 1, LastName: 1, AliasNames: 1 }).sort({ DisplayName: 1 }).lean();
    res.json({ ok: true, employees });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to load employees" });
  }
});

router.post("/employees/:id/aliases", authMiddleware, async (req: Request, res: Response) => {
  const { alias } = req.body as { alias?: string };
  if (!alias || !alias.trim()) {
    res.status(400).json({ ok: false, error: "Alias is required" });
    return;
  }
  const trimmed = alias.trim();
  try {
    const employee = await EmployeeModel.findOne({ ID: Number(req.params.id) });
    if (!employee) {
      res.status(404).json({ ok: false, error: "Employee not found" });
      return;
    }
    if (employee.AliasNames && employee.AliasNames.includes(trimmed)) {
      res.status(409).json({ ok: false, error: "Alias already exists" });
      return;
    }
    employee.AliasNames = [...(employee.AliasNames || []), trimmed];
    await employee.save();
    res.json({ ok: true, aliases: employee.AliasNames });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to add alias" });
  }
});

router.delete("/employees/:id/aliases", authMiddleware, async (req: Request, res: Response) => {
  const { alias } = req.body as { alias?: string };
  if (!alias) {
    res.status(400).json({ ok: false, error: "Alias is required" });
    return;
  }
  try {
    const employee = await EmployeeModel.findOne({ ID: Number(req.params.id) });
    if (!employee) {
      res.status(404).json({ ok: false, error: "Employee not found" });
      return;
    }
    employee.AliasNames = (employee.AliasNames || []).filter((a) => a !== alias);
    await employee.save();
    res.json({ ok: true, aliases: employee.AliasNames });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to remove alias" });
  }
});

// ── Settings API (protected) ──────────────────────────────────────────────────

router.get("/settings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json({ ok: true, settings: { shortCallThresholdSeconds: settings.shortCallThresholdSeconds } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to load settings" });
  }
});

router.patch("/settings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { shortCallThresholdSeconds } = req.body as { shortCallThresholdSeconds?: number };
    const val = Number(shortCallThresholdSeconds);
    if (isNaN(val) || val < 0) {
      res.status(400).json({ ok: false, error: "shortCallThresholdSeconds must be a non-negative number" });
      return;
    }
    const settings = await getSettings();
    settings.shortCallThresholdSeconds = val;
    await settings.save();
    res.json({ ok: true, settings: { shortCallThresholdSeconds: settings.shortCallThresholdSeconds } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to save settings" });
  }
});

// ── VoIP & Booker API (protected) ─────────────────────────────────────────────

// voip.ms phone-line pricing for the call DID: per-minute usage plus a flat
// monthly fee. Override via env if the plan changes.
const VOIP_PER_MINUTE_CAD = process.env.VOIP_PER_MINUTE_CAD
  ? Number(process.env.VOIP_PER_MINUTE_CAD)
  : 0.009;
const VOIP_MONTHLY_BASE_CAD = process.env.VOIP_MONTHLY_BASE_CAD
  ? Number(process.env.VOIP_MONTHLY_BASE_CAD)
  : 1.1;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * @route   GET /admin/messages
 * @desc    Monthly VoIP & Booker overview: every SMS/MMS sent with SMS/MMS cost
 *          split, Booker request count, and voip.ms call-line cost derived from
 *          Vapi call minutes ($/min + flat monthly fee).
 * @query   month (1-12), year — defaults to the current month.
 * @access  Protected
 */
router.get("/messages", authMiddleware, async (req: Request, res: Response) => {
  const { month, year } = req.query as Record<string, string>;

  try {
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    if (
      Number.isNaN(targetMonth) ||
      targetMonth < 1 ||
      targetMonth > 12 ||
      Number.isNaN(targetYear)
    ) {
      res.status(400).json({ ok: false, error: "Invalid month or year" });
      return;
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1);

    const messages = await MessageLogModel.find({
      createdAt: { $gte: startDate, $lt: endDate },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate message costs, split by SMS vs MMS.
    let smsCost = 0;
    let mmsCost = 0;
    let smsCount = 0;
    let mmsCount = 0;
    let failedCount = 0;
    for (const m of messages) {
      if (m.messageType === "MMS") {
        mmsCount++;
        mmsCost += m.cost || 0;
      } else {
        smsCount++;
        smsCost += m.cost || 0;
      }
      if (!m.success) failedCount++;
    }
    const totalMessageCost = smsCost + mmsCost;

    // Pull the matching monthly stats doc for the Booker request counter.
    const { month: monthName } = getMonthYear(startDate);
    const monthlyStats = await MonthlyCallStatsModel.findOne({
      month: monthName,
      year: targetYear,
    }).lean();

    // voip.ms call-line cost from this month's Vapi call minutes.
    const callAgg = await VapiCallModel.aggregate([
      {
        $match: {
          startedAt: {
            $gte: startDate.toISOString(),
            $lt: endDate.toISOString(),
          },
        },
      },
      {
        $group: {
          _id: null,
          callCount: { $sum: 1 },
          callMinutes: { $sum: { $ifNull: ["$durationMinutes", 0] } },
        },
      },
    ]);
    const callCount = callAgg[0]?.callCount || 0;
    const callMinutes = callAgg[0]?.callMinutes || 0;
    // Flat monthly fee only applies once any usage exists for the month.
    const voipCallCost =
      callMinutes * VOIP_PER_MINUTE_CAD +
      (callCount > 0 ? VOIP_MONTHLY_BASE_CAD : 0);

    res.json({
      ok: true,
      month: targetMonth,
      year: targetYear,
      pricing: {
        voipPerMinute: VOIP_PER_MINUTE_CAD,
        voipMonthlyBase: VOIP_MONTHLY_BASE_CAD,
      },
      stats: {
        messageCount: messages.length,
        smsCount,
        mmsCount,
        failedCount,
        smsCost: round2(smsCost),
        mmsCost: round2(mmsCost),
        totalCost: round2(totalMessageCost),
        bookerRequests: monthlyStats?.totalBookerRequests || 0,
        callCount,
        callMinutes: round2(callMinutes),
        voipCallCost: round2(voipCallCost),
        grandTotalCost: round2(totalMessageCost + voipCallCost),
      },
      messages,
    });
  } catch (error) {
    console.error("Failed to fetch VoIP & Booker stats:", error);
    res.status(500).json({ ok: false, error: "Unable to fetch stats" });
  }
});

/**
 * @route   POST /admin/messages/send
 * @desc    Send an SMS/MMS from the dashboard. `target` resolves the
 *          destination: "admin" → ADMIN_PHONE, "dev" → DEV_PHONE, "customer" →
 *          the supplied `phone`. The send is logged like any other message.
 * @body    { target: "admin"|"dev"|"customer", phone?, body, messageType }
 * @access  Protected
 */
router.post(
  "/messages/send",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { target, phone, body, messageType } = req.body as {
      target?: "admin" | "dev" | "customer";
      phone?: string;
      body?: string;
      messageType?: string;
    };

    const type =
      String(messageType).toUpperCase() === "MMS" ? "MMS" : "SMS";

    if (!body || !body.trim()) {
      res.status(400).json({ ok: false, error: "Message body is required" });
      return;
    }

    const charLimit = getMessageCharLimit(type);
    if (body.trim().length > charLimit) {
      res.status(400).json({
        ok: false,
        error: `${type} messages are limited to ${charLimit} characters`,
      });
      return;
    }

    // Resolve the destination number from the chosen target.
    let to: string | undefined;
    if (target === "admin") to = process.env.ADMIN_PHONE;
    else if (target === "dev") to = process.env.DEV_PHONE;
    else if (target === "customer") to = phone?.trim();
    else {
      res.status(400).json({ ok: false, error: "Invalid target" });
      return;
    }

    if (!to) {
      res.status(400).json({
        ok: false,
        error:
          target === "customer"
            ? "Phone number is required"
            : `${target} phone number is not configured`,
      });
      return;
    }

    try {
      const success = await sendMessage(to, body.trim(), type);
      if (!success) {
        res
          .status(502)
          .json({ ok: false, error: "voip.ms rejected the message" });
        return;
      }
      res.json({ ok: true, to, messageType: type });
    } catch (error) {
      console.error("Failed to send message:", error);
      res.status(500).json({ ok: false, error: "Unable to send message" });
    }
  },
);

// ── Call backfill (protected) ─────────────────────────────────────────────────

router.post("/calls/backfill-inconclusive", authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await VapiCallModel.updateMany(
      { $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] },
      { $set: { tags: ["Inconclusive"] } }
    );
    res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) {
    console.error("Backfill inconclusive failed:", err);
    res.status(500).json({ ok: false, error: "Backfill failed" });
  }
});

/**
 * @route   GET /login
 * @desc    Serve login page
 * @access  Public
 */
router.get("/login", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

/**
 * @route   GET /dashboard
 * @desc    Serve dashboard page
 * @access  Public (authentication handled client-side)
 */
router.get("/dashboard", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// /**
//  * @route   GET / (admin root)
//  * @desc    Redirect to login page
//  * @access  Public
//  */
// router.get("/", (req: Request, res: Response) => {
//   res.redirect("/admin/login");
// });

export default router;
