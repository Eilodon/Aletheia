const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /authorization|buyer[_-]?note|cookie|model[_-]?prompt|passage|prompt|provider[_-]?error|secret|situation|token/i;

const SECRET_STRING_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi,
  /\bgift\s+[A-Za-z0-9._~+/=-]{8,}\b/gi,
  /\btoken[=:]\s*[^,\s}]+/gi,
];

function scrubString(value: string): string {
  return SECRET_STRING_PATTERNS.reduce(
    (scrubbed, pattern) => scrubbed.replace(pattern, REDACTED),
    value,
  );
}

function scrubValue(value: unknown, path: string[] = []): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item, index) => scrubValue(item, [...path, String(index)]));
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (next, [key, child]) => {
      const keyPath = [...path, key].join(".");
      if (SENSITIVE_KEY_PATTERN.test(keyPath)) {
        next[key] = REDACTED;
        return next;
      }
      next[key] = scrubValue(child, [...path, key]);
      return next;
    },
    {},
  );
}

export function scrubSentryEvent<T extends Record<string, unknown>>(event: T): T {
  return scrubValue(event) as T;
}
