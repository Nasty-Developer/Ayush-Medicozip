import { Router, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  return res.status(200).json(data);
});

export default router;
