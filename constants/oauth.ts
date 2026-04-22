import * as ReactNative from "react-native";

const env = {
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
};
export const APP_ID = env.appId;
export const API_BASE_URL = env.apiBaseUrl;

declare global {
  interface Window {
    __ALETHEIA_API_BASE_URL__?: string;
  }
}

function deriveWebApiBaseUrl(): string {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }

  if (typeof window.__ALETHEIA_API_BASE_URL__ === "string" && window.__ALETHEIA_API_BASE_URL__) {
    return window.__ALETHEIA_API_BASE_URL__.replace(/\/$/, "");
  }

  const { protocol, hostname, port } = window.location;
  const normalizedHostname = hostname.trim();
  const normalizedPort = port.trim();

  if (normalizedHostname === "localhost" || normalizedHostname === "127.0.0.1") {
    const localPortMap: Record<string, string> = {
      "8081": "3000",
      "18081": "13000",
    };
    const apiPort = localPortMap[normalizedPort];
    if (apiPort) {
      return `${protocol}//${normalizedHostname}:${apiPort}`;
    }
  }

  const sandboxPortMap: Record<string, string> = {
    "8081": "3000",
    "18081": "13000",
  };

  for (const [webPort, apiPort] of Object.entries(sandboxPortMap)) {
    const apiHostname = normalizedHostname.replace(new RegExp(`^${webPort}-`), `${apiPort}-`);
    if (apiHostname !== normalizedHostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  return "";
}

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  if (ReactNative.Platform.OS === "web") {
    const runtimeUrl = deriveWebApiBaseUrl();
    if (runtimeUrl) {
      return runtimeUrl;
    }
  }

  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";
