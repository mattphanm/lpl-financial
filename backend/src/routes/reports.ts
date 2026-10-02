import { Router, type Request, type Response, type NextFunction } from "express";
import { ReportService } from "../services/reportService.js";

export const reportsRouter = Router();

const service = new ReportService();

// GET /api/reports — portfolio-wide metrics
reportsRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.build());
  } catch (err) {
    next(err);
  }
});
