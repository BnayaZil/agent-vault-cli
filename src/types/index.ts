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
  browser: import('playwright').Browser;
  page: import('playwright').Page;
}
