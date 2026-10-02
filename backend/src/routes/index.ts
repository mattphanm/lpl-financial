import type { Express, Request, Response } from "express";
import { transfersRouter } from "./transfers.js";
import { clientsRouter } from "./clients.js";
import { reportsRouter } from "./reports.js";

export function registerRoutes(app: Express): void {
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "transfer-ready", time: new Date().toISOString() });
  });

  app.use("/api/transfers", transfersRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/reports", reportsRouter);
}
