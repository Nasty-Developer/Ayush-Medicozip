import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

router.get("/", (req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return res.status(200).json(data);
});

export default router;
