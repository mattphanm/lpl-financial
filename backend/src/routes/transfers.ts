import { Router, type Request, type Response, type NextFunction } from "express";
import { TransferService } from "../services/transferService.js";

export const transfersRouter = Router();

const service = new TransferService();

// GET /api/transfers — dashboard list
transfersRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.listDashboard());
  } catch (err) {
    next(err);
  }
});

// GET /api/transfers/:id — full detail
transfersRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await service.getDetail(String(req.params.id));
    if (!detail) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});
