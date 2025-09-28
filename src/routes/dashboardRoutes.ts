import { Router, Request, Response } from "express";
import path from "path";

const router = Router();

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

/**
 * @route   GET /
 * @desc    Redirect root to login
 * @access  Public
 */
router.get("/", (req: Request, res: Response) => {
  res.redirect("/login");
});

export default router;
