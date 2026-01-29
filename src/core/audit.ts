import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const AUDIT_DIR = join(homedir(), '.agent-vault');
const AUDIT_FILE = join(AUDIT_DIR, 'audit.log');

export type AuditEvent =
  | 'credential_stored'
  | 'credential_retrieved'
  | 'credential_deleted'
  | 'login_filled'
  | 'config_changed'
  | 'rate_limit_exceeded';

interface AuditEntry {
  timestamp: string;
  event: AuditEvent;
  origin?: string;
  details?: string;
  success: boolean;
}

async function ensureAuditDir(): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Log an audit event to the audit log file.
 * Never includes sensitive data like passwords or usernames.
 */
export async function logAuditEvent(
  event: AuditEvent,
  options: { origin?: string; details?: string; success?: boolean } = {}
): Promise<void> {
  try {
    await ensureAuditDir();

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      event,
      origin: options.origin,
      details: options.details,
      success: options.success ?? true,
    };

    const line = JSON.stringify(entry) + '\n';
    await appendFile(AUDIT_FILE, line, { mode: 0o600 });
  } catch {
    // Silently fail - audit logging should never break the main flow
  }
}

/**
 * Get the audit log file path (for admin/debug purposes)
 */
export function getAuditLogPath(): string {
  return AUDIT_FILE;
}
