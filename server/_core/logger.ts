/**
 * Structured Logging Utility
 * Replaces console.log with JSON-structured logs for production
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const isProduction = process.env.NODE_ENV === "production";

function formatLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (isProduction) {
    // JSON format for production log aggregation
    return JSON.stringify(entry);
  }

  // Human-readable format for development
  const ctxStr = context ? ` ${JSON.stringify(context)}` : "";
  const color = getLevelColor(level);
  return `${color}[${entry.timestamp}] ${level.toUpperCase()}: ${message}${ctxStr}\x1b[0m`;
}

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "debug":
      return "\x1b[36m"; // cyan
    case "info":
      return "\x1b[32m"; // green
    case "warn":
      return "\x1b[33m"; // yellow
    case "error":
      return "\x1b[31m"; // red
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (!isProduction) console.debug(formatLogEntry("debug", message, context));
  },

  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatLogEntry("info", message, context));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatLogEntry("warn", message, context));
  },

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          ...context,
          error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        }
      : context;
    console.error(formatLogEntry("error", message, errorContext));
  },
};

// Alias for convenience
export const log = logger;
