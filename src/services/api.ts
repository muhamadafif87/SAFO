import { storage } from "@/utils/storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ── Config ────────────────────────────────────────────────────────────────
const getDevApiUrl = () => {
  if (Platform.OS !== "web") {
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host && host !== "localhost") {
      return `http://${host}:3000/api`;
    }
  }
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
};

const DEV_API_URL = getDevApiUrl();

const BASE_URL = __DEV__ ? DEV_API_URL : "https://api.safo.app/api";

const TOKEN_KEY_ACCESS = "safo_access_token";
const TOKEN_KEY_REFRESH = "safo_refresh_token";

// ── Session Expired Callback ──────────────────────────────────────────────
// Didaftarkan oleh _layout.tsx saat mount agar interceptor bisa memicu
// clearAuth() + navigasi ke /login tanpa circular import ke Zustand/Router.
type SessionExpiredCallback = () => void;
let _onSessionExpired: SessionExpiredCallback | null = null;
let _isSessionExpiredHandled = false;

export function setSessionExpiredCallback(cb: SessionExpiredCallback): void {
  _onSessionExpired = cb;
}

export function resetSessionExpiredFlag(): void {
  _isSessionExpiredHandled = false;
}

function triggerSessionExpired(): void {
  if (_isSessionExpiredHandled) return;
  _isSessionExpiredHandled = true;
  if (_onSessionExpired) {
    _onSessionExpired();
  }
}

// ── Axios Instance ────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "id",
  },
});

// ── Request Interceptor — Attach JWT ──────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItemAsync(TOKEN_KEY_ACCESS);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor — Auto Refresh Token ─────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Do not attempt to refresh if the 401 error is from auth lifecycle endpoints
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItemAsync(TOKEN_KEY_REFRESH);
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken: string | undefined =
          data.tokens?.accessToken ?? data.data?.accessToken ?? data.accessToken;
        const newRefreshToken: string | undefined =
          data.tokens?.refreshToken ?? data.data?.refreshToken ?? data.refreshToken;

        if (!newAccessToken) {
          throw new Error("Invalid token refresh payload structure");
        }

        await storage.setItemAsync(TOKEN_KEY_ACCESS, newAccessToken);
        if (newRefreshToken) {
          await storage.setItemAsync(TOKEN_KEY_REFRESH, newRefreshToken);
        }

        _isSessionExpiredHandled = false;
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens — session expired
        await storage.deleteItemAsync(TOKEN_KEY_ACCESS);
        await storage.deleteItemAsync(TOKEN_KEY_REFRESH);
        // Notify app to clear auth state and redirect to login
        triggerSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;