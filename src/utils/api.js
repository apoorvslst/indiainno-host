import axios from 'axios';

const FALLBACK_LOCAL_API = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 12000,
});

// Add a request interceptor to append the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// If proxy/local dev routing fails, retry once against localhost backend directly.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
        const originalRequest = error.config;

        if (isNetworkError && originalRequest && !originalRequest.__retriedWithLocalFallback) {
            originalRequest.__retriedWithLocalFallback = true;
            originalRequest.baseURL = import.meta.env.VITE_FALLBACK_API_BASE_URL || FALLBACK_LOCAL_API;
            return api.request(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default api;
