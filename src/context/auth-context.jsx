import { createContext, useContext, useEffect, useRef, useState } from "react";
import { queryClient } from "../provider/react-query-provider";
import { useLocation, useNavigate } from "react-router";
import { publicRoutes } from "../lib/publicRoutes";
import { apiUrl } from "../config/api";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isLoggingOutRef = useRef(false);

    const navigate = useNavigate();
    const currentPath = useLocation().pathname;
    const isPublicRoute = publicRoutes.includes(currentPath);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const fetchMe = () => fetch(apiUrl("/auth/me"), { credentials: "include" });
            let response = await fetchMe();
            if (response.status === 401) {
                const refresh = await fetch(apiUrl("/auth/refresh"), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
                if (refresh.ok) {
                    response = await fetchMe();
                }
            }
            if (!response.ok) {
                throw new Error("No active session");
            }
            return response.json();
        };

        const checkAuth = async () => {
            setIsLoading(true);
            if (isLoggingOutRef.current) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetchCurrentUser();
                const currentUser = response?.data?.user;
                if (currentUser) {
                    const nextUser = {
                        ...currentUser,
                        company: response.data.company,
                        security_policy: response.data.security_policy,
                        permissions: response.data.permissions || [],
                    };
                    setUser(nextUser);
                    setIsAuthenticated(true);
                } else {
                    throw new Error("No active session");
                }
            } catch (error) {
                setUser(null);
                setIsAuthenticated(false);
                if (!isPublicRoute) {
                    navigate("/sign-in");
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [isPublicRoute, currentPath, navigate]);

    useEffect(() => {
        const handleLogout = async () => {
            await logout();
            navigate("/sign-in", { replace: true });
        };
        window.addEventListener("force-logout", handleLogout);
        return () => window.removeEventListener("force-logout", handleLogout);
    }, [navigate]);

    const login = async (response) => {
        isLoggingOutRef.current = false;
        const payload = response?.data || response;
        const nextUser = {
            ...(payload?.user || {}),
            company: payload?.company,
            security_policy: payload?.security_policy,
            permissions: payload?.permissions || payload?.user?.permissions || [],
        };

        if (payload?.company?.slug) {
            localStorage.setItem("attendio_tenant_slug", payload.company.slug);
        }
        setUser(nextUser);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        isLoggingOutRef.current = true;
        setUser(null);
        setIsAuthenticated(false);
        queryClient.clear();
        try {
            await fetch(apiUrl("/auth/logout"), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
        } catch {
            // Local cleanup still needs to happen even if the server session is gone.
        }
    };

    const updateUser = (nextValues) => {
        setUser((current) => current ? { ...current, ...nextValues } : current);
    };

    const values = {
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
    };

    return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
