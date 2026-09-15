/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DAESO_LIVE_AID_TOKEN?: string;
  readonly VITE_USE_API_PROXY?: string;
  readonly VITE_HTTP_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}
