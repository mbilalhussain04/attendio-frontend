import { authService } from "../lib/api-util";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useSignUpMutation = () => {
    return useMutation({
        mutationFn: (data) => authService.postData("/auth/bootstrap-company", data),
    });
};

export const useVerifyEmailMutation = () => {
    return useMutation({
        mutationFn: (data: { token: string }) =>
            authService.postData("/auth/verify-email", data),
    });
};

export const useResendVerificationEmailMutation = () => {
    return useMutation({
        mutationFn: (data: { token: string }) =>
            authService.postData("/auth/verify-email/resend", data),
    });
};

export const useLoginMutation = () => {
    return useMutation({
        mutationFn: (data: { email: string; password: string; mfa_token?: string; tenant_slug?: string }) =>
            authService.postData("/auth/login", data),
    });
};

export const useMeQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "me"],
        queryFn: () => authService.fetchData("/auth/me"),
        enabled,
        retry: false,
    });
};

export const useUpdateProfileMutation = () => {
    return useMutation({
        mutationFn: (data: { profile_picture_url?: string | null; first_name?: string; last_name?: string; phone?: string; country?: string; city?: string; language?: string; notification_preferences?: Record<string, boolean> }) =>
            authService.patchData("/auth/profile", data),
    });
};

export const useChangePasswordMutation = () => {
    return useMutation({
        mutationFn: (data: { old_password: string; new_password: string; revoke_other_sessions?: boolean }) =>
            authService.postData("/auth/change-password", data),
    });
};

export const useDeleteStoredFileMutation = () => {
    return useMutation({
        mutationFn: (objectKey: string) => authService.deleteData(`/storage/files/${objectKey}`),
    });
};

export const useUploadFileMutation = () => {
    return useMutation({
        mutationFn: ({ file, module, category }: { file: File; module: string; category: string }) => {
            const formData = new FormData();
            formData.append("file", file);
            return authService.postData(`/storage/upload?module=${module}&category=${category}`, formData);
        },
    });
};

export const useLogoutMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/logout", {}),
    });
};

export const useForgotPasswordMutation = () => {
    return useMutation({
        mutationFn: (data: { email: string }) =>
            authService.postData("/auth/forgot-password", data),
    });
};

export const useResetPasswordMutation = () => {
    return useMutation({
        mutationFn: (data: {
            token: string;
            password: string;
        }) => authService.postData("/auth/reset-password", data),
    });
};

export const useSsoDiscoverMutation = () => {
    return useMutation({
        mutationFn: (data: { email: string }) =>
            authService.postData("/auth/sso/discover", data),
    });
};

export const useRefreshMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/refresh", {}),
    });
};

export const useHealthQuery = () => {
    return useQuery({
        queryKey: ["auth", "health"],
        queryFn: () => authService.fetchData("/health"),
        retry: false,
    });
};

export const useBranchesQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "branches"],
        queryFn: () => authService.fetchData("/branches"),
        enabled,
        retry: false,
    });
};

export const useCompanySettingsQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "company-settings"],
        queryFn: () => authService.fetchData("/company-settings"),
        enabled,
        retry: false,
    });
};

export const useIntegrationConfigStatusQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "integrations", "config-status"],
        queryFn: () => authService.fetchData("/auth/integrations/config-status"),
        enabled,
        retry: false,
    });
};

export const useUpdateCompanySettingsMutation = () => {
    return useMutation({
        mutationFn: (data: { name?: string; legal_name?: string; logo_url?: string | null; company_size?: string; industry?: string; registration_number?: string; vat_id?: string; address_line?: string; country?: string; city?: string; timezone?: string; website?: string; language?: string; operating_model?: string; onboarding_completed?: boolean; enabled_modules?: string[]; terminology?: Record<string, string>; integrations?: Record<string, Record<string, unknown>> }) =>
            authService.patchData("/company-settings", data),
    });
};

export const useSaveBranchMutation = () => {
    return useMutation({
        mutationFn: (data: { id?: string; name: string; city?: string; country?: string; timezone?: string; status?: string }) =>
            authService.postData("/branches", data),
    });
};

export const useDeleteBranchMutation = () => {
    return useMutation({
        mutationFn: (id: string) => authService.deleteData(`/branches/${id}`),
    });
};

const projectQueryPath = (params: Record<string, unknown> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
    });
    const query = search.toString();
    return `/projects${query ? `?${query}` : ""}`;
};

