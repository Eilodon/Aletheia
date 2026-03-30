import rateLimit from "express-rate-limit";
import type { Request } from "express";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  keyGenerator: (req: Request): string => {
    // Use IP + user ID if authenticated, otherwise just IP
    const userId = req.headers["x-user-id"] as string | undefined;
    return userId ? `${req.ip}-${userId}` : req.ip || "unknown";
  },
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
  keyGenerator: (req: Request): string => {
    const userId = req.headers["x-user-id"] as string | undefined;
    return userId || req.ip || "unknown";
  },
});
