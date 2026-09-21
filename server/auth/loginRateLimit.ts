const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_MAX_FAILURES = 20;
const LOGIN_IDENTIFIER_MAX_FAILURES = 8;

type FailureRecord = {
  failures: number;
  windowStartedAt: number;
};

const failures = new Map<string, FailureRecord>();

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase().slice(0, 160);
}

function requestIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (firstForwarded?.split(",")[0]?.trim() || req.ip || "unknown").slice(0, 120);
}

function readRecord(key: string, now: number) {
  const record = failures.get(key);
  if (!record || now - record.windowStartedAt >= LOGIN_WINDOW_MS) {
    if (record) failures.delete(key);
    return null;
  }
  return record;
}

function isBlocked(key: string, maxFailures: number, now: number) {
  const record = readRecord(key, now);
  return Boolean(record && record.failures >= maxFailures);
}

export function loginAttemptKeys(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }, identifier: string) {
  const ip = requestIp(req);
  return {
    ip: `login:ip:${ip}`,
    identifier: `login:identifier:${ip}:${normalizeIdentifier(identifier)}`,
  };
}

export function isLoginAttemptAllowed(keys: ReturnType<typeof loginAttemptKeys>, now = Date.now()) {
  return !isBlocked(keys.ip, LOGIN_IP_MAX_FAILURES, now) && !isBlocked(keys.identifier, LOGIN_IDENTIFIER_MAX_FAILURES, now);
}

function recordFailure(key: string, now: number) {
  const record = readRecord(key, now);
  failures.set(key, record ? { ...record, failures: record.failures + 1 } : { failures: 1, windowStartedAt: now });
}

export function recordFailedLoginAttempt(keys: ReturnType<typeof loginAttemptKeys>, now = Date.now()) {
  recordFailure(keys.ip, now);
  recordFailure(keys.identifier, now);
}

export function clearSuccessfulLoginAttempt(keys: ReturnType<typeof loginAttemptKeys>) {
  // Mantemos o contador agregado por IP para não enfraquecer a proteção contra pulverização de senhas.
  failures.delete(keys.identifier);
}

export function loginRetryAfterSeconds(keys: ReturnType<typeof loginAttemptKeys>, now = Date.now()) {
  const records = [readRecord(keys.ip, now), readRecord(keys.identifier, now)].filter((record): record is FailureRecord => Boolean(record));
  const resetAt = records.reduce((latest, record) => Math.max(latest, record.windowStartedAt + LOGIN_WINDOW_MS), now);
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function resetLoginRateLimitForTests() {
  failures.clear();
}

export const loginRateLimitPolicy = {
  windowMs: LOGIN_WINDOW_MS,
  ipMaxFailures: LOGIN_IP_MAX_FAILURES,
  identifierMaxFailures: LOGIN_IDENTIFIER_MAX_FAILURES,
} as const;
