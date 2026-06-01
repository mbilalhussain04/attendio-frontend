import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

const queryString = (params: Record<string, unknown> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
    });
    const value = search.toString();
    return value ? `?${value}` : "";
};

export const useShiftTemplatesQuery = (enabled = true) => useQuery({
    queryKey: ["scheduling", "shifts"],
    queryFn: () => authService.fetchData("/scheduling/shifts"),
    enabled,
    retry: false,
});

export const useSaveShiftTemplateMutation = () => useMutation({
    mutationFn: (data: unknown) => authService.postData("/scheduling/shifts", data),
});

export const useDeleteShiftTemplateMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/scheduling/shifts/${id}`),
});

export const useRosterTemplatesQuery = (enabled = true) => useQuery({
    queryKey: ["scheduling", "rosters"],
    queryFn: () => authService.fetchData("/scheduling/rosters"),
    enabled,
    retry: false,
});

export const useSaveRosterTemplateMutation = () => useMutation({
    mutationFn: (data: unknown) => authService.postData("/scheduling/rosters", data),
});

export const useScheduleAssignmentsQuery = (params: Record<string, unknown> = {}, enabled = true) => useQuery({
    queryKey: ["scheduling", "assignments", params],
    queryFn: () => authService.fetchData(`/scheduling/assignments${queryString(params)}`),
    enabled,
    retry: false,
});

export const useSaveScheduleAssignmentMutation = () => useMutation({
    mutationFn: (data: unknown) => authService.postData("/scheduling/assignments", data),
});

export const useDeleteScheduleAssignmentMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/scheduling/assignments/${id}`),
});
