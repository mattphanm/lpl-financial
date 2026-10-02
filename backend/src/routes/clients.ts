import { Router, type Request, type Response, type NextFunction } from "express";
import { ClientService } from "../services/clientService.js";

export const clientsRouter = Router();

const service = new ClientService();

// GET /api/clients/:id — client profile + accounts + transfers (with risk) + interactions
clientsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await service.getDetail(String(req.params.id));
    if (!detail) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});
