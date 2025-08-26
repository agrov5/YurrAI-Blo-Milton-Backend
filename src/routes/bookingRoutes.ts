import { Router } from "express";

const router = Router();

export const route = router.get("/", (req, res) => {
  res.send("Hello World!");
});

export default router;
