import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

const healthHandler: Parameters<typeof router.get>[1] = (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return res.status(200).json(data);
};

router.get("/", healthHandler);

export default router;
