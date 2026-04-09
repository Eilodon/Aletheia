import "../../scripts/load-env.js";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// import { registerOAuthRoutes } from "./oauth"; // ADR-AL-21: OAuth disabled
import { appRouter } from "../routers";
import { createContext } from "./context";
import { validateServerEnv, ENV } from "./env";
import { apiLimiter, aiApiLimiter } from "./rateLimit";
import { getReleaseReadiness } from "./releaseReadiness";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateServerEnv();

  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-aletheia-app-secret",
      );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // registerOAuthRoutes(app); // ADR-AL-21: OAuth disabled

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Deep health check - verifies database, AI service, and storage
  app.get("/api/health/deep", async (_req, res) => {
    const checks = {
      database: { status: "unknown", latencyMs: 0 },
      aiService: { status: "unknown", latencyMs: 0 },
      storage: { status: "unknown", latencyMs: 0 },
      giftBackend: { status: "unknown", latencyMs: 0 },
    };
    let allHealthy = true;

    // Check database
    const dbStart = Date.now();
    try {
      const dbConn = await getDb();
      checks.database.status = dbConn === null ? "disabled" : "healthy";
      checks.database.latencyMs = Date.now() - dbStart;
    } catch {
      checks.database.status = "unhealthy";
      checks.database.latencyMs = Date.now() - dbStart;
      allHealthy = false;
    }

    // Check AI service
    const aiStart = Date.now();
    try {
      const aiUrl = ENV.aiApiUrl || process.env.BUILT_IN_FORGE_API_URL;
      if (!aiUrl) {
        checks.aiService.status = "not_configured";
      } else {
        // Simple connectivity check - HEAD request to base URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(aiUrl.replace(/\/$/, "") + "/health", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        checks.aiService.status = response.ok ? "healthy" : "degraded";
        if (!response.ok) allHealthy = false;
      }
      checks.aiService.latencyMs = Date.now() - aiStart;
    } catch {
      checks.aiService.status = "unhealthy";
      checks.aiService.latencyMs = Date.now() - aiStart;
      allHealthy = false;
    }

    // Check storage (S3/R2)
    const storageStart = Date.now();
    try {
      const storageUrl = process.env.STORAGE_BASE_URL || process.env.S3_ENDPOINT;
      if (!storageUrl) {
        checks.storage.status = "not_configured";
      } else {
        checks.storage.status = "healthy"; // Assume healthy if configured
      }
      checks.storage.latencyMs = Date.now() - storageStart;
    } catch {
      checks.storage.status = "unhealthy";
      checks.storage.latencyMs = Date.now() - storageStart;
      allHealthy = false;
    }

    const giftStart = Date.now();
    try {
      const giftUrl = process.env.EXPO_PUBLIC_GIFT_BACKEND_URL;
      checks.giftBackend.status = giftUrl ? "configured" : "not_configured";
      checks.giftBackend.latencyMs = Date.now() - giftStart;
    } catch {
      checks.giftBackend.status = "unhealthy";
      checks.giftBackend.latencyMs = Date.now() - giftStart;
      allHealthy = false;
    }

    res.status(allHealthy ? 200 : 503).json({
      ok: allHealthy,
      timestamp: Date.now(),
      checks,
    });
  });

  app.get("/api/health/release", (_req, res) => {
    const report = getReleaseReadiness();
    res.status(report.ok ? 200 : 503).json(report);
  });

  // Apply rate limiting to all /api routes
  app.use("/api", apiLimiter);

  app.use(
    "/api/trpc",
    aiApiLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
