import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

const qs = (params: Record<string, string | number | undefined | null> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
    });
    return search.toString() ? `?${search}` : "";
};

export const useLeaveTypesQuery = (includeInactive = false, enabled = true) => useQuery({
    queryKey: ["leave", "types", includeInactive],
    queryFn: () => authService.fetchData(`/leave/types${qs({ include_inactive: includeInactive })}`),
    enabled,
    retry: false,
});

export const useCreateLeaveTypeMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/leave/types", data),
});

export const useUpdateLeaveTypeMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/leave/types/${id}`, data),
});

export const useDeleteLeaveTypeMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/leave/types/${id}`),
});

export const useLeaveEntitlementPoliciesQuery = (enabled = true) => useQuery({
    queryKey: ["leave", "entitlement-policies"],
    queryFn: () => authService.fetchData("/leave/entitlement-policies"),
    enabled,
    retry: false,
});

export const useCreateLeaveEntitlementPolicyMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/leave/entitlement-policies", data),
});

export const useUpdateLeaveEntitlementPolicyMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/leave/entitlement-policies/${id}`, data),
});

export const useDeleteLeaveEntitlementPolicyMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/leave/entitlement-policies/${id}`),
});

export const useLeaveEntitlementGrantsQuery = (params: { user_id?: string; year?: number | string } = {}, enabled = true) => useQuery({
    queryKey: ["leave", "entitlement-grants", params],
    queryFn: () => authService.fetchData(`/leave/entitlement-grants${qs(params)}`),
    enabled,
    retry: false,
});

export const useCreateLeaveEntitlementGrantMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/leave/entitlement-grants", data),
});

export const useUpdateLeaveEntitlementGrantMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/leave/entitlement-grants/${id}`, data),
});

export const useDeleteLeaveEntitlementGrantMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/leave/entitlement-grants/${id}`),
});

export const useLeavePolicyQuery = (enabled = true) => useQuery({
    queryKey: ["leave", "policy"],
    queryFn: () => authService.fetchData("/leave/policy"),
    enabled,
    retry: false,
});

export const useUpdateLeavePolicyMutation = () => useMutation({
    mutationFn: (data) => authService.updateData("/leave/policy", data),
});

export const useMyLeaveRequestsQuery = (params: { year?: number | string; status?: string } = {}, enabled = true) => useQuery({
    queryKey: ["leave", "me", "requests", params],
    queryFn: () => authService.fetchData(`/leave/me/requests${qs(params)}`),
    enabled,
    retry: false,
});

export const useMyLeaveBalanceQuery = (year: number | string, enabled = true) => useQuery({
    queryKey: ["leave", "me", "balance", year],
    queryFn: () => authService.fetchData(`/leave/me/balance${qs({ year })}`),
    enabled,
    retry: false,
});

export const useCreateLeaveRequestMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/leave/me/requests", data),
});

export const useCancelLeaveRequestMutation = () => useMutation({
    mutationFn: (requestId: string) => authService.postData(`/leave/me/requests/${requestId}/cancel`, {}),
});

export const useCompanyLeaveRequestsQuery = (params: { year?: number | string; status?: string } = {}, enabled = true) => useQuery({
    queryKey: ["leave", "requests", params],
    queryFn: () => authService.fetchData(`/leave/requests${qs(params)}`),
    enabled,
    retry: false,
});

export const useReviewLeaveRequestMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; note?: string } }) => authService.postData(`/leave/requests/${id}/review`, data),
});
