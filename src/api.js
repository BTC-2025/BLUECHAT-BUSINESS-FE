import axios from "axios";

// Dynamic backend URL based on environment
export const BASE_URL = window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : "https://api.bluechat.in";

export const API_BASE = `${BASE_URL}/api`;

export const api = axios.create({
    baseURL: API_BASE,
});

// Attach token on login/register OR page reload
export const setAuth = (token) => {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};
