import type { Context, Next } from "hono";

const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "auth",
  "phone",
  "ssn",
  "creditCard",
  "cardNumber",
];

const REDACTED_VALUE = "***REDACTED***";

const isSensitiveKey = (key: string) => {
  const normalizedKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey.toLowerCase()),
  );
};

const maskSensitiveData = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveData(item));
  }

  const masked: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      masked[key] = REDACTED_VALUE;
      continue;
    }

    masked[key] = maskSensitiveData(nestedValue);
  }

  return masked;
};

export const loggerMiddleware = async (c: Context, next: Next) => {
  const startedAt = Date.now();
  const uuid = crypto.randomUUID().slice(0, 8);
  const { method } = c.req;
  const url = c.req.url;

  let payload: unknown;

  if (method === "POST") {
    try {
      const clonedRequest = c.req.raw.clone();
      payload = await clonedRequest.json();
    } catch {
      // ignore body parsing errors; payload will remain undefined
    }
  }

  const maskedPayload = payload !== undefined ? maskSensitiveData(payload) : undefined;

  console.log(
    `✨[${uuid}] ${method} ${url}`,
    maskedPayload !== undefined ? { payload: maskedPayload } : {},
  );

  await next();

  const durationMs = Date.now() - startedAt;
  const status = c.res.status ?? 0;
  const isError = status >= 400;

    const logLabel = isError ? "🚨 ERROR" : "🚀 OK";

  console.log(
    `[${uuid}] ${method} ${url} -> ${status} ${logLabel} (${durationMs}ms)`,
  );
};
