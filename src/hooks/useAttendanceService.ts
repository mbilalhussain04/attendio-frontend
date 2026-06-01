import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

const queryString = (params: Record<string, string | number | boolean | null | undefined> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            search.set(key, String(value));
        }
    });
    const value = search.toString();
    return value ? `?${value}` : "";
};

export const useCheckInMutation = () => useMutation({
    mutationFn: (data = {}) => authService.postData("/attendance/check-in", data),
});

export const useCheckOutMutation = () => useMutation({
    mutationFn: (data = {}) => authService.postData("/attendance/check-out", data),
});

export const useStartBreakMutation = () => useMutation({
    mutationFn: (data = { source: "web" }) => authService.postData("/attendance/breaks/start", data),
});

export const useEndBreakMutation = () => useMutation({
    mutationFn: (data = {}) => authService.postData("/attendance/breaks/end", data),
});

export const useTodayAttendanceQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "me", "today"],
    queryFn: () => authService.fetchData("/attendance/me/today"),
    enabled,
    retry: false,
});

export const useOpenAttendanceQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "me", "open"],
    queryFn: () => authService.fetchData("/attendance/me/open"),
    enabled,
    retry: false,
});

export const useMyTimesheetQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "me", "timesheet", params],
    queryFn: () => authService.fetchData(`/attendance/me/timesheet${queryString(params)}`),
    enabled,
    retry: false,
});

export const useEmployeeTimesheetQuery = (userId: string | undefined, params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "users", userId, "timesheet", params],
    queryFn: () => authService.fetchData(`/attendance/users/${userId}/timesheet${queryString(params)}`),
    enabled: enabled && Boolean(userId),
    retry: false,
});

export const useAttendanceDashboardQuery = (params: { date?: string; branch_id?: string } = {}, enabled = true) => useQuery({
    queryKey: ["attendance", "dashboard", params],
    queryFn: () => authService.fetchData(`/attendance/dashboard${queryString(params)}`),
    enabled,
    retry: false,
});

export const useWhoIsInQuery = (params: { branch_id?: string } = {}, enabled = true) => useQuery({
    queryKey: ["attendance", "who-is-in", params],
    queryFn: () => authService.fetchData(`/attendance/who-is-in${queryString(params)}`),
    enabled,
    retry: false,
});

export const useDailySummaryQuery = (params: { date?: string; branch_id?: string } = {}, enabled = true) => useQuery({
    queryKey: ["attendance", "summary", "daily", params],
    queryFn: () => authService.fetchData(`/attendance/summary/daily${queryString(params)}`),
    enabled,
    retry: false,
});

export const useWeeklyReportQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "weekly", params],
    queryFn: () => authService.fetchData(`/attendance/reports/weekly${queryString(params)}`),
    enabled,
    retry: false,
});

export const useMonthlyReportQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "monthly", params],
    queryFn: () => authService.fetchData(`/attendance/reports/monthly${queryString(params)}`),
    enabled,
    retry: false,
});

export const useOvertimeReportQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "overtime", params],
    queryFn: () => authService.fetchData(`/attendance/reports/overtime${queryString(params)}`),
    enabled,
    retry: false,
});

export const useAbsenceAnalysisQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "absence", params],
    queryFn: () => authService.fetchData(`/attendance/reports/absence-analysis${queryString(params)}`),
    enabled,
    retry: false,
});

export const useBranchComparisonQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "branch-comparison", params],
    queryFn: () => authService.fetchData(`/attendance/reports/branch-comparison${queryString(params)}`),
    enabled,
    retry: false,
});

export const useShiftVarianceQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "shift-variance", params],
    queryFn: () => authService.fetchData(`/attendance/reports/shift-variance${queryString(params)}`),
    enabled,
    retry: false,
});

export const useAnomalyReportQuery = (params: { from?: string; to?: string }, enabled = true) => useQuery({
    queryKey: ["attendance", "reports", "anomalies", params],
    queryFn: () => authService.fetchData(`/attendance/reports/anomalies${queryString(params)}`),
    enabled,
    retry: false,
});

export const useAttendanceExportJobsQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "exports"],
    queryFn: () => authService.fetchData("/attendance/exports"),
    enabled,
    retry: false,
});

export const useQueueAttendanceExportMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/exports", data),
});

