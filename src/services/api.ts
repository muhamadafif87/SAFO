import { storage } from "@/utils/storage";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ── Config ────────────────────────────────────────────────────────────────
const DEV_API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web"
    ? "http://localhost:3000/api"
    : `http://${Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost"}:3000/api`);

const BASE_URL = __DEV__ ? DEV_API_URL : "https://api.safo.app/api";

const TOKEN_KEY_ACCESS = "safo_access_token";
const TOKEN_KEY_REFRESH = "safo_refresh_token";

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

    // Do not attempt to refresh if the 401 error is from login or register endpoints
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register");

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

        const newAccessToken: string = data.data.accessToken;
        await storage.setItemAsync(TOKEN_KEY_ACCESS, newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear tokens — session expired
        await storage.deleteItemAsync(TOKEN_KEY_ACCESS);
        await storage.deleteItemAsync(TOKEN_KEY_REFRESH);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
