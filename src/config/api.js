export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8090/api/v1";

export const apiUrl = (path = "") => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

