import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

export const useBillingStatusQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["billing", "status"],
        queryFn: () => authService.fetchData("/billing/status"),
        enabled,
        retry: false,
    });
};

export const useBillingInvoicesQuery = (enabled = true) => {
    return useQuery({
        queryKey: ["billing", "invoices"],
        queryFn: () => authService.fetchData("/billing/invoices"),
        enabled,
        retry: false,
    });
};

export const useBillingCheckoutMutation = () => {
    return useMutation({
        mutationFn: (data: { plan_key: string }) => authService.postData("/billing/checkout", data),
    });
};

export const useBillingPortalMutation = () => {
    return useMutation({
        mutationFn: () => authService.postData("/billing/portal", {}),
    });
};

export const useBillingAttachPaymentMethodMutation = () => {
    return useMutation({
        mutationFn: (data: { brand: string; last4: string; exp_month: number; exp_year: number; billing_email?: string; holder_name?: string }) => authService.postData("/billing/payment-method", data),
    });
};

export const useBillingEntitlements = (enabled = true) => {
    const query = useBillingStatusQuery(enabled);
    const entitlements = query.data?.data?.entitlements || {};
    return {
        query,
        entitlements,
        downloadsAllowed: !entitlements.enabled || entitlements.can_download !== false,
        limits: entitlements.limits || {},
        restrictedFreeMode: entitlements.enabled && entitlements.mode === "free",
    };
};
