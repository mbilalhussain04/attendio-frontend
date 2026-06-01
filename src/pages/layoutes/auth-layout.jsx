import { useAuth } from "../../context/auth-context.jsx";
import React from "react";
import { Navigate, Outlet } from "react-router";
import { useLocation } from "react-router-dom";
import { Loader } from "../../components/loader/dotLoader";

const AuthLayout = () => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (<>

            <div className="fixed inset-0 z-50 flex justify-center items-center">
                <Loader />
            </div>
        </>);
    }

    if (isAuthenticated) {
        if (location.pathname === "/verify-email" && user?.email_verified === false) {
            return <Outlet />;
        }
        return <Navigate to={user?.is_kiosk ? "/attendance" : "/dashboard"} replace />;
    }

    return (
        <>
            <div className="bg-green-400">
                <Outlet />
            </div>
        </>
    );
};

export default AuthLayout;