export const useProjectsQuery = (enabledOrParams: boolean | Record<string, unknown> = true, maybeParams: Record<string, unknown> = {}) => {
    const enabled = typeof enabledOrParams === "boolean" ? enabledOrParams : true;
    const params = typeof enabledOrParams === "boolean" ? maybeParams : enabledOrParams;
    return useQuery({
        queryKey: ["auth", "projects", params],
        queryFn: () => authService.fetchData(projectQueryPath(params)),
        enabled,
        retry: false,
    });
};

export const useSaveProjectMutation = () => {
    return useMutation({
        mutationFn: (data: { id?: string; name: string; code?: string; client?: string; branch_id?: string; status?: string; start_date?: string; end_date?: string }) =>
            authService.postData("/projects", data),
    });
};

export const useDeleteProjectMutation = () => {
    return useMutation({
        mutationFn: (id: string) => authService.deleteData(`/projects/${id}`),
    });
};

export const useKioskLoginMutation = () => {
    return useMutation({
        mutationFn: (data: { employee_code: string; pin: string; tenant_slug?: string }) =>
            authService.postData("/kiosk/login", data),
    });
};

export const useRequestEmailVerificationMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/email/verification", {}),
    });
};

export const useSendTestEmailMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/email/test", {}),
    });
};

export const useMfaSetupMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/mfa/setup", {}),
    });
};

export const useMfaVerifyMutation = () => {
    return useMutation({
        mutationFn: (data: { token: string }) =>
            authService.postData("/auth/mfa/verify", data),
    });
};

export const useDisableMfaMutation = () => {
    return useMutation({
        mutationFn: (data: { current_password: string; token: string }) =>
            authService.postData("/auth/mfa/disable", data),
    });
};

export const useRegenerateRecoveryCodesMutation = () => {
    return useMutation({
        mutationFn: (data: { token: string }) =>
            authService.postData("/auth/mfa/recovery-codes/regenerate", data),
    });
};

export const useSessionsQuery = () => {
    return useQuery({
        queryKey: ["auth", "sessions"],
        queryFn: () => authService.fetchData("/auth/sessions"),
        retry: false,
    });
};

export const useRevokeSessionMutation = () => {
    return useMutation({
        mutationFn: (data: { session_id: string }) =>
            authService.postData("/auth/sessions/revoke", data),
    });
};

export const useRevokeAllSessionsMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/auth/sessions/revoke-all", {}),
    });
};

export const usePermissionsQuery = () => {
    return useQuery({
        queryKey: ["auth", "permissions"],
        queryFn: () => authService.fetchData("/permissions"),
        retry: false,
    });
};

export const useRolesQuery = () => {
    return useQuery({
        queryKey: ["auth", "roles"],
        queryFn: () => authService.fetchData("/roles"),
        retry: false,
    });
};

export const useCreateRoleMutation = () => {
    return useMutation({
        mutationFn: (data) => authService.postData("/roles", data),
    });
};

export const useUpdateRoleMutation = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: unknown }) => authService.patchData(`/roles/${id}`, data),
    });
};

export const useAssignUserRolesMutation = () => {
    return useMutation({
        mutationFn: ({ id, role_keys }: { id: string; role_keys: string[] }) => authService.updateData(`/employees/${id}/roles`, { role_keys }),
    });
};

export const useSetUserPermissionOverridesMutation = () => {
    return useMutation({
        mutationFn: ({ id, allow, deny }: { id: string; allow: string[]; deny: string[] }) => authService.updateData(`/employees/${id}/permission-overrides`, { allow, deny }),
    });
};

const employeeQueryPath = (params: Record<string, unknown> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
    });
    const query = search.toString();
    return `/employees${query ? `?${query}` : ""}`;
};

export const useEmployeesQuery = (params: Record<string, unknown> = {}) => {
    return useQuery({
        queryKey: ["auth", "employees", params],
        queryFn: () => authService.fetchData(employeeQueryPath(params)),
        retry: false,
    });
};

export const useEmployeeQuery = (userId?: string, enabled = true) => {
    return useQuery({
        queryKey: ["auth", "employees", userId],
        queryFn: () => authService.fetchData(`/employees/${userId}`),
        enabled: enabled && Boolean(userId),
        retry: false,
    });
};

export const useCreateEmployeeMutation = () => {
    return useMutation({
        mutationFn: (data) => authService.postData("/employees", data),
    });
};

export const useUpdateEmployeeMutation = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: unknown }) =>
            authService.patchData(`/employees/${id}`, data),
    });
};

