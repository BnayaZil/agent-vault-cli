import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { logAuditEvent } from './audit.js';

const RATE_LIMIT_DIR = join(homedir(), '.agent-vault');
const RATE_LIMIT_FILE = join(RATE_LIMIT_DIR, '.ratelimit');

// Rate limit configuration (relaxed for testing)
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const MAX_ATTEMPTS = IS_TEST ? 1000 : 5;
const WINDOW_MS = IS_TEST ? 60 * 1000 : 60 * 1000; // 1 minute window
const LOCKOUT_MS = IS_TEST ? 1000 : 5 * 60 * 1000; // 5 minute lockout after exceeding (or 1s in tests)

interface RateLimitState {
  attempts: number[];
  lockedUntil?: number;
}

async function ensureRateLimitDir(): Promise<void> {
  await mkdir(RATE_LIMIT_DIR, { recursive: true, mode: 0o700 });
}

async function loadRateLimitState(): Promise<RateLimitState> {
  try {
    const data = await readFile(RATE_LIMIT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { attempts: [] };
  }
}

async function saveRateLimitState(state: RateLimitState): Promise<void> {
  await ensureRateLimitDir();
  await writeFile(RATE_LIMIT_FILE, JSON.stringify(state), { mode: 0o600 });
}

/**
 * Check if an operation is rate limited.
 * Returns true if allowed, throws if rate limited.
 */
export async function checkRateLimit(operation: string): Promise<void> {
  const now = Date.now();
  const state = await loadRateLimitState();

  // Check if currently locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    await logAuditEvent('rate_limit_exceeded', {
      details: `Operation: ${operation}, locked for ${remainingSeconds}s`,
      success: false,
    });
    throw new Error(
      `Rate limit exceeded. Please wait ${remainingSeconds} seconds before trying again.`
    );
  }

  // Clear lockout if expired
  if (state.lockedUntil && now >= state.lockedUntil) {
    state.lockedUntil = undefined;
    state.attempts = [];
  }

  // Filter attempts within the window
  state.attempts = state.attempts.filter((ts) => now - ts < WINDOW_MS);

  // Check if exceeding limit
  if (state.attempts.length >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    await saveRateLimitState(state);
    await logAuditEvent('rate_limit_exceeded', {
      details: `Operation: ${operation}, lockout initiated`,
      success: false,
    });
    throw new Error(
      `Too many attempts. Please wait ${Math.ceil(LOCKOUT_MS / 1000)} seconds before trying again.`
    );
  }

  // Record this attempt
  state.attempts.push(now);
  await saveRateLimitState(state);
}

/**
 * Reset rate limit state (for testing or admin purposes)
 */
export async function resetRateLimit(): Promise<void> {
  await saveRateLimitState({ attempts: [] });
}
