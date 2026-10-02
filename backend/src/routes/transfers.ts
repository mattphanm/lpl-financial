import { Router, type Request, type Response, type NextFunction } from "express";
import { TransferService } from "../services/transferService.js";

export const transfersRouter = Router();

const service = new TransferService();

transfersRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const transfers = await service.list();
    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

transfersRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transfer = await service.getById(req.params.id);
    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    res.json(transfer);
  } catch (err) {
    next(err);
  }
});
