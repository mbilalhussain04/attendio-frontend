import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

const employeeQueryPath = (params: Record<string, unknown> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
    });
    const query = search.toString();
    return `/employees${query ? `?${query}` : ""}`;
};

export const useEmployeesQuery = (enabledOrParams: boolean | Record<string, unknown> = true, maybeParams: Record<string, unknown> = {}) => {
    const enabled = typeof enabledOrParams === "boolean" ? enabledOrParams : true;
    const params = typeof enabledOrParams === "boolean" ? maybeParams : enabledOrParams;
    return useQuery({
    queryKey: ["auth", "employees", params],
    queryFn: () => authService.fetchData(employeeQueryPath(params)),
    enabled,
    retry: false,
});
};

export const useEmployeeQuery = (userId?: string, enabled = true) => useQuery({
    queryKey: ["auth", "employees", userId],
    queryFn: () => authService.fetchData(`/employees/${userId}`),
    enabled: enabled && Boolean(userId),
    retry: false,
});

export const useOrganizationQuery = (enabledOrParams: boolean | Record<string, unknown> = true, maybeParams: Record<string, unknown> = {}) => {
    const enabled = typeof enabledOrParams === "boolean" ? enabledOrParams : true;
    const params = typeof enabledOrParams === "boolean" ? maybeParams : enabledOrParams;
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
    });
    const query = search.toString();
    return useQuery({
        queryKey: ["auth", "organization", params],
        queryFn: () => authService.fetchData(`/employees/organization${query ? `?${query}` : ""}`),
        enabled,
        retry: false,
    });
};

export const useCreateEmployeeMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/employees", data),
});

export const useUpdateEmployeeMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.patchData(`/employees/${id}`, data),
});

export const useUpdateEmployeeStatusMutation = () => useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => authService.postData(`/employees/${id}/status`, { status }),
});

export const useDeleteEmployeeMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/employees/${id}`),
});

export const useBulkCreateEmployeesMutation = () => useMutation({
    mutationFn: (users) => authService.postData("/employees/bulk", { users }),
});

export const useImportEmployeesMutation = () => useMutation({
    mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return authService.postData("/employees/import", formData);
    },
});
