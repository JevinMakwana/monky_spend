import cors from "cors";
import express from "express";
import { authRouter } from "./routes/authRoutes";
import { expenseRouter } from "./routes/expenseRoutes";

export function createApp() {
  const app = express();
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (configuredOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        try {
          const url = new URL(origin);
          if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            callback(null, true);
            return;
          }
        } catch {
          // Fall through to the error below.
        }

        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/expenses", expenseRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Not found" ? 404 : 500;
    res.status(status).json({ message });
  });

  return app;
}
