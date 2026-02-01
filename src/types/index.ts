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
