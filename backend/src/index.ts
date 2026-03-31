import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import backendPackageJson from "../package.json" with { type: "json" };
import { appConfig } from "./config.js";
import { pool } from "./db/pool.js";
import { pullBodySchema, pushBodySchema } from "./sync/schemas.js";
import { pullChanges, pushChanges } from "./sync/service.js";

const app = express();

app.use(
  cors({
    origin: appConfig.corsOrigins.length > 0 ? appConfig.corsOrigins : true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  if (!req.path.startsWith("/v1/sync")) {
    next();
    return;
  }

  if (!appConfig.syncAccessToken) {
    next();
    return;
  }

  const authorization = req.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : null;

  if (bearerToken !== appConfig.syncAccessToken) {
    res.status(401).json({
      message: "Unauthorized sync request.",
    });
    return;
  }

  next();
});

app.get("/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1;");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/.well-known/memoraid-sync", (_req, res) => {
  res.json({
    service: "memoraid-sync",
    version: backendPackageJson.version,
    capabilities: ["push", "pull", appConfig.syncAccessToken ? "bearer-token" : "no-auth"],
  });
});

app.post("/v1/sync/push", async (req, res, next) => {
  try {
    const body = pushBodySchema.parse(req.body);
    const result = await pushChanges(body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/sync/pull", async (req, res, next) => {
  try {
    const body = pullBodySchema.parse(req.body);
    const result = await pullChanges(body.cursor);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request payload.",
      issues: error.issues,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(500).json({
    message,
  });
});

const server = app.listen(appConfig.port, () => {
  console.log(`Memoraid sync backend listening on http://localhost:${appConfig.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Closing Memoraid sync backend...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
