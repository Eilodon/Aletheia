/**
 * Error mapping between app-level and HTTP transport layer.
 * SYNC WITH: core/src/contracts.rs
 */

import { ErrorCode, AletheiaError } from "./types";

/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Convenience constructors
export const BadRequestError = (msg: string) => new HttpError(400, msg);
export const UnauthorizedError = (msg: string) => new HttpError(401, msg);
export const ForbiddenError = (msg: string) => new HttpError(403, msg);
export const NotFoundError = (msg: string) => new HttpError(404, msg);

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.SourceNotFound]: 404,
  [ErrorCode.PassageEmpty]: 404,
  [ErrorCode.ThemeNotFound]: 404,
  [ErrorCode.SymbolInvalid]: 400,
  [ErrorCode.AiTimeout]: 504,
  [ErrorCode.AiUnavailable]: 503,
  [ErrorCode.GiftExpired]: 410,
  [ErrorCode.GiftNotFound]: 404,
  [ErrorCode.GiftAlreadyRedeemed]: 409,
  [ErrorCode.DailyLimitReached]: 403,
  [ErrorCode.SubscriptionRequired]: 402,
  [ErrorCode.StorageWriteFail]: 500,
  [ErrorCode.InvalidInput]: 400,
};

export function toHttpError(err: AletheiaError): HttpError {
  const statusCode = ERROR_STATUS_MAP[err.code] ?? 500;
  return new HttpError(statusCode, err.message);
}

export function isAletheiaError(error: unknown): error is AletheiaError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}
