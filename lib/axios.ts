import axios, { type InternalAxiosRequestConfig } from "axios";

import { waitForClientAuthSync } from "@/lib/clientAuthSync";

const SESSION_RETRY_DELAYS_MS = [150, 300, 450] as const;

type SessionRetryConfig = InternalAxiosRequestConfig & {
  _sessionRetryCount?: number;
  _skipSessionRetry?: boolean;
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  await waitForClientAuthSync();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const config = error.config as SessionRetryConfig | undefined;
    const status = error.response?.status;

    if (!config || config._skipSessionRetry || status !== 401) {
      return Promise.reject(error);
    }

    const retryCount = config._sessionRetryCount ?? 0;
    const delay = SESSION_RETRY_DELAYS_MS[retryCount];

    if (delay === undefined) {
      return Promise.reject(error);
    }

    config._sessionRetryCount = retryCount + 1;
    await wait(delay);
    return api.request(config);
  },
);

export default api;
