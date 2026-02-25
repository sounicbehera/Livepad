import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "LivePad backend running" });
});

export default router;
