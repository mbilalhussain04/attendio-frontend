import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "../context/auth-context.jsx";

// eslint-disable-next-line react-refresh/only-export-components
export const queryClient = new QueryClient();

const ReactQueryProvider = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster position="top-center" richColors />
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default ReactQueryProvider;