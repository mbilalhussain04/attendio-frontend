import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Ellipsis, Eye, FileUp, LoaderCircle, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context.jsx";
import { useBillingEntitlements } from "../../hooks/useBillingService.ts";
import { useDeleteStoredFileMutation, useUploadFileMutation } from "../../hooks/useStorageService.ts";
import { apiUrl } from "../../config/api";
import {
    useCancelLeaveRequestMutation,
    useCompanyLeaveRequestsQuery,
    useCreateLeaveRequestMutation,
    useLeaveTypesQuery,
    useMyLeaveBalanceQuery,
    useMyLeaveRequestsQuery,
    useReviewLeaveRequestMutation,
} from "../../hooks/useLeaveService.ts";
import { useEmployeesQuery } from "../../hooks/useEmployeeService.ts";
import { useBranchesQuery, useProjectsQuery } from "../../hooks/useAuthService.ts";
import { useHolidaysQuery } from "../../hooks/useAttendanceService.ts";
import { SearchableSelect } from "../../components/form/GeoFields.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { getInitials } from "../../utils";
import { EmptyState, Field, formatDate, formatDateTime, hasPermission, inputClassName, todayInputValue } from "./attendance-shared.jsx";
import { labelFor } from "../../config/workspaceProfiles.js";

const requestInitial = { leave_type_id: "", from_date: "", to_date: "", session: "full_day", reason: "", attachment_urls: [] };
const statusTone = {
    approved: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-700",
    cancelled: "bg-slate-100 text-slate-500",
};
const display = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const employeeName = (item) => [item?.employee_snapshot?.first_name, item?.employee_snapshot?.last_name].filter(Boolean).join(" ") || item?.employee_snapshot?.email || "Employee";
const employeeLabel = (item) => [item?.first_name, item?.last_name].filter(Boolean).join(" ") || item?.email || "Employee";
const employeeAccessRole = (item) => display(item?.role_name || item?.role_key || item?.role || item?.roles?.[0] || "Employee");
const employeePosition = (item) => display(item?.job_title || employeeAccessRole(item));
const days = (value) => value === null || value === undefined ? "-" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} d`;
const dateKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const storageObjectKey = (url) => decodeURIComponent(String(url || "").split("/storage/files/")[1] || "");
const formatDayAmount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: Number(value || 0) % 1 ? 1 : 0, maximumFractionDigits: 1 });
const sameDateRange = (day, item) => day >= item.from_date && day <= item.to_date;
const startsInMonth = (item, value) => new Date(`${item.from_date}T12:00:00`) <= new Date(value.getFullYear(), value.getMonth() + 1, 0, 12) && new Date(`${item.to_date}T12:00:00`) >= new Date(value.getFullYear(), value.getMonth(), 1, 12);
const requestEmployee = (item) => ({ id: item.user_id, ...(item.employee_snapshot || {}) });
const visibleOnLeaveCalendar = (item) => ["approved", "pending"].includes(item.status);
const leaveCalendarDayTone = {
    approved: "bg-emerald-100 text-emerald-900",
    pending: "bg-amber-100 text-amber-900",
};
const employeeAvatar = (item) => item?.profile_picture || item?.avatar_url || item?.profile_picture_url;
const attachmentTimestamp = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
};
const datedAttachmentName = (name, createdAt) => {
    const fileName = String(name || "file").split(/[\\/]/).pop();
    const extensionAt = fileName.lastIndexOf(".");
    const stem = extensionAt > 0 ? fileName.slice(0, extensionAt) : fileName;
    const extension = extensionAt > 0 ? fileName.slice(extensionAt) : "";
    const timestamp = attachmentTimestamp(createdAt);
    return timestamp ? `${stem}-${timestamp}${extension}` : fileName;
};
const uuidOnlyAttachmentName = (name) => /^[0-9a-f]{32}(\.[a-z0-9]+)?$/i.test(name);
const attachmentName = (url, knownNames = {}) => {
    if (knownNames[url]) return knownNames[url];
    const fileName = decodeURIComponent(String(url || "").split("/").pop() || "").split("?")[0];
    return fileName && !uuidOnlyAttachmentName(fileName) ? fileName : "Loading file name...";
};
const shiftDate = (value, amount) => {
    const next = new Date(value);
    next.setDate(next.getDate() + amount);
    return next;
};
const pdfText = (value) => String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, " ");
const downloadBlob = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
const downloadBalancePdf = (year, balances, user) => {
    const text = (value, x, y, size = 10, bold = false) => `BT /F${bold ? "B" : "R"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`;
    const line = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S`;
    const rect = (x, y, w, h, fill = false) => `${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}`;
    const cols = [190, 82, 70, 70, 98];
    const tableX = 45;
    const tableW = cols.reduce((total, width) => total + width, 0);
    const ops = ["1 1 1 rg", rect(0, 0, 595, 842, true), "0.02 0.45 0.98 rg", rect(45, 760, 38, 38, true), "0.03 0.09 0.22 rg", text("Attendio", 96, 772, 24, true), text(`Leave Balance Sheet ${year}`, 45, 710, 18, true), text(`Employee: ${[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "-"}`, 45, 680, 10), text(`Generated: ${new Date().toLocaleString()}`, 360, 680, 9)];
    let y = 630;
    ops.push("0.02 0.45 0.98 rg", rect(tableX, y, tableW, 22, true));
    ["Leave Type", "Entitled", "Taken", "Pending", "Available"].reduce((x, header, index) => {
        ops.push("1 1 1 rg", text(header, x + 6, y + 8, 9, true));
        return x + cols[index];
    }, tableX);
    balances.forEach((row, index) => {
        y -= 22;
        if (index % 2 === 0) ops.push("0.98 0.99 1 rg", rect(tableX, y, tableW, 22, true));
        [row.name, days(row.entitlement_days), days(row.taken_days), days(row.pending_days), days(row.available_days)].reduce((x, cell, cellIndex) => {
            ops.push("0.03 0.09 0.22 rg", text(String(cell).slice(0, 30), x + 6, y + 8, 8));
            return x + cols[cellIndex];
        }, tableX);
        ops.push("0.55 0.58 0.64 RG", line(tableX, y, tableX + tableW, y));
    });
    const bottom = y;
    let borderX = tableX;
    ops.push("0.48 0.52 0.60 RG", rect(tableX, bottom, tableW, 652 - bottom));
    cols.forEach((width) => {
        borderX += width;
        ops.push(line(borderX, bottom, borderX, 652));
    });
    ops.push("0.03 0.09 0.22 rg", text("System generated leave balance sheet.", 45, 48, 9));
    const stream = ops.join("\n");
    const objects = [
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
        "<< /Type /Catalog /Pages 3 0 R >>",
        `<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] /Resources << /Font << /FR 1 0 R /FB 2 0 R >> >> /Contents 6 0 R >>`,
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; });
    const start = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 4 0 R >>\nstartxref\n${start}\n%%EOF`;
    downloadBlob(`leave-balance-${year}.pdf`, new Blob([pdf], { type: "application/pdf" }));
};

function Modal({ title, onClose, children, wide = false }) {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
            <div className={`max-h-[92vh] w-full overflow-auto rounded-[1.4rem] border border-blue-100 bg-white shadow-2xl shadow-blue-500/20 ${wide ? "max-w-4xl" : "max-w-lg"}`}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white/95 px-5 py-4"><h2 className="text-lg font-black text-slate-950">{title}</h2><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50"><X size={17} /></button></div>
                {children}
            </div>
        </div>
    );
}
function Status({ value }) { return <span className={`rounded-lg px-2 py-1 text-xs font-black ${statusTone[value] || statusTone.pending}`}>{display(value)}</span>; }

function EmployeeAvatar({ employee, className = "h-10 w-10", fallbackClassName = "text-xs" }) {
    const name = employeeLabel(employee);
    if (!employeeAvatar(employee)) {
        return <span className={`grid ${className} shrink-0 place-items-center rounded-full border border-blue-100 bg-gradient-to-br from-blue-600 to-sky-400 font-black text-white ${fallbackClassName}`}>{getInitials(name) || "E"}</span>;
    }
    return (
        <Avatar className={`${className} shrink-0 border border-blue-100`}>
            <AvatarImage src={employeeAvatar(employee)} alt={name} />
            <AvatarFallback className={`bg-gradient-to-br from-blue-600 to-sky-400 font-black text-white ${fallbackClassName}`}>{getInitials(name) || "E"}</AvatarFallback>
        </Avatar>
    );
}

function EmployeeAvatarButton({ employee, selected, onClick }) {
    return (
        <button type="button" onClick={onClick} title={employeeLabel(employee)} className={`group relative rounded-full border-2 border-white shadow-sm hover:z-10 ${selected ? "z-20 ring-2 ring-blue-500" : "z-0"}`}>
            <EmployeeAvatar employee={employee} className="h-9 w-9" fallbackClassName="text-[10px]" />
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.55rem)] z-50 hidden w-max max-w-48 -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-black text-white shadow-xl group-hover:block group-focus-visible:block">
                {employeeLabel(employee)}
            </span>
        </button>
    );
}

function EmployeeLeaveDetails({ employee, month, summary, requests, detail, onDownload, downloadDisabled }) {
    return (
        <div className="flex min-h-0 flex-col">
            <div className="border-b border-blue-50 p-4">
                <p className="text-sm font-black text-slate-950">Employee Leave Details</p>
                <div className="mt-3 flex items-center gap-3 text-left">
                    <EmployeeAvatar employee={employee} className="h-12 w-12" fallbackClassName="text-sm" />
                    <div className="min-w-0"><p className="truncate font-black text-slate-950">{employeeLabel(employee)}</p><p className="truncate text-xs font-bold text-slate-500">{employeePosition(employee)}</p></div>
                </div>
            </div>
            <div className="border-b border-blue-50 p-4">
                <p className="text-sm font-black text-slate-950">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })} Summary</p>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {[["Approved", summary.approved, "bg-emerald-50 text-emerald-700", "bg-emerald-500"], ["Pending", summary.pending, "bg-amber-50 text-amber-700", "bg-amber-500"], ["Rejected", summary.rejected, "bg-rose-50 text-rose-700", "bg-rose-500"]].map(([label, value, tone, dot]) => <div key={label} className={`grid min-w-0 gap-1 rounded-xl px-2 py-2 ${tone}`}><span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-black"><i className={`h-2 w-2 shrink-0 rounded-full ${dot}`} /><span className="truncate">{label}</span></span><b className="text-sm font-black">{value}</b></div>)}
                </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4">
                <p className="text-sm font-black text-slate-950">Leave List</p>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {requests.map((item) => <button key={item.id} type="button" onClick={() => detail(item)} className="grid w-full gap-1 rounded-2xl border border-blue-50 bg-slate-50 px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60"><span className="flex items-center justify-between gap-2"><b className="truncate text-sm text-slate-950">{item.leave_type.name}</b><Status value={item.status} /></span><span className="text-xs font-bold text-slate-500">{formatDate(item.from_date)} - {formatDate(item.to_date)} · {days(item.total_days)}</span>{item.reason && <span className="line-clamp-2 text-xs font-semibold text-slate-600">{item.reason}</span>}</button>)}
                    {!requests.length && <EmptyState title="No leave this month" text="Leave requests for this employee and month appear here." />}
                </div>
                <button type="button" onClick={onDownload} disabled={downloadDisabled} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Download size={15} />Download Leave Summary</button>
            </div>
        </div>
    );
}

function YearPicker({ value, years, onChange }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="relative shrink-0"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-xs font-black tracking-normal text-blue-600 shadow-sm outline-none transition hover:border-blue-200 hover:bg-blue-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" aria-haspopup="listbox" aria-expanded={open}>
                <CalendarDays size={14} />
                <span className="text-slate-900">{value}</span>
                <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="absolute right-0 top-full z-40 mt-1 w-32 rounded-2xl border border-blue-100 bg-white p-1.5 shadow-2xl shadow-blue-500/20" role="listbox" aria-label="Leave calendar year">
                {years.map((item) => <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(item); setOpen(false); }} className={`flex h-9 w-full items-center justify-between rounded-xl px-2.5 text-left text-xs font-black transition ${item === value ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`} role="option" aria-selected={item === value}><span>{item}</span>{item === value && <Check size={14} />}</button>)}
            </div>}
        </div>
    );
}

function LeaveTypePicker({ value, options, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [menuStyle, setMenuStyle] = useState(null);
    const triggerRef = useRef(null);
    const inputRef = useRef(null);
    const selected = options.find((option) => String(option.id) === String(value));
    const visible = options.filter((option) => `${option.name} ${option.code}`.toLowerCase().includes(query.trim().toLowerCase()));

    useEffect(() => {
        if (!open || !triggerRef.current) return undefined;
        const placeMenu = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuStyle({ left: rect.left, top: rect.bottom + 2, width: rect.width });
        };
        placeMenu();
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", placeMenu, true);
        return () => {
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", placeMenu, true);
        };
    }, [open]);

    return (
        <div onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpen(false);
                setQuery("");
            }
        }}>
            <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)} className="flex h-12 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <span className={selected ? "truncate" : "truncate text-slate-400"}>{selected?.name || "Select leave type"}</span>
                <ChevronDown size={17} className={`shrink-0 text-blue-600 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && menuStyle && (
                <div style={menuStyle} className="fixed z-[140] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/20">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leave type" className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-auto p-2">
                        {visible.map((option) => (
                            <button key={option.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.id); setQuery(""); setOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${String(option.id) === String(value) ? "bg-blue-600 font-black text-white" : "font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}>
                                <span className="min-w-0 truncate">{option.name}</span>
                                {String(option.id) === String(value) && <Check size={16} className="shrink-0" />}
                            </button>
                        ))}
                        {!visible.length && <p className="px-3 py-4 text-center text-sm font-semibold text-slate-400">No leave type found</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

const estimateRequestedDays = (form, holidays) => {
    if (!form.from_date || !form.to_date || form.to_date < form.from_date) return null;
    if (form.session === "half_day") return form.from_date === form.to_date ? 0.5 : null;
    const cursor = new Date(`${form.from_date}T12:00:00`);
    const end = new Date(`${form.to_date}T12:00:00`);
    let total = 0;
    while (cursor <= end) {
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        if (!isWeekend && !holidays.has(dateKey(cursor))) total += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return total;
};

const monthCalendarDays = (month) => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
};

function LeaveRangePicker({ form, year, onChange }) {
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => form.from_date ? new Date(`${form.from_date}T12:00:00`) : new Date(year, new Date().getMonth(), 1));
    const anchorRef = useRef(null);
    const start = form.from_date;
    const end = form.to_date;
    const selectedText = start ? `${formatDate(start)}${end && end !== start ? ` - ${formatDate(end)}` : ""}` : "Choose leave dates";
    const selectDay = (day) => {
        const key = dateKey(day);
        if (form.session === "half_day") {
            onChange({ from_date: key, to_date: key });
            setOpen(false);
            return;
        }
        if (!start) {
            onChange({ from_date: key, to_date: key });
            return;
        }
        if (start === end && key === start) {
            setOpen(false);
            return;
        }
        if (start === end && key < start) {
            onChange({ from_date: key, to_date: start });
            setOpen(false);
            return;
        }
        if (start === end && key > start) {
            onChange({ to_date: key });
            setOpen(false);
            return;
        }
        onChange({ from_date: key, to_date: key });
    };

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (anchorRef.current && !anchorRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div ref={anchorRef} className="relative">
            <button type="button" onClick={() => setOpen((current) => !current)} className="flex h-12 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <span className={start ? "truncate" : "truncate text-slate-400"}>{selectedText}</span>
                <CalendarDays size={17} className="shrink-0 text-blue-600" />
            </button>
            {open && (
                <div className="absolute left-0 top-14 z-40 w-full min-w-[19rem] rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/20">
                    <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600"><ChevronLeft size={16} /></button>
                        <p className="text-sm font-black text-slate-950">{visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                        <button type="button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600"><ChevronRight size={16} /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((item) => <span key={item}>{item}</span>)}</div>
                    <div className="mt-2 grid grid-cols-7 gap-y-1">
                        {monthCalendarDays(visibleMonth).map((day) => {
                            const key = dateKey(day);
                            const outsideYear = day.getFullYear() !== Number(year);
                            const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
                            const boundary = key === start || key === end;
                            const inRange = start && end && key > start && key < end;
                            return (
                                <button key={key} type="button" disabled={outsideYear} onClick={() => selectDay(day)} className={`grid h-9 place-items-center text-sm transition ${boundary ? "rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-500/20" : inRange ? "bg-blue-100 font-black text-blue-700" : outsideYear ? "cursor-not-allowed text-slate-200" : outsideMonth ? "rounded-xl font-bold text-slate-300 hover:bg-blue-50" : "rounded-xl font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}>
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-3 text-xs font-black">
                        <button type="button" onClick={() => onChange({ from_date: "", to_date: "" })} className="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-50">Clear</button>
                        <span className="text-blue-600">{end && end !== start ? "Range selected" : start ? "One day selected. Pick another date for a range." : "Pick a date"}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LeavesPage() {
    const { user } = useAuth();
    const { downloadsAllowed } = useBillingEntitlements(true);
    const branchLabel = labelFor(user?.company, "branch", "Branch");
    const projectLabel = labelFor(user?.company, "project", "Project");
    const departmentLabel = labelFor(user?.company, "department", "Team");
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [tab, setTab] = useState("requests");
    const [status, setStatus] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [requestForm, setRequestForm] = useState(requestInitial);
    const [applyOpen, setApplyOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [reviewItem, setReviewItem] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [expandedRequestId, setExpandedRequestId] = useState("");
    const [expandedReviewId, setExpandedReviewId] = useState("");
    const [reviewNote, setReviewNote] = useState("");
    const [reviewSearch, setReviewSearch] = useState("");
    const [requestCalendarVisible, setRequestCalendarVisible] = useState(true);
    const [leaveCalendarEmployeeId, setLeaveCalendarEmployeeId] = useState("");
    const [leaveCalendarEmployeeQuery, setLeaveCalendarEmployeeQuery] = useState("");
    const [teamPickerOpen, setTeamPickerOpen] = useState(false);
    const [leaveDetailsOpen, setLeaveDetailsOpen] = useState(false);
    const [tabMenuOpen, setTabMenuOpen] = useState(false);
    const [removingAttachmentUrl, setRemovingAttachmentUrl] = useState("");
    const [draftAttachmentNames, setDraftAttachmentNames] = useState({});
    const [storedAttachmentNames, setStoredAttachmentNames] = useState({});
    const [requestColumnWidths, setRequestColumnWidths] = useState([1.05, 1.35, 0.48, 0.62, 0.5]);
    const [activeRequestResize, setActiveRequestResize] = useState(-1);
    const [reviewColumnWidths, setReviewColumnWidths] = useState([1.45, 0.85, 1, 0.42, 0.56, 0.42, 0.58]);
    const [activeReviewResize, setActiveReviewResize] = useState(-1);
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const teamPickerRef = useRef(null);
    const tabMenuRef = useRef(null);
    const canConfigure = hasPermission(user, "leave.configure");
    const canReview = hasPermission(user, "leave.review");
    const canViewCompanyLeave = hasPermission(user, "leave.view_company");
    const leaveTypes = useLeaveTypesQuery(canConfigure, true);
    const balances = useMyLeaveBalanceQuery(year, true);
    const myRequests = useMyLeaveRequestsQuery({ year, status }, true);
    const myLeaveCalendarRequests = useMyLeaveRequestsQuery({ year }, true);
    const companyRequests = useCompanyLeaveRequestsQuery({ year }, canViewCompanyLeave);
    const employees = useEmployeesQuery(canConfigure || canViewCompanyLeave);
    const branches = useBranchesQuery(canConfigure || canViewCompanyLeave);
    const projects = useProjectsQuery(canConfigure || canViewCompanyLeave);
    const createRequest = useCreateLeaveRequestMutation();
    const cancelRequest = useCancelLeaveRequestMutation();
    const reviewRequest = useReviewLeaveRequestMutation();
    const upload = useUploadFileMutation();
    const deleteAttachment = useDeleteStoredFileMutation();
    const holidays = useHolidaysQuery(true);
    const requests = useMemo(() => myRequests.data?.data || [], [myRequests.data?.data]);
    const myLeaveCalendarRows = myLeaveCalendarRequests.data?.data || [];
    const balanceRows = balances.data?.data || [];
    const typeRows = leaveTypes.data?.data || [];
    const employeeRows = employees.data?.data || [];
    const branchOptions = (branches.data?.data || []).filter((branch) => branch.status !== "inactive").map((branch) => ({ value: branch.id, label: [branch.name, branch.city].filter(Boolean).join(" · ") }));
    const projectOptions = (projects.data?.data || []).filter((project) => project.status !== "inactive").map((project) => ({ value: project.id, label: [project.name, project.code].filter(Boolean).join(" · ") }));
    const publicHolidayRows = (holidays.data?.data || []).filter((item) => item.category === "public");
    const publicHolidayDates = new Set(publicHolidayRows.map((item) => item.holiday_date));
    const publicHolidayMap = new Map(publicHolidayRows.map((item) => [item.holiday_date, item]));
    const activeLeaveTypes = typeRows.filter((item) => item.active);
    const companyLeaveRows = useMemo(() => {
        const rows = companyRequests.data?.data || [];
        return rows.filter((item) => {
            const directoryEmployee = employeeRows.find((employee) => String(employee.id) === String(item.user_id));
            const employeeProjectIds = (item.employee_snapshot?.project_ids || directoryEmployee?.project_ids || []).map(String);
            const matchesBranch = !branchFilter || String(item.employee_snapshot?.branch_id || directoryEmployee?.branch_id || "") === String(branchFilter);
            const matchesProject = !projectFilter || employeeProjectIds.includes(String(projectFilter));
            return matchesBranch && matchesProject;
        });
    }, [branchFilter, companyRequests.data?.data, employeeRows, projectFilter]);
    const companyEmployeesWithLeave = companyLeaveRows.map(requestEmployee);
    const leaveCalendarEmployeeRows = Array.from([...companyEmployeesWithLeave, user, ...employeeRows].reduce((rows, item) => {
        if (item?.id) rows.set(String(item.id), { ...(rows.get(String(item.id)) || {}), ...item });
        return rows;
    }, new Map()).values());
    const sameDepartmentEmployees = leaveCalendarEmployeeRows.filter((item) => {
        const matchesDepartment = String(item.id) === String(user?.id) || !user?.department || !item.department || item.department === user.department;
        const matchesBranch = !branchFilter || String(item.branch_id || "") === String(branchFilter);
        const matchesProject = !projectFilter || (item.project_ids || []).map(String).includes(String(projectFilter));
        return matchesDepartment && matchesBranch && matchesProject;
    });
    const visibleLeaveCalendarEmployees = sameDepartmentEmployees.filter((item) => `${employeeLabel(item)} ${item.email || ""} ${item.employee_code || ""} ${item.department || ""}`.toLowerCase().includes(leaveCalendarEmployeeQuery.trim().toLowerCase()));
    const selectedLeaveCalendarEmployee = sameDepartmentEmployees.find((item) => String(item.id) === String(leaveCalendarEmployeeId)) || user;
    const leaveCalendarTeamAvatars = [selectedLeaveCalendarEmployee, ...sameDepartmentEmployees.filter((item) => String(item.id) !== String(selectedLeaveCalendarEmployee?.id))];
    const leaveCalendarRequests = String(selectedLeaveCalendarEmployee?.id) === String(user?.id)
        ? myLeaveCalendarRows
        : companyLeaveRows.filter((item) => String(item.user_id) === String(selectedLeaveCalendarEmployee?.id));
    const leaveCalendarMonthRequests = leaveCalendarRequests.filter((item) => startsInMonth(item, month));
    const selectedBalance = balanceRows.find((item) => String(item.leave_type_id) === String(requestForm.leave_type_id));
    const selectedLeaveType = activeLeaveTypes.find((item) => String(item.id) === String(requestForm.leave_type_id));
    const requestedDays = estimateRequestedDays(requestForm, publicHolidayDates);
    const noRequestableDays = requestedDays !== null && requestedDays <= 0;
    const exceedsBalance = requestedDays !== null && selectedBalance?.available_days !== null && selectedBalance?.available_days !== undefined && requestedDays > Number(selectedBalance.available_days);
    const halfDayRangeInvalid = requestForm.session === "half_day" && requestForm.from_date && requestForm.to_date && requestForm.from_date !== requestForm.to_date;
    const dayRangeInvalid = requestForm.from_date && requestForm.to_date && requestForm.to_date < requestForm.from_date;
    const requestLimitMessage = dayRangeInvalid
        ? "End date must be on or after the start date."
        : halfDayRangeInvalid
            ? "Half-day leave uses one date only."
            : noRequestableDays
                ? "This range has no requestable working days after weekends and public holidays."
                : exceedsBalance
                    ? `This request needs ${formatDayAmount(requestedDays)} days, but ${formatDayAmount(selectedBalance.available_days)} days remain for ${selectedBalance.name}.`
                    : "";
    const summary = {
        entitlement: balanceRows.reduce((total, row) => total + Number(row.entitlement_days || 0), 0),
        taken: balanceRows.reduce((total, row) => total + Number(row.taken_days || 0), 0),
        pending: balanceRows.reduce((total, row) => total + Number(row.pending_days || 0), 0),
        approved: requests.filter((item) => item.status === "approved").reduce((total, row) => total + Number(row.total_days || 0), 0),
        available: balanceRows.reduce((total, row) => total + Number(row.available_days || 0), 0),
    };
    const reviewEmployee = (item) => {
        const directoryEmployee = employeeRows.find((employee) => String(employee.id) === String(item.user_id));
        return { id: item.user_id, ...(item.employee_snapshot || {}), ...(directoryEmployee || {}) };
    };
    const pendingReviewRows = companyLeaveRows.filter((item) => item.status === "pending");
    const visibleReviewRows = pendingReviewRows.filter((item) => {
        const employee = reviewEmployee(item);
        if (branchFilter && String(employee.branch_id || "") !== String(branchFilter)) return false;
        return `${employeeLabel(employee)} ${employeePosition(employee)} ${employee.department || ""} ${employee.branch_name || ""} ${item.leave_type?.name || ""} ${item.from_date} ${item.to_date}`
            .toLowerCase()
            .includes(reviewSearch.trim().toLowerCase());
    });
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leave"] });
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
    const calendarDays = Array.from({ length: 42 }, (_, index) => {
        const day = new Date(calendarStart);
        day.setDate(calendarStart.getDate() + index);
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const holiday = publicHolidayMap.get(key);
        const weekend = day.getDay() === 0 || day.getDay() === 6;
        return { day, key, request: holiday || weekend ? null : requests.find((item) => sameDateRange(key, item)), holiday, weekend };
    });
    const leaveCalendarDays = calendarDays.map(({ day, key, holiday, weekend }) => ({
        day,
        key,
        holiday,
        weekend,
        requests: holiday || weekend ? [] : leaveCalendarMonthRequests.filter((item) => visibleOnLeaveCalendar(item) && sameDateRange(key, item)),
    }));
    const leaveCalendarSummary = {
        approved: leaveCalendarMonthRequests.filter((item) => item.status === "approved").length,
        pending: leaveCalendarMonthRequests.filter((item) => item.status === "pending").length,
        rejected: leaveCalendarMonthRequests.filter((item) => item.status === "rejected").length,
    };
    const isBlockedCalendarDate = (value) => value.getDay() === 0 || value.getDay() === 6 || publicHolidayDates.has(dateKey(value));
    const rangeCellClass = (day, item) => {
        const previous = shiftDate(day, -1);
        const next = shiftDate(day, 1);
        const joinsPrevious = day.getDay() !== 1 && !isBlockedCalendarDate(previous) && sameDateRange(dateKey(previous), item);
        const joinsNext = day.getDay() !== 0 && !isBlockedCalendarDate(next) && sameDateRange(dateKey(next), item);
        return {
            className: `${joinsPrevious ? "-ml-0.5 sm:-ml-1" : ""} ${joinsNext ? "-mr-0.5 sm:-mr-1" : ""}`,
            style: {
                borderTopLeftRadius: joinsPrevious ? 0 : undefined,
                borderBottomLeftRadius: joinsPrevious ? 0 : undefined,
                borderTopRightRadius: joinsNext ? 0 : undefined,
                borderBottomRightRadius: joinsNext ? 0 : undefined,
            },
        };
    };
    useEffect(() => {
        if (!teamPickerOpen) return undefined;
        const closeTeamPicker = (event) => {
            if (teamPickerRef.current && !teamPickerRef.current.contains(event.target)) {
                setTeamPickerOpen(false);
                setLeaveCalendarEmployeeQuery("");
            }
        };
        document.addEventListener("mousedown", closeTeamPicker);
        return () => document.removeEventListener("mousedown", closeTeamPicker);
    }, [teamPickerOpen]);
    useEffect(() => {
        if (!tabMenuOpen) return undefined;
        const closeTabMenu = (event) => {
            if (tabMenuRef.current && !tabMenuRef.current.contains(event.target)) setTabMenuOpen(false);
        };
        document.addEventListener("mousedown", closeTabMenu);
        return () => document.removeEventListener("mousedown", closeTabMenu);
    }, [tabMenuOpen]);
    useEffect(() => {
        if (activeRequestResize < 0 && activeReviewResize < 0) return undefined;
        const bodyStyle = document.body.style;
        const cursor = bodyStyle.cursor;
        const userSelect = bodyStyle.userSelect;
        bodyStyle.cursor = "col-resize";
        bodyStyle.userSelect = "none";
        return () => {
            bodyStyle.cursor = cursor;
            bodyStyle.userSelect = userSelect;
        };
    }, [activeRequestResize, activeReviewResize]);
    useEffect(() => {
        let active = true;
        const unresolvedUrls = [...new Set([...requests, ...companyLeaveRows].flatMap((item) => item.attachment_urls || []))].filter((url) => {
            const fileName = decodeURIComponent(String(url || "").split("/").pop() || "").split("?")[0];
            return uuidOnlyAttachmentName(fileName) && storageObjectKey(url);
        });
        unresolvedUrls.forEach(async (url) => {
            try {
                const response = await fetch(apiUrl(`/storage/file-info/${storageObjectKey(url)}`), { credentials: "include" });
                if (!response.ok) return;
                const payload = await response.json();
                const info = payload?.data;
                if (!active || !info?.original_filename) return;
                setStoredAttachmentNames((current) => current[url] ? current : ({ ...current, [url]: datedAttachmentName(info.original_filename, info.created_at) }));
            } catch {
                // The file can still be previewed or downloaded if metadata lookup is unavailable.
            }
        });
        return () => { active = false; };
    }, [companyLeaveRows, requests]);
    const uploadAttachment = (file) => upload.mutate({ file, module: "leave", category: "attachments" }, {
        onSuccess: (response) => {
            const url = response?.data?.url;
            if (!url) {
                toast.error("Upload finished without an attachment URL");
                return;
            }
            setRequestForm((current) => current.attachment_urls.includes(url) ? current : ({ ...current, attachment_urls: [...current.attachment_urls, url] }));
            setDraftAttachmentNames((current) => ({ ...current, [url]: attachmentName(url) === "Loading file name..." ? datedAttachmentName(response?.data?.original_filename || file.name) : attachmentName(url) }));
            toast.success("Attachment uploaded");
        },
        onError: (error) => toast.error(error.message || "Unable to upload attachment"),
    });
    const previewAttachment = (url) => {
        const objectKey = storageObjectKey(url);
        window.open(objectKey ? apiUrl(`/storage/download-file/${objectKey}`) : url, "_blank", "noopener,noreferrer");
    };
    const downloadAttachment = async (url, knownNames) => {
        const objectKey = storageObjectKey(url);
        try {
            const response = await fetch(objectKey ? apiUrl(`/storage/download-file/${objectKey}`) : url, { credentials: "include" });
            if (!response.ok) throw new Error("Unable to download attachment");
            downloadBlob(attachmentName(url, knownNames), await response.blob());
        } catch (error) {
            toast.error(error.message || "Unable to download attachment");
        }
    };
    const removeAttachment = (url) => {
        const objectKey = storageObjectKey(url);
        const removeFromDraft = () => {
            setRequestForm((current) => ({ ...current, attachment_urls: current.attachment_urls.filter((item) => item !== url) }));
            setDraftAttachmentNames((current) => {
                const next = { ...current };
                delete next[url];
                return next;
            });
        };
        removeFromDraft();
        if (!objectKey) {
            toast.success("Attachment removed");
            return;
        }
        setRemovingAttachmentUrl(url);
        deleteAttachment.mutate(objectKey, {
            onSuccess: () => {
                toast.success("Attachment removed");
            },
            onError: (error) => toast.error(error.message ? `Attachment removed from request. Storage cleanup failed: ${error.message}` : "Attachment removed from request. Storage cleanup failed."),
            onSettled: () => setRemovingAttachmentUrl((current) => current === url ? "" : current),
        });
    };
    const submitLeaveRequest = () => createRequest.mutate(requestForm, {
        onSuccess: () => {
            setPreviewOpen(false);
            setApplyOpen(false);
            setRequestForm(requestInitial);
            setDraftAttachmentNames({});
            invalidate();
            toast.success("Leave request submitted");
        },
        onError: (error) => toast.error(error.message || "Unable to submit leave"),
    });
    const leaveTabs = [
        { key: "requests", label: "My Requests" },
        { key: "leave-calendar", label: "Leave Calendar" },
        ...(canReview ? [{ key: "review", label: "Admin Review" }] : []),
    ];
    const overflowTabs = leaveTabs.filter((item) => item.key === "review");
    const tabOverflowClass = canReview ? "flex lg:hidden" : "flex sm:hidden";
    const requestColumnTemplate = `2.5rem minmax(0,${requestColumnWidths[0]}fr) minmax(0,${requestColumnWidths[1]}fr) minmax(0,${requestColumnWidths[2]}fr) minmax(0,${requestColumnWidths[3]}fr) minmax(0,${requestColumnWidths[4]}fr)`;
    const requestColumnStyle = { "--leave-request-columns": requestColumnTemplate };
    const reviewColumnTemplate = `2.5rem minmax(0,${reviewColumnWidths[0]}fr) minmax(0,${reviewColumnWidths[1]}fr) minmax(0,${reviewColumnWidths[2]}fr) minmax(0,${reviewColumnWidths[3]}fr) minmax(0,${reviewColumnWidths[4]}fr) minmax(0,${reviewColumnWidths[5]}fr) minmax(0,${reviewColumnWidths[6]}fr)`;
    const reviewColumnStyle = { "--leave-review-columns": reviewColumnTemplate };
    const startRequestColumnResize = (event, index) => {
        event.preventDefault();
        const startX = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const snapshot = [...requestColumnWidths];
        const minimums = [0.55, 0.68, 0.28, 0.34, 0.3];
        setActiveRequestResize(index);
        const resize = (moveEvent) => {
            const shift = (moveEvent.clientX - startX) / 120;
            const left = Math.max(minimums[index], snapshot[index] + shift);
            const consumed = left - snapshot[index];
            const right = Math.max(minimums[index + 1], snapshot[index + 1] - consumed);
            const actualLeft = snapshot[index] + (snapshot[index + 1] - right);
            setRequestColumnWidths((current) => current.map((width, widthIndex) => widthIndex === index ? Number(actualLeft.toFixed(3)) : widthIndex === index + 1 ? Number(right.toFixed(3)) : width));
        };
        const stop = () => {
            setActiveRequestResize(-1);
            window.removeEventListener("pointermove", resize);
            window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointermove", resize);
        window.addEventListener("pointerup", stop);
    };
    const startReviewColumnResize = (event, index) => {
        event.preventDefault();
        const startX = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const snapshot = [...reviewColumnWidths];
        const minimums = [0.8, 0.48, 0.64, 0.25, 0.34, 0.25, 0.34];
        setActiveReviewResize(index);
        const resize = (moveEvent) => {
            const shift = (moveEvent.clientX - startX) / 120;
            const left = Math.max(minimums[index], snapshot[index] + shift);
            const consumed = left - snapshot[index];
            const right = Math.max(minimums[index + 1], snapshot[index + 1] - consumed);
            const actualLeft = snapshot[index] + (snapshot[index + 1] - right);
            setReviewColumnWidths((current) => current.map((width, widthIndex) => widthIndex === index ? Number(actualLeft.toFixed(3)) : widthIndex === index + 1 ? Number(right.toFixed(3)) : width));
        };
        const stop = () => {
            setActiveReviewResize(-1);
            window.removeEventListener("pointermove", resize);
            window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointermove", resize);
        window.addEventListener("pointerup", stop);
    };

    return (
        <div className="space-y-5">
            <nav ref={tabMenuRef} className="relative rounded-[1.3rem] border border-blue-100 bg-white/90 p-2 shadow-lg shadow-blue-500/5"><div className="flex min-w-0 items-center gap-2">{leaveTabs.map((item) => <button key={item.key} onClick={() => { setTab(item.key); setTabMenuOpen(false); }} className={`h-10 min-w-0 rounded-xl px-3 text-sm font-black transition sm:px-4 ${item.key === "review" ? "hidden lg:block" : "block"} ${tab === item.key ? "bg-blue-600 text-white shadow-lg shadow-blue-500/15" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}><span className="truncate">{item.label}</span></button>)}<button type="button" onClick={() => setApplyOpen(true)} className="ml-auto hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700 sm:inline-flex"><Plus size={15} />Apply Leave</button><button type="button" onClick={() => setTabMenuOpen((current) => !current)} className={`${tabOverflowClass} h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50`} title="More leave actions"><Ellipsis size={18} /></button></div>{tabMenuOpen && <div className={`${tabOverflowClass} absolute right-2 top-full z-40 mt-1 w-56 flex-col rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/20`}><button type="button" onClick={() => { setApplyOpen(true); setTabMenuOpen(false); }} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-black text-blue-600 hover:bg-blue-50 sm:hidden"><Plus size={15} />Apply Leave</button>{overflowTabs.map((item) => <button key={item.key} type="button" onClick={() => { setTab(item.key); setTabMenuOpen(false); }} className={`h-11 rounded-xl px-3 text-left text-sm font-black transition ${item.key === "review" ? "lg:hidden" : ""} ${tab === item.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}>{item.label}</button>)}</div>}</nav>
            {(canConfigure || canViewCompanyLeave) && (
                <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                    <SearchableSelect label="" value={branchFilter} onChange={setBranchFilter} options={[{ value: "", label: `All ${branchLabel.toLowerCase()}s` }, ...branchOptions]} placeholder={`All ${branchLabel.toLowerCase()}s`} />
                    <SearchableSelect label="" value={projectFilter} onChange={setProjectFilter} options={[{ value: "", label: `All ${projectLabel.toLowerCase()}s` }, ...projectOptions]} placeholder={`All ${projectLabel.toLowerCase()}s`} />
                </div>
            )}
            {tab === "requests" && <section className="overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white shadow-lg shadow-blue-500/5"><div className="grid gap-2 bg-blue-50/45 p-2 sm:grid-cols-2 xl:grid-cols-5">{[["Annual Entitlement", summary.entitlement, "border-blue-100 bg-white text-blue-600", "bg-blue-600"], ["Taken", summary.taken, "border-cyan-100 bg-cyan-50/80 text-cyan-700", "bg-cyan-500"], ["Pending", summary.pending, "border-amber-100 bg-amber-50/90 text-amber-700", "bg-amber-500"], ["Approved", summary.approved, "border-emerald-100 bg-emerald-50/90 text-emerald-700", "bg-emerald-500"], ["Available Balance", summary.available, "border-indigo-100 bg-indigo-50/85 text-indigo-700", "bg-indigo-500"]].map(([label, value, tone, dot]) => <div key={label} className={`rounded-2xl border px-4 py-3 text-center ${tone}`}><p className="inline-flex items-center gap-1.5 text-xs font-black"><i className={`h-2 w-2 rounded-full ${dot}`} />{label} ({year})</p><p className="mt-1 text-2xl font-black tracking-normal text-slate-950">{days(value)}</p></div>)}</div></section>}
            {tab === "requests" && <section className={`grid gap-5 transition-all duration-300 ${requestCalendarVisible ? "xl:grid-cols-[22rem_minmax(0,1fr)]" : "xl:grid-cols-1"} xl:items-start`}>
                {requestCalendarVisible && <div className="order-1 overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white p-4 shadow-lg shadow-blue-500/5 xl:sticky xl:top-5"><div className="flex items-start justify-between gap-2"><div><h2 className="text-base font-black">Leave Calendar</h2>
                    {/* <button type="button" onClick={() => setMonth(new Date())} className="mt-1 text-xs font-black text-blue-600 hover:text-blue-700">Jump to today</button> */}
                </div><button onClick={() => setRequestCalendarVisible(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600" title="Hide calendar"><X size={15} /></button></div><div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 p-1"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white hover:text-blue-600" title="Previous month"><ChevronLeft size={15} /></button><p className="text-sm font-black tracking-normal text-slate-800">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white hover:text-blue-600" title="Next month"><ChevronRight size={15} /></button></div><div className="mt-4 grid grid-cols-7 text-center text-sm font-black text-slate-400">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((item) => <span key={item}>{item}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1.5">{calendarDays.map(({ day, key, request, holiday, weekend }) => <span key={key} title={holiday?.name || request?.leave_type?.name || ""} className={`relative grid aspect-square place-items-center rounded-[1rem] text-sm font-black tracking-normal ${day.getMonth() !== month.getMonth() ? "text-slate-300" : holiday || weekend ? "bg-slate-50 text-slate-400" : request?.status === "approved" ? "bg-emerald-50 text-emerald-700" : request?.status === "pending" ? "bg-amber-50 text-amber-700" : key === todayInputValue() ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-700"}`}>{day.getDate()}{holiday && <i className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${key === todayInputValue() ? "bg-white" : "bg-slate-950"}`} />}</span>)}</div><div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-blue-50 pt-3 text-xs font-black text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Approved</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" />Pending</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-950" />Public holiday</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-100 ring-1 ring-slate-200" />Weekend</span></div></div>}
                <div className="order-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white shadow-lg shadow-blue-500/5 xl:max-h-[min(36rem,calc(100dvh-23rem))]">
                    <div className="flex flex-col gap-3 border-b border-blue-100 p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-black text-slate-950">My Leave Requests</h2><div className="flex flex-wrap gap-2">{!requestCalendarVisible && <button type="button" onClick={() => setRequestCalendarVisible(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50" title="Show calendar"><CalendarDays size={16} /></button>}<button type="button" onClick={() => downloadBalancePdf(year, balanceRows, user)} disabled={!balanceRows.length || !downloadsAllowed} title={!downloadsAllowed ? "Leave PDF downloads are available on Standard." : undefined} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-100 px-3 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Download size={15} />Balance PDF</button><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-blue-100 bg-slate-50 px-3 text-sm font-bold text-slate-700"><option value="">All status</option>{["pending", "approved", "rejected", "cancelled"].map((item) => <option key={item} value={item}>{display(item)}</option>)}</select></div></div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div style={requestColumnStyle} className="sticky top-0 z-10 hidden gap-3 border-b border-blue-50 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 md:grid md:[grid-template-columns:var(--leave-request-columns)]"><span className="font-black text-blue-600">Expand</span>{[["Leave Type", 0], ["Dates", 1], ["Days", 2], ["Status", 3]].map(([label, index]) => <span key={label} className="group relative min-w-0 select-none pr-2"><span className="block truncate">{label}</span><button type="button" onPointerDown={(event) => startRequestColumnResize(event, index)} className={`absolute -right-2 -top-2 h-8 w-4 cursor-col-resize touch-none rounded-full outline-none after:absolute after:left-1/2 after:top-1/2 after:h-5 after:w-0.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:transition ${activeRequestResize === index ? "bg-blue-100 after:bg-blue-600" : "after:bg-blue-300 hover:bg-blue-50 hover:after:bg-blue-600 focus-visible:bg-blue-50 focus-visible:after:bg-blue-600"}`} title={`Drag to resize ${label} column`} aria-label={`Drag to resize ${label} column`} /></span>)}<span className="flex items-center justify-end gap-1">Action{!requestCalendarVisible && <button type="button" onClick={() => setRequestCalendarVisible(true)} className="grid h-6 w-6 place-items-center rounded-md text-blue-600 hover:bg-blue-100" title="Show calendar"><CalendarDays size={13} /></button>}</span></div>
                        {requests.map((item) => {
                            const expanded = expandedRequestId === String(item.id);
                            return (
                                <article key={item.id} className="border-t border-blue-50">
                                    <div style={requestColumnStyle} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-3 text-sm md:items-center md:[grid-template-columns:var(--leave-request-columns)]">
                                        <button type="button" onClick={() => setExpandedRequestId(expanded ? "" : String(item.id))} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-blue-600 transition hover:bg-blue-50" title={expanded ? "Collapse request" : "Expand request"} aria-expanded={expanded}><ChevronDown size={15} className={`transition ${expanded ? "rotate-180" : ""}`} /></button>
                                        <button type="button" onClick={() => setExpandedRequestId(expanded ? "" : String(item.id))} title={item.leave_type.name} className="min-w-0 self-center truncate text-left font-medium text-slate-950">{item.leave_type.name}</button>
                                        <span title={`${formatDate(item.from_date)} - ${formatDate(item.to_date)}`} className="col-span-2 min-w-0 truncate font-medium text-slate-600 md:col-span-1 md:whitespace-nowrap"><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 md:hidden">Dates</i>{formatDate(item.from_date)} - {formatDate(item.to_date)}</span>
                                        <span className="w-fit rounded-xl bg-slate-50 px-2.5 py-1 font-medium text-slate-700"><i className="mr-2 not-italic text-[11px] uppercase text-slate-400 md:hidden">Days</i>{days(item.total_days)}</span>
                                        <span className="w-fit"><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 md:hidden">Status</i><Status value={item.status} /></span>
                                        <span className="col-span-2 flex gap-1 md:col-span-1 md:justify-end"><button type="button" onClick={() => setDetailItem(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50" title="View"><Eye size={14} /></button>{item.status === "pending" && <button type="button" onClick={() => cancelRequest.mutate(item.id, { onSuccess: () => { invalidate(); toast.success("Leave request cancelled"); }, onError: (error) => toast.error(error.message || "Unable to cancel") })} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50" title="Cancel"><Trash2 size={14} /></button>}</span>
                                    </div>
                                    {expanded &&
                                        <div className="grid gap-4 border-t border-blue-50 bg-blue-50/35 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-black text-slate-400 text-left">Reason</p>
                                                    <p className="mt-1 font-normal text-slate-700 text-left">{item.reason || "Not provided"}</p>
                                                </div>{Boolean(item.attachment_urls?.length) && <div><p className="text-xs font-black text-slate-400 text-left">Attachments</p><div className="mt-2 flex flex-wrap gap-2">{item.attachment_urls.map((url) => <span key={url} className="inline-flex max-w-full items-center gap-1 rounded-xl border border-blue-100 bg-white p-1"><button type="button" onClick={() => previewAttachment(url)} className="max-w-[13rem] truncate rounded-lg px-2 py-1 text-left text-xs font-black text-blue-600 hover:bg-blue-50" title="Preview in new tab">{attachmentName(url, storedAttachmentNames)}</button><button type="button" onClick={() => downloadAttachment(url, storedAttachmentNames)} className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" title="Download attachment"><Download size={13} /></button></span>)}</div></div>}</div><div className="grid content-start gap-1 text-left text-xs font-bold text-slate-500 sm:text-right"><span>{display(item.session)}</span><span>Applied {formatDateTime(item.created_at)}</span><span>{item.approvals.length} approval step{item.approvals.length === 1 ? "" : "s"}</span></div></div>}
                                </article>
                            );
                        })}
                        {!myRequests.isLoading && !requests.length && <div className="p-5"><EmptyState title="No leave requests" text="Submitted leave requests for the selected year appear here." /></div>}
                    </div>
                </div>
            </section>}
            {tab === "leave-calendar" && <section className="grid gap-5 2xl:h-[min(54rem,calc(100dvh-14rem))] 2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:items-stretch">
                <aside className="order-2 hidden min-h-0 overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white shadow-lg shadow-blue-500/5 2xl:order-1 2xl:sticky 2xl:top-5 2xl:block [&>div]:h-full">
                    <EmployeeLeaveDetails employee={selectedLeaveCalendarEmployee} month={month} summary={leaveCalendarSummary} requests={leaveCalendarMonthRequests} detail={setDetailItem} onDownload={() => downloadBalancePdf(year, balanceRows, user)} downloadDisabled={String(selectedLeaveCalendarEmployee?.id) !== String(user?.id) || !balanceRows.length || !downloadsAllowed} />
                </aside>
                <div className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white shadow-lg shadow-blue-500/5 2xl:order-2">
                    <div ref={teamPickerRef} className="relative flex flex-col gap-3 border-b border-blue-50 p-4 xl:flex-row xl:items-center xl:justify-between">
                        <div><h2 className="text-lg font-black text-slate-950">Leave Calendar</h2></div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canViewCompanyLeave && <div className="flex -space-x-2">{leaveCalendarTeamAvatars.slice(0, 4).map((item, index) => <span key={item.id} className={index < 2 ? "relative" : index < 3 ? "relative hidden sm:block" : "relative hidden lg:block"}><EmployeeAvatarButton employee={item} selected={String(item.id) === String(selectedLeaveCalendarEmployee?.id)} onClick={() => { setLeaveCalendarEmployeeId(item.id); setTeamPickerOpen(false); }} /></span>)}{leaveCalendarTeamAvatars.length > 2 && <button type="button" onClick={() => setTeamPickerOpen((current) => !current)} className="grid h-9 min-w-9 place-items-center rounded-full border-2 border-white bg-slate-900 px-2 text-xs font-black text-white shadow-sm sm:hidden">+{leaveCalendarTeamAvatars.length - 2}</button>}{leaveCalendarTeamAvatars.length > 3 && <button type="button" onClick={() => setTeamPickerOpen((current) => !current)} className="hidden h-9 min-w-9 place-items-center rounded-full border-2 border-white bg-slate-900 px-2 text-xs font-black text-white shadow-sm sm:grid lg:hidden">+{leaveCalendarTeamAvatars.length - 3}</button>}{leaveCalendarTeamAvatars.length > 4 && <button type="button" onClick={() => setTeamPickerOpen((current) => !current)} className="hidden h-9 min-w-9 place-items-center rounded-full border-2 border-white bg-slate-900 px-2 text-xs font-black text-white shadow-sm lg:grid">+{leaveCalendarTeamAvatars.length - 4}</button>}</div>}
                            {canViewCompanyLeave && <button type="button" onClick={() => setTeamPickerOpen((current) => !current)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-100 px-3 text-xs font-black text-blue-600 hover:bg-blue-50"><UsersRound size={14} />My {departmentLabel}</button>}
                            <button type="button" onClick={() => setLeaveDetailsOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-100 px-3 text-xs font-black text-blue-600 hover:bg-blue-50 2xl:hidden"><Eye size={14} />Details</button>
                            <YearPicker value={year} years={[currentYear - 1, currentYear, currentYear + 1]} onChange={(nextYear) => { setYear(nextYear); setMonth((current) => new Date(nextYear, current.getMonth(), 1)); }} />
                            <span className="inline-flex items-center rounded-2xl border border-blue-100 bg-slate-50 p-1">
                                <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-xl text-slate-600 hover:bg-white hover:text-blue-600" title="Previous month"><ChevronLeft size={15} /></button>
                                <span className="whitespace-nowrap px-1 text-center text-sm font-black tracking-normal text-slate-800 sm:px-2">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                                <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-xl text-slate-600 hover:bg-white hover:text-blue-600" title="Next month"><ChevronRight size={15} /></button>
                            </span>
                        </div>
                        {teamPickerOpen && canViewCompanyLeave && <div className="absolute left-3 right-3 top-full z-30 mt-1 rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/20 sm:left-auto sm:right-4 sm:w-[min(22rem,calc(100vw-3rem))]">
                            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={leaveCalendarEmployeeQuery} onChange={(event) => setLeaveCalendarEmployeeQuery(event.target.value)} placeholder="Search employee" className="h-11 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100" /></div>
                            <div className="mt-2 max-h-72 space-y-1 overflow-auto">{visibleLeaveCalendarEmployees.map((item) => <button key={item.id} type="button" onClick={() => { setLeaveCalendarEmployeeId(item.id); setTeamPickerOpen(false); setLeaveCalendarEmployeeQuery(""); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${String(item.id) === String(selectedLeaveCalendarEmployee?.id) ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}><EmployeeAvatar employee={item} className="h-9 w-9" fallbackClassName="text-[10px]" /><span className="min-w-0"><b className="block truncate text-sm">{employeeLabel(item)}</b><span className={`block truncate text-xs font-bold ${String(item.id) === String(selectedLeaveCalendarEmployee?.id) ? "text-blue-100" : "text-slate-500"}`}>{employeePosition(item)}</span></span></button>)}{!visibleLeaveCalendarEmployees.length && <p className="px-3 py-4 text-center text-sm font-bold text-slate-400">No employee found</p>}</div>
                        </div>}
                    </div>
                    <div className="flex min-h-[26rem] flex-1 px-2 py-3 sm:min-h-[31rem] sm:px-4 sm:py-4 2xl:min-h-0">
                        <div className="flex min-h-0 w-full flex-col">
                            <div className="grid shrink-0 grid-cols-7 text-center text-[10px] font-black text-slate-400 sm:text-xs">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((item) => <span key={item} className="px-0.5 py-1.5 sm:px-2 sm:py-2">{item}</span>)}</div>
                            <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-0.5 sm:gap-1">{leaveCalendarDays.map(({ day, key, holiday, weekend, requests: dayRequests }) => {
                                const leaveRequest = dayRequests[0];
                                const disabledTone = day.getMonth() !== month.getMonth()
                                    ? "text-slate-300"
                                    : holiday || weekend
                                        ? "bg-slate-50 text-slate-400"
                                        : "text-slate-950";
                                const todayTone = key === todayInputValue() && !leaveRequest && !holiday && !weekend
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/15"
                                    : "";
                                const requestShape = leaveRequest ? rangeCellClass(day, leaveRequest) : null;
                                const requestTone = leaveRequest ? `${leaveCalendarDayTone[leaveRequest.status] || leaveCalendarDayTone.pending} ${requestShape.className}` : "";
                                return <div key={key} title={holiday?.name || leaveRequest?.leave_type?.name || ""} style={requestShape?.style} className={`relative min-h-[3.35rem] min-w-0 overflow-visible rounded-xl p-1 sm:min-h-[4.2rem] sm:rounded-2xl sm:p-1.5 2xl:min-h-0 ${disabledTone} ${todayTone} ${requestTone}`}>
                                    {leaveRequest && <button type="button" onClick={() => setDetailItem(leaveRequest)} aria-label={`${display(leaveRequest.status)} ${leaveRequest.leave_type.name}: ${formatDate(leaveRequest.from_date)} - ${formatDate(leaveRequest.to_date)}`} className="absolute inset-0 z-[1] rounded-[inherit]" />}
                                    <div className="pointer-events-none relative z-[2] grid h-full place-items-center">
                                        <b className="text-sm sm:text-base">{day.getDate()}</b>
                                    </div>
                                    {holiday && <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full sm:bottom-2 sm:h-2 sm:w-2 ${key === todayInputValue() ? "bg-white" : "bg-slate-950"}`} />}
                                </div>;
                            })}</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-3 border-t border-blue-50 px-4 py-4 text-sm font-black text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-emerald-500" />Approved</span><span className="inline-flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-amber-500" />Pending</span><span className="inline-flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-slate-950" />Public holiday</span><span className="inline-flex items-center gap-2"><i className="h-3.5 w-3.5 rounded-full bg-slate-100 ring-1 ring-slate-200" />Weekend</span></div>
                </div>
            </section>}
            {tab === "leave-calendar" && leaveDetailsOpen && <div className="fixed inset-0 z-[125] bg-slate-950/35 backdrop-blur-sm 2xl:hidden" role="dialog" aria-modal="true" aria-label="Employee leave details">
                <button type="button" onClick={() => setLeaveDetailsOpen(false)} className="absolute inset-0" aria-label="Close employee leave details" />
                <aside className="absolute inset-y-0 right-0 z-[1] w-[min(26rem,calc(100vw-1rem))] overflow-auto rounded-l-[1.6rem] border border-blue-100 bg-white shadow-2xl shadow-blue-950/25 sm:inset-y-4 sm:right-4 sm:rounded-[1.6rem]">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-50 bg-white/95 px-4 py-3 backdrop-blur">
                        <p className="text-sm font-black text-slate-950">Leave Details</p>
                        <button type="button" onClick={() => setLeaveDetailsOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600" title="Close details"><X size={16} /></button>
                    </div>
                    <EmployeeLeaveDetails employee={selectedLeaveCalendarEmployee} month={month} summary={leaveCalendarSummary} requests={leaveCalendarMonthRequests} detail={(item) => { setLeaveDetailsOpen(false); setDetailItem(item); }} onDownload={() => downloadBalancePdf(year, balanceRows, user)} downloadDisabled={String(selectedLeaveCalendarEmployee?.id) !== String(user?.id) || !balanceRows.length || !downloadsAllowed} />
                </aside>
            </div>}
            {tab === "review" && canReview && <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white shadow-lg shadow-blue-500/5">
                <div className="flex flex-col gap-4 border-b border-blue-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950 text-left">Admin Review Queue</h2>
                        {/* <p className="mt-1 text-sm font-medium text-slate-500">Review pending leave with employee context and live balance.</p> */}
                    </div>
                    <label className="relative block w-full lg:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={reviewSearch} onChange={(event) => setReviewSearch(event.target.value)} placeholder="Search employee, role or leave type" className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                    </label>
                </div>
                <div className="min-h-0 overflow-auto">
                    <div style={reviewColumnStyle} className="sticky top-0 z-10 hidden gap-3 border-b border-blue-50 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-normal text-slate-500 lg:grid lg:[grid-template-columns:var(--leave-review-columns)]">
                        <span />
                        {[["Employee", 0], ["Leave Type", 1], ["Date", 2], ["Days", 3], ["Remaining", 4], ["Total", 5]].map(([label, index]) => <span key={label} className="group relative min-w-0 select-none pr-2"><span className="block truncate text-left">{label}</span><button type="button" onPointerDown={(event) => startReviewColumnResize(event, index)} className={`absolute -right-2 -top-2 h-8 w-4 cursor-col-resize touch-none rounded-full outline-none after:absolute after:left-1/2 after:top-1/2 after:h-5 after:w-0.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:transition ${activeReviewResize === index ? "bg-blue-100 after:bg-blue-600" : "after:bg-blue-300 hover:bg-blue-50 hover:after:bg-blue-600 focus-visible:bg-blue-50 focus-visible:after:bg-blue-600"}`} title={`Drag to resize ${label} column`} aria-label={`Drag to resize ${label} column`} /></span>)}
                        <span className="text-left">Action</span>
                    </div>
                    {visibleReviewRows.map((item) => {
                        const expanded = expandedReviewId === String(item.id);
                        const employee = reviewEmployee(item);
                        return <article key={item.id} className="border-t border-blue-50 first:border-t-0">
                            <div style={reviewColumnStyle} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center lg:[grid-template-columns:var(--leave-review-columns)]">
                                <button type="button" onClick={() => setExpandedReviewId(expanded ? "" : String(item.id))} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50" title={expanded ? "Hide details" : "Show reason and attachments"} aria-expanded={expanded}><ChevronDown size={15} className={`transition ${expanded ? "rotate-180" : ""}`} /></button>
                                <div className="flex min-w-0 items-center gap-3">
                                    <EmployeeAvatar employee={employee} className="h-11 w-11" fallbackClassName="text-xs" />
                                    <div className="min-w-0 text-left">
                                        <p className="truncate font-semibold text-slate-950">{employeeLabel(employee)}</p>
                                        <p className="truncate text-xs font-medium text-slate-500">{employeePosition(employee)}{employee.department ? ` · ${employee.department}` : ""}</p>
                                    </div>
                                </div>
                                <p className="min-w-0 text-left font-medium text-slate-800 sm:col-start-2 lg:col-start-auto lg:truncate"><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 lg:hidden">Type</i>{item.leave_type.name}</p>
                                <p className="min-w-0 text-left font-medium text-slate-600 sm:col-start-2 lg:col-start-auto lg:truncate" title={`${formatDate(item.from_date)} - ${formatDate(item.to_date)}`}><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 lg:hidden">Date</i>{formatDate(item.from_date)} - {formatDate(item.to_date)}</p>
                                <p className="w-fit rounded-xl bg-blue-50 px-2.5 py-1 font-medium text-blue-700 sm:col-start-2 lg:col-start-auto"><i className="mr-2 not-italic text-[11px] font-black uppercase text-blue-400 lg:hidden">Days</i>{days(item.total_days)}</p>
                                <p className="text-left font-medium text-slate-700 sm:col-start-2 lg:col-start-auto"><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 lg:hidden">Remaining</i>{days(item.balance?.available_days)}</p>
                                <p className="text-left font-medium text-slate-700 sm:col-start-2 lg:col-start-auto"><i className="mr-2 not-italic text-[11px] font-black uppercase text-slate-400 lg:hidden">Total</i>{days(item.balance?.entitlement_days)}</p>
                                <button type="button" onClick={() => { setReviewItem(item); setReviewNote(""); }} className="h-10 rounded-xl border border-blue-100 px-3 text-sm font-black text-blue-600 hover:bg-blue-50 sm:col-start-3 sm:row-span-5 sm:row-start-1 lg:col-start-auto lg:row-span-1">Review</button>
                            </div>
                            {expanded && <div className="grid gap-4 border-t border-blue-50 bg-blue-50/35 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]">
                                <div className="space-y-3 text-left text-sm">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-normal text-slate-400">Reason</p>
                                        <p className="mt-1 font-normal text-slate-700">{item.reason || "Not provided"}</p>
                                    </div>
                                    {Boolean(item.attachment_urls?.length) && <div>
                                        <p className="text-xs font-black uppercase tracking-normal text-slate-400">Attachments</p>
                                        <div className="mt-2 flex flex-wrap gap-2">{item.attachment_urls.map((url) => <span key={url} className="inline-flex max-w-full items-center gap-1 rounded-xl border border-blue-100 bg-white p-1"><button type="button" onClick={() => previewAttachment(url)} className="max-w-[15rem] truncate rounded-lg px-2 py-1 text-left text-xs font-black text-blue-600 hover:bg-blue-50" title="Preview in new tab">{attachmentName(url, storedAttachmentNames)}</button><button type="button" onClick={() => downloadAttachment(url, storedAttachmentNames)} className="grid h-7 w-7 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" title="Download attachment"><Download size={13} /></button></span>)}</div>
                                    </div>}
                                </div>
                                <div className="grid content-start gap-1 text-left text-xs font-bold text-slate-500 md:text-right">
                                    <span>{display(item.session)}</span>
                                    <span>Applied {formatDateTime(item.created_at)}</span>
                                    <span>{item.balance ? `${days(item.balance.taken_days)} taken · ${days(item.balance.pending_days)} pending` : "Balance unavailable"}</span>
                                </div>
                            </div>}
                        </article>;
                    })}
                    {!companyRequests.isLoading && !pendingReviewRows.length && <div className="p-5"><EmptyState title="Queue clear" text="Pending leave requests will arrive here for admin decision." /></div>}
                    {!companyRequests.isLoading && pendingReviewRows.length > 0 && !visibleReviewRows.length && <div className="p-5"><EmptyState title="No review result" text="Try a different employee, role, or leave type." /></div>}
                </div>
            </section>}
            {applyOpen && (
                <Modal title="Apply Leave" onClose={() => setApplyOpen(false)}>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (requestLimitMessage) {
                                toast.error(requestLimitMessage);
                                return;
                            }
                            setPreviewOpen(true);
                        }}
                        className="grid gap-4 p-5"
                    >
                        <Field label="Leave type">
                            <LeaveTypePicker value={requestForm.leave_type_id} options={activeLeaveTypes} onChange={(value) => setRequestForm((current) => ({ ...current, leave_type_id: value }))} />
                        </Field>
                        {selectedBalance && (
                            <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                                <div>
                                    <p className="font-black text-slate-950">{selectedBalance.name}</p>
                                    <p className="text-xs font-bold text-slate-500">Taken {days(selectedBalance.taken_days)} · Pending {days(selectedBalance.pending_days)}</p>
                                </div>
                                <p className="rounded-xl bg-white px-3 py-2 text-right font-black text-blue-700">
                                    {selectedBalance.entitlement_days === null ? "Unlimited balance" : `${days(selectedBalance.available_days)} remaining / ${days(selectedBalance.entitlement_days)} total`}
                                </p>
                            </div>
                        )}
                        <Field label="Leave dates">
                            <LeaveRangePicker form={requestForm} year={year} onChange={(value) => setRequestForm((current) => ({ ...current, ...value }))} />
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                            <Field label="Session">
                                <div className="flex gap-3">
                                    {["full_day", "half_day"].map((item) => <label key={item} className="inline-flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-bold transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"><input type="radio" checked={requestForm.session === item} onChange={() => setRequestForm((current) => ({ ...current, session: item, to_date: item === "half_day" ? current.from_date : current.to_date }))} />{display(item)}</label>)}
                                </div>
                            </Field>
                            <Field label="Total in days">
                                <input readOnly value={requestedDays === null ? "" : formatDayAmount(requestedDays)} placeholder="0" className={`${inputClassName} bg-blue-50 font-black text-blue-700`} />
                            </Field>
                        </div>
                        <p className={`rounded-2xl px-3 py-2 text-xs font-bold ${requestLimitMessage ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-500"}`}>
                            {requestLimitMessage || "Total days are calculated from selected working dates. Saturdays, Sundays, and imported public holidays are excluded."}
                        </p>
                        <Field label="Reason (optional)"><textarea value={requestForm.reason} onChange={(event) => setRequestForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className={`${inputClassName} h-auto py-3`} /></Field>
                        <label className={`grid gap-2 rounded-2xl border border-dashed border-blue-200 p-4 text-sm font-bold text-blue-600 transition ${upload.isPending ? "cursor-wait bg-blue-50/70" : "hover:bg-blue-50/40"}`}>
                            <span className="inline-flex items-center gap-2">{upload.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <FileUp size={16} />}{upload.isPending ? "Uploading attachment..." : "Add attachment (optional)"}</span>
                            <input type="file" disabled={upload.isPending} className="text-xs text-slate-500 disabled:cursor-wait disabled:opacity-60" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadAttachment(file); event.target.value = ""; }} />
                            {upload.isPending && <span className="text-xs font-bold text-slate-500">Keep this form open while the file is uploaded.</span>}
                        </label>
                        {removingAttachmentUrl && <p className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500"><LoaderCircle size={14} className="animate-spin text-blue-600" />Removing attachment from storage...</p>}
                        {requestForm.attachment_urls.length > 0 && (
                            <div className="space-y-2">
                                {requestForm.attachment_urls.map((url) => (
                                    <div key={url} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                                        <span className="min-w-0 truncate font-medium text-slate-700">{attachmentName(url, draftAttachmentNames)}</span>
                                        <span className="flex shrink-0 gap-1">
                                            <button type="button" onClick={() => previewAttachment(url)} className="h-8 rounded-xl border border-blue-100 px-3 text-xs font-black text-blue-600 hover:bg-blue-50">Preview</button>
                                            <button type="button" onClick={() => removeAttachment(url)} className="grid h-8 w-8 place-items-center rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50" title="Remove attachment"><Trash2 size={14} /></button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!activeLeaveTypes.length && <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">No active leave types are configured yet. An admin can add them in Rules, under Leave Rules.</p>}
                        <button disabled={createRequest.isPending || upload.isPending || deleteAttachment.isPending || !activeLeaveTypes.length || !requestForm.leave_type_id || !requestForm.from_date || !requestForm.to_date || Boolean(requestLimitMessage)} className="h-12 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-50">Preview Request</button>
                    </form>
                </Modal>
            )}
            {previewOpen && <Modal title="Preview Leave Request" onClose={() => setPreviewOpen(false)}><div className="space-y-4 p-5"><div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm">{[["Leave type", selectedLeaveType?.name || "-"], ["Dates", `${formatDate(requestForm.from_date)} - ${formatDate(requestForm.to_date)}`], ["Session", display(requestForm.session)], ["Total days", requestedDays === null ? "-" : days(requestedDays)], ["Reason", requestForm.reason.trim() || "Not provided"], ["Attachments", requestForm.attachment_urls.length || "None"]].map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-1"><span className="font-bold text-slate-500">{label}</span><b className="text-slate-950">{value}</b></div>)}</div>{selectedBalance && selectedBalance.entitlement_days !== null && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{days(selectedBalance.available_days)} remaining before this request from {days(selectedBalance.entitlement_days)} total.</p>}<div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setPreviewOpen(false)} className="h-11 rounded-xl border border-blue-100 text-sm font-black text-slate-600 hover:bg-blue-50">Edit</button><button type="button" disabled={createRequest.isPending} onClick={submitLeaveRequest} className="h-11 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-50">{createRequest.isPending ? "Submitting..." : "Confirm & Submit"}</button></div></div></Modal>}
            {detailItem && <Modal title="Leave Request Details" onClose={() => setDetailItem(null)}><div className="space-y-3 p-5 text-left text-sm">{[["Leave type", detailItem.leave_type.name], ["Employee", employeeName(detailItem)], [departmentLabel, detailItem.employee_snapshot?.department || "Not set"], ["From date", formatDate(detailItem.from_date)], ["To date", formatDate(detailItem.to_date)], ["Total days", days(detailItem.total_days)], ["Session", display(detailItem.session)], ["Reason", detailItem.reason || "Not provided"], ["Applied on", formatDateTime(detailItem.created_at)]].map(([label, value]) => <div key={label} className="grid grid-cols-[120px_1fr] gap-3"><span className="font-bold text-slate-500">{label}</span><b>{value}</b></div>)}<div className="w-fit"><Status value={detailItem.status} /></div>{Boolean(detailItem.attachment_urls?.length) && <div className="border-t border-blue-100 pt-4"><p className="font-black">Attachments</p><div className="mt-2 space-y-2">{detailItem.attachment_urls.map((url) => <div key={url} className="flex items-center gap-2 rounded-xl border border-blue-100 p-1"><button type="button" onClick={() => previewAttachment(url)} className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-left font-black text-blue-600 hover:bg-blue-50" title="Preview in new tab">{attachmentName(url, storedAttachmentNames)}</button><button type="button" onClick={() => downloadAttachment(url, storedAttachmentNames)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" title="Download attachment"><Download size={15} /></button></div>)}</div></div>}<div className="mt-4 border-t border-blue-100 pt-4"><p className="font-black">Approval flow</p>{detailItem.approvals.map((item) => <p key={item.id} className="mt-2 text-sm font-bold text-slate-600">Level {item.level}: {display(item.status)} {item.decided_at ? ` · ${formatDateTime(item.decided_at)}` : ""}</p>)}</div></div></Modal>}
            {reviewItem && <Modal title="Review Leave Request" onClose={() => setReviewItem(null)}><div className="space-y-4 p-5"><div className="rounded-2xl bg-slate-50 p-4"><b>{employeeName(reviewItem)}</b><p className="mt-1 text-sm font-bold text-slate-500">{reviewItem.leave_type.name} · {formatDate(reviewItem.from_date)} - {formatDate(reviewItem.to_date)} · {days(reviewItem.total_days)}</p><p className="mt-3 text-sm">{reviewItem.reason}</p></div><Field label="Decision note"><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} className={`${inputClassName} h-auto py-3`} /></Field><div className="grid grid-cols-2 gap-2">{["approved", "rejected"].map((decision) => <button key={decision} onClick={() => reviewRequest.mutate({ id: reviewItem.id, data: { status: decision, note: reviewNote || undefined } }, { onSuccess: () => { setReviewItem(null); invalidate(); toast.success(`Leave ${decision}`); }, onError: (error) => toast.error(error.message || "Unable to review leave") })} className={`h-11 rounded-xl text-sm font-black text-white ${decision === "approved" ? "bg-emerald-600" : "bg-rose-600"}`}>{display(decision)}</button>)}</div></div></Modal>}
        </div>
    );
}
