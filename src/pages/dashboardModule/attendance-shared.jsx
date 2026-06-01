import React from "react";
import clsx from "clsx";

export const parseApiDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const text = String(value);
    const hasTime = text.includes("T");
    const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(text);
    return new Date(hasTime && !hasZone ? `${text}Z` : text);
};

export const todayInputValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const weekStartValue = () => {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date.toISOString().slice(0, 10);
};

export const monthStartValue = () => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
};

export const formatDate = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parseApiDate(value))
    : "Not available";

export const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parseApiDate(value))
    : "Not available";

export const formatClock = (value) => value
    ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(parseApiDate(value))
    : "--:--";

export const formatMinutes = (value = 0) => {
    const minutes = Number(value || 0);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
};

export const hasPermission = (user, permission) => user?.permissions?.includes(permission);

export function PageHeading({ eyebrow, title, text, action }) {
    return (
        <section className="py-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
                    {text && <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{text}</p>}
                </div>
                {action}
            </div>
        </section>
    );
}

export function MetricCard({ label, value, tone = "blue", helper }) {
    const tones = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
    };
    return (
        <div className="rounded-[1.3rem] border border-blue-100 bg-white/85 p-4 shadow-lg shadow-blue-500/5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className={clsx("mt-3 inline-flex rounded-full px-3 py-1 text-xl font-black", tones[tone])}>{value}</p>
            {helper && <p className="mt-3 text-sm font-medium text-slate-500">{helper}</p>}
        </div>
    );
}

export function EmptyState({ title, text }) {
    return (
        <div className="rounded-[1.2rem] border border-dashed border-blue-200 bg-blue-50/45 p-6 text-center">
            <p className="text-sm font-black text-slate-900">{title}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{text}</p>
        </div>
    );
}

export function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            {children}
        </label>
    );
}

export const inputClassName = "h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
