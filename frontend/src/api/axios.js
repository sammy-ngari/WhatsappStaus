import axios from 'axios';

// Centralized HTTP client used by the React app.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
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

export default api;
