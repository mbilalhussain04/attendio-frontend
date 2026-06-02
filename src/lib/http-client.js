import { apiUrl } from "../config/api";

let refreshPromise = null;

const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const errorMessageFrom = (data) => {
    const detail = data?.detail;
    if (Array.isArray(detail)) {
        return detail.map((item) => item?.msg || item?.message || String(item)).join(". ");
    }
    if (detail && typeof detail === "object") {
        return detail.msg || detail.message || "Request failed";
    }
    return detail || data?.message || (typeof data === "string" ? data : "Request failed");
};

const buildRequest = (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return {
        url: apiUrl(path),
        init: {
            ...options,
            headers,
            credentials: "include",
        },
    };
};

const refreshAccessToken = async () => {
    if (!refreshPromise) {
        const { url, init } = buildRequest("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({}),
        });
        refreshPromise = fetch(url, init)
            .then(async (response) => {
                const data = await parseJson(response);
                if (!response.ok) {
                    throw new Error(data?.detail || data?.message || "Session refresh failed");
                }
                return true;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

const shouldForceLogoutOnUnauthorized = (path) => {
    if (path.startsWith("/billing/")) {
        return false;
    }
    return path === "/auth/me" || path === "/auth/refresh";
};

const request = async (path, options = {}, retryOnUnauthorized = true) => {
    const { url, init } = buildRequest(path, options);

    const response = await fetch(url, init);
    const data = await parseJson(response);

    if (!response.ok) {
        if (response.status === 401 && retryOnUnauthorized && path !== "/auth/refresh") {
            try {
                await refreshAccessToken();
                return request(path, options, false);
            } catch {
                if (shouldForceLogoutOnUnauthorized(path)) {
                    window.dispatchEvent(new Event("force-logout"));
                }
            }
        }
        const message = errorMessageFrom(data);
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        if (response.status === 401 && shouldForceLogoutOnUnauthorized(path)) {
            window.dispatchEvent(new Event("force-logout"));
        }
        throw error;
    }

    return data;
};

export const apiClient = {
    get: (path) => request(path),
    post: (path, body) =>
        request(path, {
            method: "POST",
            body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
        }),
    put: (path, body) =>
        request(path, {
            method: "PUT",
            body: JSON.stringify(body ?? {}),
        }),
    patch: (path, body) =>
        request(path, {
            method: "PATCH",
            body: JSON.stringify(body ?? {}),
        }),
    delete: (path, body) =>
        request(path, {
            method: "DELETE",
            body: body ? JSON.stringify(body) : undefined,
        }),
    rawUrl: apiUrl,
};
