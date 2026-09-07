import { Router, type Request } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();
type HealthResponse = {
  json: (body: unknown) => unknown;
};

router.get("/healthz", (_req: Request, res: HealthResponse): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
