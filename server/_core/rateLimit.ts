import { createHash } from "node:crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function getAiRequesterKey(req: Request): string {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return `auth:${hashKey(authHeader.slice("Bearer ".length).trim())}`;
  }

  const appId = req.header("X-Aletheia-App-Id")?.trim();
  const userId = req.header("X-Aletheia-User-Id")?.trim();
  if (appId && userId) {
    return `beta:${hashKey(`${appId}:${userId}`)}`;
  }

  return `ip:${ipKeyGenerator(req.ip || "unknown")}`;
}

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  keyGenerator: (req: Request): string => ipKeyGenerator(req.ip || "unknown"),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
  skipSuccessfulRequests: true,
});

export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute (more restrictive due to cost)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request limit exceeded, please try again later" },
  keyGenerator: (req: Request): string => getAiRequesterKey(req),
});
