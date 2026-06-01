import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Settings, UserRound, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import SideBar from "./sidebar";
import { useAuth } from "../../context/auth-context.jsx";
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery } from "../../hooks/useNotificationService.ts";
import { getInitials } from "../../utils";
import { Avatar, AvatarFallback, AvatarImage } from "../form/avatar.jsx";
import { Loader } from "../loader/dotLoader.jsx";

export default function NavBar({
    isCollapsed,
    setIsCollapsed,
    isUserMenuOpen,
    setIsUserMenuOpen,
    isSidebarOpen,
    setIsSidebarOpen,
}) {
    const navigate = useNavigate();
    const { user: currentUser, logout } = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationRef = useRef(null);
    const notifications = useNotificationsQuery(Boolean(currentUser));
    const markNotificationRead = useMarkNotificationReadMutation();
    const markAllRead = useMarkAllNotificationsReadMutation();
    const unreadCount = (notifications.data?.data || []).filter((item) => !item.is_read).length;
    const permissions = new Set(currentUser?.permissions || []);
    const canOpenSettings = ["settings.tenant", "roles.manage", "audit.read", "api_keys.manage", "reports.company"].some((permission) => permissions.has(permission));
    const canOpenSecurity = ["settings.tenant", "roles.manage", "audit.read", "api_keys.manage"].some((permission) => permissions.has(permission));

    const name =
        currentUser?.fullName ||
        currentUser?.name ||
        [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") ||
        currentUser?.username ||
        currentUser?.email ||
        "User";
    const profilePicture = currentUser?.profile_picture
        || currentUser?.avatar_url
        || currentUser?.profilePicture
        || currentUser?.avatarUrl
        || currentUser?.metadata?.profile_picture_url
        || null;

    useEffect(() => {
        if (!isNotificationsOpen) return undefined;
        const close = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) setIsNotificationsOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [isNotificationsOpen]);

    const handleLogout = async () => {
        if (isSigningOut) return;
        setIsSigningOut(true);
        await logout();
        setIsUserMenuOpen(false);
        navigate("/sign-in", { replace: true });
    };

    return (
        <>
            {isSidebarOpen && (
                <button
                    aria-label="Close sidebar"
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
                />
            )}

            {isUserMenuOpen && (
                <button
                    aria-label="Close user menu"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="fixed inset-0 z-20 cursor-default bg-transparent"
                />
            )}

            <SideBar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                setIsUserMenuOpen={setIsUserMenuOpen}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />

            <nav
                className={clsx(
                    "fixed right-0 top-0 z-30 h-16 border-b border-blue-100/80 bg-white/85 backdrop-blur-xl shadow-sm shadow-blue-500/5 transition-[left] duration-300 ease-out",
                    isCollapsed ? "lg:left-[76px]" : "lg:left-[236px]",
                    "left-0"
                )}
            >
                <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            onClick={() => {
                                setIsSidebarOpen(true);
                                setIsUserMenuOpen(false);
                            }}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm transition hover:bg-blue-50 lg:hidden"
                        >
                            <Menu size={20} />
                        </button>

                        {/* <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                                Attendio
                            </p>
                            <h1 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">
                                Workforce Dashboard
                            </h1>
                        </div> */}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <div ref={notificationRef} className="relative">
                        <button onClick={() => setIsNotificationsOpen((current) => !current)} className="relative grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600">
                            <Bell size={18} />
                            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white ring-2 ring-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                        </button>
                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-1rem))] rounded-[1.4rem] border border-blue-100 bg-white p-3 text-left shadow-2xl shadow-blue-500/15">
                                <div className="flex items-center justify-between px-2 py-1">
                                    <p className="text-sm font-black text-slate-950">Notifications</p>
                                    <div className="flex gap-3">
                                        {unreadCount > 0 && <button type="button" onClick={() => markAllRead.mutate(undefined, { onSuccess: () => notifications.refetch() })} className="text-xs font-black text-blue-600">Read all</button>}
                                        <button type="button" onClick={() => notifications.refetch()} className="text-xs font-black text-blue-600">Refresh</button>
                                    </div>
                                </div>
                                <div className="mt-2 max-h-80 space-y-2 overflow-auto">
                                    {(notifications.data?.data || []).map((item) => (
                                        <button key={item.id} type="button" onClick={() => markNotificationRead.mutate(item.id, { onSuccess: () => notifications.refetch() })} className={item.is_read ? "w-full rounded-2xl bg-slate-50 p-3 text-left" : "w-full rounded-2xl bg-blue-50 p-3 text-left"}>
                                            <p className="text-sm font-black text-slate-900">{item.title}</p>
                                            <p className="mt-1 text-sm font-medium text-slate-500">{item.body}</p>
                                        </button>
                                    ))}
                                    {!notifications.isLoading && (notifications.data?.data || []).length === 0 && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-500">No notifications yet.</p>}
                                </div>
                            </div>
                        )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsUserMenuOpen(!isUserMenuOpen);
                                    setIsSidebarOpen(false);
                                }}
                                className="flex h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:bg-blue-50"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={profilePicture} alt={name} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-black text-white">
                                        {getInitials(name)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="hidden min-w-0 max-w-[220px] text-left sm:block">
                                    <p className="break-words text-xs font-black leading-4 text-slate-900">
                                        {name}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-500">
                                        Account
                                    </p>
                                </div>
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1rem))] overflow-hidden rounded-[1.6rem] border border-blue-100 bg-white shadow-2xl shadow-blue-500/15">
                                    <div className="m-3 rounded-[1.3rem] bg-gradient-to-br from-blue-600 to-sky-400 p-5 text-center text-white">
                                        <Avatar className="mx-auto h-16 w-16 border-4 border-white/40">
                                            <AvatarImage src={profilePicture} alt={name} />
                                            <AvatarFallback className="bg-white text-lg font-black text-blue-600">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <h3 className="mt-3 break-words text-xl font-black tracking-tight">
                                            {name}
                                        </h3>

                                        <p className="mt-1 break-all text-sm font-semibold text-blue-100">
                                            {currentUser?.email || "user@attendio.com"}
                                        </p>
                                    </div>

                                    <div className="px-3 pb-3">
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                navigate("/profilePage");
                                            }}
                                            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            <UserRound size={18} />
                                            Profile
                                        </button>

                                        {canOpenSettings && (
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate("/settings");
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Settings size={18} />
                                                Account settings
                                            </button>
                                        )}

                                        {canOpenSecurity && (
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate("/security");
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <ShieldCheck size={18} />
                                                Security
                                            </button>
                                        )}

                                        <div className="my-2 h-px bg-blue-100" />

                                        <div className="rounded-2xl bg-blue-50/70 p-4">
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                                                Attendio account
                                            </p>
                                            <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                                                {canOpenSettings || canOpenSecurity
                                                    ? "Manage your profile, security, and account preferences."
                                                    : "Manage your personal profile and account details."}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            disabled={isSigningOut}
                                            className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-70"
                                        >
                                            {isSigningOut ? (
                                                <span className="h-5 w-12 overflow-hidden [--box-shadow-color:rgba(220,38,38,0.18)] [--dot-color:#dc2626] [--dot-pulse-start:#dc2626] [--dot-pulse-end:#fecaca] [&_.dot]:h-1.5 [&_.dot]:w-1.5 [&_.dots-container]:gap-1 [&_.dots-container]:p-0">
                                                    <Loader />
                                                </span>
                                            ) : (
                                                <LogOut size={18} />
                                            )}
                                            {isSigningOut ? "Signing out" : "Sign out"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}
