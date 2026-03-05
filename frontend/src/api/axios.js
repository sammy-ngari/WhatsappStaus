import axios from 'axios';

/**
 * Frontend HTTP client and auth-specific request helpers.
 * Responsibilities:
 * - provide one axios instance with shared base URL/credentials
 * - perform one-time token refresh retries for protected endpoints
 * - expose explicit auth API methods for maintainable call sites
 * Security considerations:
 * - uses `withCredentials` so HttpOnly auth cookies are sent safely by the browser
 * - avoids retry loops on auth endpoints to reduce attack and failure amplification
 */

/**
 * Resolves backend base URL with localhost/127.0.0.1 hostname alignment.
 * This avoids cookie/site mismatches when frontend is opened via a different loopback hostname than API config.
 *
 * @returns {string} Resolved API base URL.
 */
const resolveApiBaseUrl = () => {
  const browserHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const configuredApiUrl = process.env.REACT_APP_API_URL;

  if (!configuredApiUrl) {
    return `http://${browserHostname}:3000`;
  }

  try {
    const parsedUrl = new URL(configuredApiUrl);
    const isLoopbackConfig = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    const isLoopbackBrowser = browserHostname === 'localhost' || browserHostname === '127.0.0.1';

    if (isLoopbackConfig && isLoopbackBrowser && parsedUrl.hostname !== browserHostname) {
      parsedUrl.hostname = browserHostname;
      return parsedUrl.toString().replace(/\/$/, '');
    }
  } catch (_error) {
    // Keep configured value untouched if URL parsing fails.
  }

  return configuredApiUrl;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let inFlightRefresh = null;

// Refresh access token once on 401, then retry the original request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const statusCode = error?.response?.status;
    const requestUrl = String(originalRequest.url || '');

    const isAuthEndpoint =
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/signup') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (statusCode === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!inFlightRefresh) {
        inFlightRefresh = api
          .post('/auth/refresh')
          .finally(() => {
            inFlightRefresh = null;
          });
      }

      await inFlightRefresh;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

/**
 * Registers a new account via flow-aware auth endpoint.
 *
 * @param {{
 *   flow: "affiliate" | "advertiser",
 *   email: string,
 *   password: string,
 *   firstname: string,
 *   othernames?: string
 * }} data - Registration payload expected by backend validation.
 * @returns {Promise<import("axios").AxiosResponse>} Backend registration response.
 */
export const register = (data) => api.post('/auth/register', data);

api.register = register;

export default api;
