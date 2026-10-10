/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API lives. Defaults to the same-origin path "/api". */
  readonly VITE_API_URL?: string;
  /** Set to "mock" to run on canned data instead of the API. Development and tests only. */
  readonly VITE_CLIENT?: string;
}
