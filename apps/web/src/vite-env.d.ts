/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the browser sends API calls. Defaults to "/api", which the host proxies to apps/api. */
  readonly VITE_API_URL?: string;
  /** "true" serves the built-in sample trips instead of calling the API. Never set in production. */
  readonly VITE_USE_MOCK?: string;
}
