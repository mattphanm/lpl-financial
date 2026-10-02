import "dotenv/config";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

registerRoutes(app);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Transfer-Ready API listening on port ${PORT}`);
});

export { app };
