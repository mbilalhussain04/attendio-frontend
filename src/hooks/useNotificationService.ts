import { useMutation, useQuery } from "@tanstack/react-query";
import { authService } from "../lib/api-util";

export const useNotificationsQuery = (enabled = true) => useQuery({
    queryKey: ["notifications", "in-app"],
    queryFn: () => authService.fetchData("/notifications"),
    retry: false,
    enabled,
});

export const useNotificationDeliveriesQuery = (enabled = true, scope = "self") => useQuery({
    queryKey: ["notifications", "deliveries", scope],
    queryFn: () => authService.fetchData(`/notifications/deliveries?scope=${scope}`),
    retry: false,
    enabled,
});

export const useClearNotificationDeliveriesMutation = () => useMutation({
    mutationFn: () => authService.deleteData("/notifications/deliveries"),
});

export const useMarkNotificationReadMutation = () => useMutation({
    mutationFn: (id: string) => authService.postData(`/notifications/${id}/read`, {}),
});

export const useMarkAllNotificationsReadMutation = () => useMutation({
    mutationFn: () => authService.postData("/notifications/read-all", {}),
});
