import { Router, Request, Response } from "express";
import path from "path";
import { clearLogs } from "../middlewares/loggerMiddleware";
import { authMiddleware } from "../auth/auth";
import { RequestLogModel } from "../models/RequestLog";
import {
  getTreatmentsForDashboard,
  deleteTreatmentFromDB,
} from "../controllers/treatmentController";

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
