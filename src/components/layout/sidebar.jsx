import React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import {
    CalendarDays,
    CalendarClock,
    CheckCircle2,
    ChevronsLeft,
    ChevronsRight,
    Clock3,
    FilePenLine,
    GitBranch,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Smartphone,
    Users,
    Video,
    X,
} from "lucide-react";
import { useAuth } from "../../context/auth-context.jsx";
import { resolveWorkspaceProfile } from "../../config/workspaceProfiles.js";

const navItems = [
    { key: "dashboard", label: "Dashboard", link: "/dashboard", icon: <LayoutDashboard size={18} />, always: true },
    { key: "attendance", label: "Attendance", link: "/attendance", icon: <Clock3 size={18} />, permissions: ["attendance.check_in", "attendance.check_out", "attendance.view_self", "attendance.view_team", "attendance.view_company"] },
    { key: "attendance", label: "Correction Requests", link: "/correction-requests", icon: <FilePenLine size={18} />, permissions: ["attendance.manual_entry", "attendance.approve"] },
    { key: "employees", label: "Employees", link: "/employees", icon: <Users size={18} />, permissions: ["users.invite", "reports.company"] },
    { key: "organization", label: "Organization", link: "/organization", icon: <GitBranch size={18} />, always: true, permissions: ["org.view_self", "org.view_team", "org.view_company", "settings.tenant", "reports.company"] },
    { key: "leaves", label: "Leaves", link: "/leaves", icon: <CalendarDays size={18} />, permissions: ["leave.request", "leave.view_self", "leave.view_company", "leave.review"] },
    { key: "scheduling", label: "Scheduling", link: "/scheduling", icon: <CalendarClock size={18} />, permissions: ["schedule.view_self", "schedule.view_team", "schedule.view_company", "schedule.manage", "settings.tenant", "reports.company"] },
    { key: "scheduling", label: "Meetings", link: "/meetings", icon: <Video size={18} />, permissions: ["meetings.view_self", "meetings.view_team", "meetings.view_company", "meetings.manage", "schedule.view_self", "schedule.view_team", "schedule.view_company", "schedule.manage", "settings.tenant", "reports.company"] },
    { key: "timesheets", label: "Timesheets", link: "/timesheets", icon: <CheckCircle2 size={18} />, permissions: ["attendance.view_self", "attendance.view_team", "attendance.view_company", "attendance.approve", "reports.company"] },
    { key: "kiosk", label: "Kiosk", link: "/kiosk", icon: <Smartphone size={18} />, always: true, permissions: ["settings.kiosk", "users.reset_pin", "attendance.kiosk_manage", "settings.tenant"] },
    { key: "rules", label: "Rules", link: "/compliance", icon: <ShieldCheck size={18} />, permissions: ["attendance.configure", "attendance.shift_manage", "attendance.holiday_manage", "attendance.geofence_manage", "leave.configure"] },
    { key: "settings", label: "Settings", link: "/settings", icon: <Settings size={18} />, permissions: ["settings.tenant", "roles.manage", "audit.read", "api_keys.manage", "reports.company"] },
];

const hasAnyPermission = (user, permissions = []) => {
    if (!permissions.length) return true;
    const owned = new Set(user?.permissions || []);
    return permissions.some((permission) => owned.has(permission));
};

export default function SideBar({
    isSidebarOpen,
    setIsSidebarOpen,
    setIsUserMenuOpen,
    isCollapsed,
    setIsCollapsed,
}) {
    const { user } = useAuth();
    const location = useLocation();
    const currentPath = location.pathname;
    const profile = resolveWorkspaceProfile(user?.company || {});
    const enabledModules = new Set(profile.enabled_modules);
    const visibleNavItems = navItems.filter((item) => {
        const moduleIsVisible = item.always || enabledModules.has(item.key);
        return moduleIsVisible && hasAnyPermission(user, item.permissions);
    });
    const moduleSummary = profile.enabled_modules.map((key) => navItems.find((item) => item.key === key)?.label).filter(Boolean).slice(0, 3).join(", ");

    const closeMobileSidebar = () => {
        setIsSidebarOpen(false);
        setIsUserMenuOpen(false);
    };

    return (
        <aside
            className={clsx(
                "fixed left-0 top-0 z-50 h-full border-r border-blue-100 bg-white/92 backdrop-blur-xl shadow-2xl shadow-blue-500/5 transition-all duration-300 ease-out",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                "lg:translate-x-0",
                isCollapsed ? "lg:w-[76px]" : "lg:w-[236px]",
                "w-[236px]"
            )}
        >
            <div className="flex h-16 items-center justify-between border-b border-blue-100 px-3">
                <Link
                    to="/dashboard"
                    onClick={closeMobileSidebar}
                    className={clsx(
                        "flex min-w-0 items-center gap-2 text-decoration-none",
                        isCollapsed && "lg:w-full lg:justify-center"
                    )}
                >
                    <div className="relative h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-lg shadow-blue-500/20">
                        <span className="absolute inset-[10px] rounded-md bg-white" />
                    </div>

                    <span
                        className={clsx(
                            "truncate text-xl font-black tracking-tight text-slate-950",
                            isCollapsed && "lg:hidden"
                        )}
                    >
                        Attendio
                    </span>
                </Link>

                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 lg:hidden"
                >
                    <X size={20} />
                </button>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={clsx(
                        "hidden h-9 w-9 place-items-center rounded-2xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 lg:grid",
                        isCollapsed && "absolute right-3.5"
                    )}
                >
                    {isCollapsed ? <ChevronsRight size={19} /> : <ChevronsLeft size={19} />}
                </button>
            </div>

            <div className="flex h-[calc(100%-64px)] flex-col justify-between px-3 py-4">
                <nav className="space-y-1.5">
                    {visibleNavItems.map((item) => {
                        const isActive =
                            currentPath === item.link || currentPath.startsWith(`${item.link}/`);

                        return (
                            <Link
                                key={item.link}
                                to={item.link}
                                onClick={closeMobileSidebar}
                                title={isCollapsed ? item.label : undefined}
                                className={clsx(
                                    "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/20"
                                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
                                    isCollapsed && "lg:justify-center lg:px-0"
                                )}
                            >
                                <span className="shrink-0">{item.icon}</span>
                                <span className={clsx("truncate", isCollapsed && "lg:hidden")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div
                    className={clsx(
                        "rounded-3xl border border-blue-100 bg-blue-50/70 p-4",
                        isCollapsed && "lg:hidden"
                    )}
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                        System status
                    </p>
                    <h3 className="mt-2 text-sm font-black text-slate-950">
                        Operations live
                    </h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {moduleSummary || "Attendance, time records and payroll data"} are ready.
                    </p>
                </div>
            </div>
        </aside>
    );
}