export const useAttendanceAuditLogsQuery = (limit = 100, enabled = true) => useQuery({
    queryKey: ["attendance", "audit-logs", limit],
    queryFn: () => authService.fetchData(`/attendance/audit-logs${queryString({ limit })}`),
    enabled,
    retry: false,
});

export const useAttendancePolicyQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "policy"],
    queryFn: () => authService.fetchData("/attendance/policy"),
    enabled,
    retry: false,
});

export const useUpdateAttendancePolicyMutation = () => useMutation({
    mutationFn: (data) => authService.updateData("/attendance/policy", data),
});

export const useHolidaysQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "holidays"],
    queryFn: () => authService.fetchData("/attendance/holidays"),
    enabled,
    retry: false,
});

export const useCreateHolidayMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/holidays", data),
});

export const useUpdateHolidayMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/attendance/holidays/${id}`, data),
});

export const useDeleteHolidayMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/attendance/holidays/${id}`),
});

export const useImportHolidaysMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/holidays/import", data),
});

export const useGeofencesQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "geofences"],
    queryFn: () => authService.fetchData("/attendance/geofences"),
    enabled,
    retry: false,
});

export const useCreateGeofenceMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/geofences", data),
});

export const useUpdateGeofenceMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/attendance/geofences/${id}`, data),
});

export const useDeleteGeofenceMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/attendance/geofences/${id}`),
});

export const useShiftsQuery = (params: { user_id?: string } = {}, enabled = true) => useQuery({
    queryKey: ["attendance", "shifts", params],
    queryFn: () => authService.fetchData(`/attendance/shifts${queryString(params)}`),
    enabled,
    retry: false,
});

export const useCreateShiftMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/shifts", data),
});

export const useUpdateShiftMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/attendance/shifts/${id}`, data),
});

export const useDeleteShiftMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/attendance/shifts/${id}`),
});

export const useKioskDevicesQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "kiosk", "devices"],
    queryFn: () => authService.fetchData("/attendance/kiosk/devices"),
    enabled,
    retry: false,
});

export const useCreateKioskDeviceMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/kiosk/devices", data),
});

export const useUpdateKioskDeviceMutation = () => useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.updateData(`/attendance/kiosk/devices/${id}`, data),
});

export const useDeleteKioskDeviceMutation = () => useMutation({
    mutationFn: (id: string) => authService.deleteData(`/attendance/kiosk/devices/${id}`),
});

export const useManualAttendanceEntryMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/entries/manual", data),
});

export const useCreateSelfManualEntryMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/me/entries/manual", data),
});

export const useResetMyAttendanceDateMutation = () => useMutation({
    mutationFn: (data: { target_date: string }) => authService.postData("/attendance/me/entries/reset", data),
});

export const useMyAttendanceCorrectionsQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "corrections", "me"],
    queryFn: () => authService.fetchData("/attendance/corrections/me"),
    enabled,
    retry: false,
});

export const usePendingAttendanceCorrectionsQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "corrections", "pending"],
    queryFn: () => authService.fetchData("/attendance/corrections/pending"),
    enabled,
    retry: false,
});

export const usePendingAttendanceSubmissionsQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "submissions", "pending"],
    queryFn: () => authService.fetchData("/attendance/submissions/pending"),
    enabled,
    retry: false,
});

export const useReviewAttendanceSubmissionMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/submissions/review", data),
});

export const useRequestAttendanceCorrectionMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/corrections", data),
});

export const useReviewAttendanceCorrectionMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/corrections/review", data),
});

export const useBulkReviewAttendanceCorrectionsMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/corrections/review/bulk", data),
});

export const useLockPeriodMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/locks", data),
});

export const useAttendanceLocksQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "locks"],
    queryFn: () => authService.fetchData("/attendance/locks"),
    enabled,
    retry: false,
});

export const useUnlockPeriodMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/locks/unlock", data),
});

export const useAttendanceNotificationsQuery = (enabled = true) => useQuery({
    queryKey: ["attendance", "notifications"],
    queryFn: () => authService.fetchData("/attendance/notifications"),
    enabled,
    retry: false,
});

export const useKioskCheckInMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/kiosk/check-in", data),
});

export const useQueueOfflineSyncMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/offline-sync", data),
});

export const useProcessOfflineSyncMutation = () => useMutation({
    mutationFn: (data) => authService.postData("/attendance/offline-sync/process", data),
});

export const useImportAttendanceEntriesMutation = () => useMutation({
    mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return authService.postData("/attendance/imports/entries/csv", formData);
    },
});