export const useUpdateEmployeeStatusMutation = () => {
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            authService.postData(`/employees/${id}/status`, { status }),
    });
};

export const useDeleteEmployeeMutation = () => {
    return useMutation({
        mutationFn: (id: string) => authService.deleteData(`/employees/${id}`),
    });
};

export const useBulkCreateEmployeesMutation = () => {
    return useMutation({
        mutationFn: (users) => authService.postData("/employees/bulk", { users }),
    });
};

export const useImportEmployeesMutation = () => {
    return useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return authService.postData("/employees/import", formData);
        },
    });
};

export const useApiKeysQuery = () => {
    return useQuery({
        queryKey: ["auth", "api-keys"],
        queryFn: () => authService.fetchData("/auth/api-keys"),
        retry: false,
    });
};

export const useCreateApiKeyMutation = () => {
    return useMutation({
        mutationFn: (data) => authService.postData("/auth/api-keys", data),
    });
};

export const useRevokeApiKeyMutation = () => {
    return useMutation({
        mutationFn: (data: { api_key_id: string }) =>
            authService.postData("/auth/api-keys/revoke", data),
    });
};

export const useImpersonateMutation = () => {
    return useMutation({
        mutationFn: (data: { target_user_id: string }) =>
            authService.postData("/auth/impersonate", data),
    });
};

export const useAuditLogsQuery = () => {
    return useQuery({
        queryKey: ["auth", "audit-logs"],
        queryFn: () => authService.fetchData("/auth/audit-logs"),
        retry: false,
    });
};

export const useActivityQuery = () => {
    return useQuery({
        queryKey: ["auth", "activity"],
        queryFn: () => authService.fetchData("/auth/activity"),
        retry: false,
    });
};

export const useAccountExportMutation = () => {
    return useMutation({
        mutationFn: () => authService.fetchData("/auth/me/export"),
    });
};

export const useSecurityPolicyQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "security-policy"],
        queryFn: () => authService.fetchData("/auth/security-policy"),
        retry: false,
        enabled,
    });
};

export const useUpdateSecurityPolicyMutation = () => {
    return useMutation({
        mutationFn: (data: { password_min_length: number; require_mfa: boolean; session_ttl_days: number }) =>
            authService.patchData("/auth/security-policy", data),
    });
};

export const useMfaAdoptionQuery = (enabled = true, params = { q: "", limit: 20, offset: 0 }) => {
    return useQuery({
        queryKey: ["auth", "mfa-adoption", params],
        queryFn: () => authService.fetchData(`/auth/security-policy/mfa-adoption?q=${encodeURIComponent(params.q)}&limit=${params.limit}&offset=${params.offset}`),
        retry: false,
        enabled,
    });
};

export const useSendMfaRemindersMutation = () => {
    return useMutation({
        mutationFn: (data: { user_ids?: string[]; send_to_all_missing?: boolean }) =>
            authService.postData("/auth/security-policy/mfa-reminders", data),
    });
};

export const useMfaReminderHistoryQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "mfa-reminder-history"],
        queryFn: () => authService.fetchData("/auth/security-policy/mfa-reminder-history"),
        retry: false,
        enabled,
    });
};

export const useClearMfaReminderHistoryMutation = () => {
    return useMutation({
        mutationFn: () => authService.deleteData("/auth/security-policy/mfa-reminder-history"),
    });
};

export const useNotificationsQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["auth", "notifications"],
        queryFn: () => authService.fetchData("/notifications"),
        retry: false,
        enabled,
    });
};

export const useNotificationDeliveriesQuery = (enabled = true, scope = "self") => {
    return useQuery({
        queryKey: ["auth", "notification-deliveries", scope],
        queryFn: () => authService.fetchData(`/notifications/deliveries?scope=${scope}`),
        retry: false,
        enabled,
    });
};

export const useClearNotificationDeliveriesMutation = () => {
    return useMutation({
        mutationFn: () => authService.deleteData("/notifications/deliveries"),
    });
};

export const useMarkNotificationReadMutation = () => {
    return useMutation({
        mutationFn: (id: string) => authService.postData(`/notifications/${id}/read`, {}),
    });
};

export const useMarkAllNotificationsReadMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/notifications/read-all", {}),
    });
};

export const useSetKioskPinMutation = () => {
    return useMutation({
        mutationFn: (data: { user_id: string; pin: string }) =>
            authService.postData("/kiosk/pin", data),
    });
};
