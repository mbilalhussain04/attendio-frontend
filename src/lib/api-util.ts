import { apiClient } from "./http-client";

const createApiHelpers = (client: typeof apiClient) => ({
    postData: async <T>(url: string, data?: unknown): Promise<T> => {
        return client.post(url, data);
    },
    fetchData: async <T>(url: string): Promise<T> => {
        return client.get(url);
    },
    updateData: async <T>(url: string, data: unknown): Promise<T> => {
        return client.put(url, data);
    },
    deleteData: async <T>(url: string, data?: unknown): Promise<T> => {
        return client.delete(url, data);
    },
    patchData: async <T>(url: string, data: unknown): Promise<T> => {
        return client.patch(url, data);
    },
});

export const authService = createApiHelpers(apiClient);
