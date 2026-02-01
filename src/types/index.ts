export interface Selectors {
  username: string;
  password: string;
  submit?: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface RPConfig {
  origin: string;
  selectors: Selectors;
  credentials: Credentials;
}

export interface BrowserConnection {
  browser: import('playwright-chromium').Browser;
  page: import('playwright-chromium').Page;
}

export interface VaultConfig {
  defaultUsername?: string;
  /** Allow HTTP origins (insecure - not recommended) */
  allowHttp?: string;
  /** Comma-separated list of allowed CDP hostnames */
  cdpAllowlist?: string;
}

export type ConfigKey = keyof VaultConfig;

// API Credential types (for vault curl and register-api commands)
export interface APICredential {
  name: string;              // e.g., "personal-token", "ci-token" (MUST be unique per origin)
  description?: string;      // User-friendly description
  token: string;             // The actual secret
  createdAt: string;         // ISO timestamp
  lastUsedAt?: string;       // ISO timestamp
}

export interface APICredentials {
  origin: string;
  credentials: APICredential[];  // names must be unique within this array
  defaultCredential?: string;    // Name of default credential
}
