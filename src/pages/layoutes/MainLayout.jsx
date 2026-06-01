import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { toast } from "sonner";
import { Loader } from "../../components/loader/dotLoader";
import { useAuth } from "../../context/auth-context.jsx";
import NavBar from "../../components/layout/navBar";

export default function MainLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("sso") === "success") {
            toast.success("Login successful", { id: "sso-login-success" });
            params.delete("sso");
            navigate(
                {
                    pathname: location.pathname,
                    search: params.toString() ? `?${params.toString()}` : "",
                },
                { replace: true }
            );
        }
    }, [location.pathname, location.search, navigate]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/sign-in" replace />;
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_10%_8%,rgba(37,99,235,0.07),transparent_28%),radial-gradient(circle_at_90%_92%,rgba(56,189,248,0.09),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
            <NavBar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isUserMenuOpen={isUserMenuOpen}
                setIsUserMenuOpen={setIsUserMenuOpen}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <main
                className={clsx(
                    "min-h-screen pt-16 transition-[margin] duration-300 ease-out",
                    isCollapsed ? "lg:ml-[76px]" : "lg:ml-[236px]"
                )}
            >
                <div className="mx-auto w-full max-w-[1540px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 2xl:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
