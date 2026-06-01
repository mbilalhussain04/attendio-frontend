import { Bell, LogOut, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/auth-context.jsx";

export const Header = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);

    const name =
        user?.fullName ||
        user?.name ||
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        user?.username ||
        user?.email ||
        "User";

    const handleLogout = async () => {
        if (isSigningOut) return;
        setIsSigningOut(true);
        await logout();
        navigate("/sign-in", { replace: true });
    };

    return (
        <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                        Attendio
                    </p>
                    <h1 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">
                        Workforce Dashboard
                    </h1>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600">
                        <Bell size={18} />
                    </button>

                    <Link
                        to="/profilePage"
                        className="hidden h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 sm:flex"
                    >
                        <UserRound size={17} />
                        <span className="max-w-[120px] truncate">{name}</span>
                    </Link>

                    <button
                        onClick={handleLogout}
                        disabled={isSigningOut}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-red-100 bg-white text-red-600 shadow-sm transition hover:bg-red-50"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};
