import { Router, type Request, type Response, type NextFunction } from "express";
import { TransferService } from "../services/transferService.js";
import { ContextService } from "../services/contextService.js";
import { AiService } from "../services/aiService.js";

export const transfersRouter = Router();

const service = new TransferService();
const context = new ContextService();
const ai = new AiService();

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

// PATCH /api/transfers/:id/progress — shared "in progress" review state so
// advisors don't duplicate outreach. Body: { reviewStatus, addressedBy? }.
transfersRouter.patch(
  "/:id/progress",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as {
        reviewStatus?: unknown;
        addressedBy?: unknown;
      };
      const reviewStatus = body.reviewStatus;

      if (reviewStatus !== "ACTIVE" && reviewStatus !== "IN_PROGRESS") {
        res.status(400).json({
          error: "reviewStatus must be 'ACTIVE' or 'IN_PROGRESS'",
        });
        return;
      }

      const addressedBy =
        typeof body.addressedBy === "string" ? body.addressedBy : undefined;

      if (reviewStatus === "IN_PROGRESS" && !addressedBy?.trim()) {
        res.status(400).json({
          error: "addressedBy is required when marking in progress",
        });
        return;
      }

      const updated = await service.setProgress(
        String(req.params.id),
        reviewStatus,
        addressedBy
      );

      if (!updated) {
        res.status(404).json({ error: "Transfer not found" });
        return;
      }

      res.json({
        transferId: updated.transferId,
        reviewStatus: updated.reviewStatus ?? "ACTIVE",
        addressedAt: updated.addressedAt ?? null,
        addressedBy: updated.addressedBy ?? null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/transfers/:id/analyze — AI risk explanation + recommended action (grounded via RAG)
transfersRouter.post(
  "/:id/analyze",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = await context.build(String(req.params.id));
      if (!ctx) {
        res.status(404).json({ error: "Transfer not found" });
        return;
      }
      const result = await ai.analyzeTransfer(ctx);
      res.json({
        ...result,
        meta: {
          retrievalQuery: ctx.retrievalQuery,
          sources: ctx.knowledge.map((k) => k.source),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/transfers/:id/follow-up — AI-drafted client follow-up (advisor must review before sending)
transfersRouter.post(
  "/:id/follow-up",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = await context.build(String(req.params.id));
      if (!ctx) {
        res.status(404).json({ error: "Transfer not found" });
        return;
      }
      const result = await ai.generateFollowUp(ctx);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
