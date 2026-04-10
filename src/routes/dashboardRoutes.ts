import { Router, Request, Response } from "express";
import path from "path";
import { clearLogs, getLogs, LogEntry } from "../middlewares/loggerMiddleware";

const router = Router();

// ── Log API ───────────────────────────────────────────────────────────────────

router.get("/logs/api", (req: Request, res: Response) => {
  const {
    level,
    type,
    method,
    status,
    q,
    limit = "500",
  } = req.query as Record<string, string>;

  let logs: LogEntry[] = getLogs();

  if (level) logs = logs.filter((l) => l.level === level);
  if (type) logs = logs.filter((l) => l.type === type);
  if (method) logs = logs.filter((l) => l.method === method.toUpperCase());
  if (status)
    logs = logs.filter((l) => String(l.status ?? "").startsWith(status));
  if (q) {
    const query = q.toLowerCase();
    logs = logs.filter((l) => JSON.stringify(l).toLowerCase().includes(query));
  }

  const sliced = logs.slice(0, parseInt(limit, 10));
  res.json({ total: logs.length, count: sliced.length, logs: sliced });
});

router.delete("/logs/api", (req: Request, res: Response) => {
  clearLogs();
  res.json({ ok: true, message: "Logs cleared" });
});

// ── Log Viewer UI ─────────────────────────────────────────────────────────────

router.get("/logs", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/logs.html"));
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
