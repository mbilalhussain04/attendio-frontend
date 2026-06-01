import React, { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Edit3, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/auth-context.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { SearchableSelect } from "../../components/form/GeoFields.jsx";
import { getInitials } from "../../utils";
import { useBranchesQuery, useProjectsQuery } from "../../hooks/useAuthService.ts";
import { useOrganizationQuery } from "../../hooks/useEmployeeService.ts";
import { useBillingEntitlements } from "../../hooks/useBillingService.ts";
import {
    useDeleteScheduleAssignmentMutation,
    useSaveScheduleAssignmentMutation,
    useSaveShiftTemplateMutation,
    useScheduleAssignmentsQuery,
    useShiftTemplatesQuery,
} from "../../hooks/useSchedulingService.ts";
import { labelFor, resolveWorkspaceProfile } from "../../config/workspaceProfiles.js";

const inputClass = "h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100";
const shiftColors = ["#22c55e", "#8b5cf6", "#2563eb", "#f59e0b", "#0ea5e9", "#14b8a6", "#a855f7", "#64748b"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const shiftPresets = [
    { value: "Morning shift", label: "Morning", start_time: "06:00", end_time: "14:00", break_minutes: 30, color: "#22c55e" },
    { value: "Afternoon shift", label: "Afternoon", start_time: "14:00", end_time: "22:00", break_minutes: 30, color: "#f59e0b" },
    { value: "Evening shift", label: "Evening", start_time: "16:00", end_time: "00:00", break_minutes: 30, color: "#8b5cf6" },
    { value: "Night shift", label: "Night", start_time: "22:00", end_time: "06:00", break_minutes: 45, color: "#2563eb" },
    { value: "Day shift", label: "Day", start_time: "09:00", end_time: "17:00", break_minutes: 30, color: "#0ea5e9" },
    { value: "Custom shift", label: "Custom", start_time: "09:00", end_time: "17:00", break_minutes: 30, color: "#14b8a6" },
];
const calendarPresets = [
    { value: "Meeting", label: "Meeting", start_time: "09:00", end_time: "10:00", break_minutes: 0, color: "#2563eb" },
    { value: "Focus time", label: "Focus time", start_time: "10:00", end_time: "12:00", break_minutes: 0, color: "#14b8a6" },
    { value: "Workshop", label: "Workshop", start_time: "13:00", end_time: "15:00", break_minutes: 0, color: "#8b5cf6" },
    { value: "Client call", label: "Client call", start_time: "15:00", end_time: "16:00", break_minutes: 0, color: "#0ea5e9" },
    { value: "Custom event", label: "Custom", start_time: "09:00", end_time: "10:00", break_minutes: 0, color: "#64748b" },
];
const educationPresets = [
    { value: "Class", label: "Class", start_time: "08:00", end_time: "09:30", break_minutes: 0, color: "#2563eb" },
    { value: "Training session", label: "Training", start_time: "10:00", end_time: "12:00", break_minutes: 0, color: "#14b8a6" },
    { value: "Exam", label: "Exam", start_time: "09:00", end_time: "11:00", break_minutes: 0, color: "#f59e0b" },
    { value: "Consultation", label: "Consultation", start_time: "14:00", end_time: "15:00", break_minutes: 0, color: "#8b5cf6" },
    { value: "Custom event", label: "Custom", start_time: "09:00", end_time: "10:00", break_minutes: 0, color: "#64748b" },
];
const schedulingCopyFor = (company = {}) => {
    const profile = resolveWorkspaceProfile(company);
    const industry = String(company.industry || "").toLowerCase();
    const calendarFirst = profile.operating_model === "project_based";
    const education = industry.includes("education") || industry.includes("ausbildung") || industry.includes("school");
    if (education) {
        return { calendarFirst: true, title: "Learning Calendar", item: "session", itemTitle: "Session", typeLabel: "Session type", typeFilter: "All session types", create: "Create Session", details: "Session details", newDetails: "New session details", empty: "No session", presets: educationPresets };
    }
    if (calendarFirst) {
        return { calendarFirst: true, title: "Team Calendar", item: "event", itemTitle: "Event", typeLabel: "Event type", typeFilter: "All event types", create: "Create Event", details: "Event details", newDetails: "New event details", empty: "No event", presets: calendarPresets };
    }
    return { calendarFirst: false, title: "Scheduling System", item: "shift", itemTitle: "Shift", typeLabel: "Shift type", typeFilter: "All shifts", create: "Create Schedule", details: "Shift details", newDetails: "New shift details", empty: "Off", presets: shiftPresets };
};
const emptyShift = { name: "", code: "", start_time: "09:00", end_time: "17:00", break_minutes: 30, color: "#2563eb", status: "active" };
const emptyAssignment = { id: "", employee_id: "", shift_template_id: "", work_date: "", end_date: "", days_of_week: [], status: "published", notes: "", location: "", repeat_rule: "none" };

const pad = (value) => String(value).padStart(2, "0");
const toDateValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = (value) => {
    const [year, month, day] = String(value || toDateValue(new Date())).split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};
const startOfWeek = (date) => {
    const next = new Date(date);
    const day = (next.getDay() + 6) % 7;
    next.setDate(next.getDate() - day);
    return next;
};
const addDays = (date, amount) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};
const monthName = (date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
const sameMonth = (left, right) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const fullName = (employee) => [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || employee?.email || "Employee";
const employeeRole = (employee) => employee?.job_title || employee?.role_name || employee?.role_key || "Employee";
const employeeAvatar = (employee) => employee?.profile_picture || employee?.avatar_url || employee?.profile_picture_url;
const timeRange = (item) => `${item?.start_time || "--:--"} - ${item?.end_time || "--:--"}`;
const colorStyles = (color = "#2563eb") => ({ backgroundColor: `${color}14`, borderColor: `${color}30`, color });
const conflictCardStyles = { backgroundColor: "#fff1f2", borderColor: "#ef4444", color: "#991b1b", boxShadow: "inset 0 0 0 1px #ef4444" };
const scheduleStatuses = [
    { value: "scheduled", label: "Scheduled" },
    { value: "published", label: "Published" },
    { value: "completed", label: "Completed" },
    { value: "late", label: "Late" },
    { value: "absent", label: "Absent" },
    { value: "no_show", label: "No-show" },
    { value: "sick", label: "Sick" },
    { value: "excused", label: "Excused" },
];
const statusLabel = (value) => scheduleStatuses.find((item) => item.value === value)?.label || value || "Scheduled";
const employmentStartValue = (employee) => employee?.contract_start_date || employee?.employment_start_date || employee?.hire_date || employee?.start_date || employee?.joining_date || employee?.created_at;
const weekdayIndex = (value) => (parseDate(value).getDay() + 6) % 7;
const minuteValue = (value) => {
    const [hour, minute] = String(value || "00:00").split(":").map(Number);
    return (hour || 0) * 60 + (minute || 0);
};
const timeRanges = (item) => {
    const start = minuteValue(item?.start_time);
    const end = minuteValue(item?.end_time);
    if (end > start) return [[start, end]];
    return [[start, 1440], [0, end]];
};
const isDuplicateScheduleConflict = (left, right) => (
    String(left?.shift_template_id || "") === String(right?.shift_template_id || "")
    || String(left?.shift_name || "").toLowerCase() === String(right?.shift_name || "").toLowerCase()
    || (String(left?.start_time || "") === String(right?.start_time || "") && String(left?.end_time || "") === String(right?.end_time || ""))
);
const uniqueItems = (items) => [...new Set(items.filter(Boolean).map(String))];
const uniqueById = (items) => [...new Map(items.map((item) => [String(item.id), item])).values()];
const readDraggedAssignment = (event) => {
    try {
        return JSON.parse(event.dataTransfer.getData("application/json") || "null");
    } catch {
        return null;
    }
};
const writeDraggedAssignment = (event, row) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(row));
    event.dataTransfer.setData("text/plain", String(row.id || ""));
};
const scheduleDates = (startValue, endValue, selectedDays) => {
    const start = parseDate(startValue);
    const end = endValue ? parseDate(endValue) : start;
    if (end < start) return [];
    const selected = new Set((selectedDays || []).map(Number));
    const dates = [];
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
        const iso = toDateValue(date);
        if (!selected.size || selected.has(weekdayIndex(iso))) dates.push(iso);
    }
    return dates;
};
const weekdaysBetween = (startValue, endValue = "") => {
    if (!startValue) return [];
    const start = parseDate(startValue);
    const end = endValue && parseDate(endValue) >= start ? parseDate(endValue) : start;
    const days = new Set();
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) days.add((date.getDay() + 6) % 7);
    return [...days].sort((left, right) => left - right);
};
const nearestDateForWeekday = (startValue, dayIndex) => {
    const start = parseDate(startValue);
    const current = (start.getDay() + 6) % 7;
    return toDateValue(addDays(start, (Number(dayIndex) - current + 7) % 7));
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
const downloadSchedulePdf = ({ filename, rows, title, subtitle, user, labels }) => {
    const pageWidth = 595;
    const pageHeight = 842;
    const text = (value, x, y, size = 9, bold = false) => `BT /F${bold ? "B" : "R"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`;
    const rect = (x, y, w, h, fill = false) => `${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}`;
    const line = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S`;
    const chunks = [];
    for (let index = 0; index < rows.length; index += 30) chunks.push(rows.slice(index, index + 30));
    const pages = chunks.length ? chunks : [[]];
    const objects = [];
    const pageIds = [];
    const addObject = (body) => {
        objects.push(body);
        return objects.length + 4;
    };
    const columns = [72, 96, 72, 72, 62, 52, 98];
    const headers = ["Date", "Employee", labels.project || "Shift", "Time", "Break", "Status", "Notes"];
    pages.forEach((chunk, pageIndex) => {
        const ops = ["1 1 1 rg", rect(0, 0, pageWidth, pageHeight, true)];
        ops.push("0.02 0.45 0.98 rg", rect(48, 760, 40, 40, true));
        ops.push("1 1 1 rg", rect(58, 770, 20, 20, true));
        ops.push("0.03 0.09 0.22 rg", text("Attendio", 104, 773, 26, true));
        ops.push(text(title, 48, 722, 18, true));
        ops.push(text(subtitle, 48, 704, 10));
        ops.push(text(`Generated: ${new Date().toLocaleString()}`, 365, 704, 9, true));
        ops.push(text(`Workspace: ${user?.company?.name || "Company"}`, 48, 686, 9));
        ops.push(text(`Page ${pageIndex + 1} of ${pages.length}`, 482, 686, 9));
        const tableX = 42;
        const tableW = columns.reduce((total, width) => total + width, 0);
        let y = 648;
        ops.push("0.02 0.45 0.98 rg", rect(tableX, y, tableW, 20, true));
        let x = tableX;
        headers.forEach((header, index) => {
            ops.push("1 1 1 rg", text(header, x + 4, y + 7, 8, true));
            x += columns[index];
        });
        chunk.forEach((row, rowIndex) => {
            y -= 18;
            if (rowIndex % 2 === 0) ops.push("0.98 0.99 1 rg", rect(tableX, y, tableW, 18, true));
            x = tableX;
            const cells = [
                row.work_date,
                row.employee,
                row.shift,
                row.time,
                row.break,
                row.status,
                row.notes,
            ];
            cells.forEach((cell, index) => {
                ops.push("0.03 0.09 0.22 rg", text(String(cell || "-").slice(0, index === 6 ? 22 : 16), x + 4, y + 6, 7));
                x += columns[index];
            });
            ops.push("0.82 0.86 0.92 RG", line(tableX, y, tableX + tableW, y));
        });
        ops.push("0.48 0.52 0.60 RG", rect(tableX, y, tableW, 668 - y));
        let borderX = tableX;
        columns.forEach((width) => {
            borderX += width;
            ops.push(line(borderX, y, borderX, 668));
        });
        ops.push("0.03 0.09 0.22 rg", text("System generated schedule report.", 48, 36, 8));
        const stream = ops.join("\n");
        const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        const pageId = addObject(`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /FR 1 0 R /FB 2 0 R >> >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
    });
    const allObjects = [
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`,
        "<< /Type /Catalog /Pages 3 0 R >>",
        ...objects,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    allObjects.forEach((body, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const start = pdf.length;
    pdf += `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root 4 0 R >>\nstartxref\n${start}\n%%EOF`;
    downloadBlob(filename, new Blob([pdf], { type: "application/pdf" }));
};

function dateRange(anchorValue, viewMode) {
    const anchor = parseDate(anchorValue);
    if (viewMode === "month") {
        const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
        const days = [];
        for (let date = new Date(start); date <= end; date = addDays(date, 1)) days.push(new Date(date));
        return { from: toDateValue(start), to: toDateValue(end), days };
    }
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    return { from: toDateValue(days[0]), to: toDateValue(days[6]), days };
}

function ProfileChipPicker({ employees, selectedId, onSelect }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef(null);
    const selected = selectedId ? employees.find((employee) => String(employee.id) === String(selectedId)) : null;
    const ordered = selected ? [selected, ...employees.filter((employee) => String(employee.id) !== String(selected.id))] : employees;
    const visible = ordered.filter((employee) => `${fullName(employee)} ${employee.employee_code || ""} ${employeeRole(employee)}`.toLowerCase().includes(query.trim().toLowerCase()));
    const selectedLabel = selected ? fullName(selected) : "All employees";

    React.useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const choose = (id) => {
        onSelect(id);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={ref} className="relative flex min-w-0 items-center gap-0">
            <button type="button" onClick={() => choose("")} className={`grid h-10 min-w-10 place-items-center rounded-full border-2 border-white px-2 text-xs font-black shadow-sm ${!selectedId ? "bg-blue-600 text-white ring-2 ring-blue-500" : "bg-slate-950 text-white"}`} title="All employees">
                All
            </button>
            <div className="-ml-1 flex min-w-0 -space-x-2">
                {ordered.slice(0, 3).map((employee, index) => {
                    const active = String(employee.id) === String(selectedId);
                    const name = fullName(employee);
                    return (
                        <button key={employee.id} type="button" onClick={() => choose(employee.id)} title={name} className={`group relative rounded-full border-2 border-white bg-white p-0.5 shadow-sm transition hover:z-20 ${active ? "z-20 ring-2 ring-blue-500" : ""}`} style={{ zIndex: 12 - index }}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={employeeAvatar(employee)} alt={name} />
                                <AvatarFallback className="bg-sky-500 text-sm font-black text-white">{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <span className="pointer-events-none absolute left-1/2 top-full z-[150] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[11px] font-bold text-white shadow-xl group-hover:block">{name}</span>
                        </button>
                    );
                })}
            </div>
            {ordered.length > 3 && <button type="button" onClick={() => setOpen((current) => !current)} className="-ml-2 grid h-10 min-w-10 place-items-center rounded-full border-2 border-white bg-slate-950 px-2 text-xs font-black text-white shadow-sm">+{ordered.length - 3}</button>}
            <button type="button" onClick={() => setOpen((current) => !current)} className="ml-3 inline-flex h-11 min-w-[11rem] max-w-[15rem] items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 text-left text-sm font-black text-blue-600 shadow-lg shadow-blue-500/10 hover:bg-blue-50" title="Open employee picker">
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown size={18} className={open ? "rotate-180 transition" : "transition"} />
            </button>
            {open && (
                <div className="absolute right-0 top-[calc(100%+0.35rem)] z-[140] w-[min(24rem,calc(100vw-2rem))] rounded-[1.1rem] border border-blue-100 bg-white p-2.5 shadow-2xl shadow-blue-500/20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee" className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                    </div>
                    <div className="mt-2 max-h-[min(19rem,calc(100vh-10rem))] overflow-auto pr-1">
                        <button type="button" onClick={() => choose("")} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${!selectedId ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">All</span>
                            <span><b className="block text-sm">All employees</b><span className={`text-[11px] font-bold ${!selectedId ? "text-blue-100" : "text-slate-500"}`}>Show every schedule entry</span></span>
                        </button>
                        {visible.map((employee) => {
                            const active = String(employee.id) === String(selectedId);
                            return (
                                <button key={employee.id} type="button" onClick={() => choose(employee.id)} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${active ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={employeeAvatar(employee)} alt={fullName(employee)} />
                                        <AvatarFallback className="bg-sky-500 text-sm font-black text-white">{getInitials(fullName(employee))}</AvatarFallback>
                                    </Avatar>
                                    <span className="min-w-0">
                                        <b className="block truncate text-sm">{fullName(employee)}</b>
                                        <span className={`block truncate text-[11px] font-bold ${active ? "text-blue-100" : "text-slate-500"}`}>{employeeRole(employee)}</span>
                                        <span className={`block truncate text-[11px] font-black ${active ? "text-blue-100" : "text-slate-400"}`}>{employee.employee_code || "No code"}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeMultiSelect({ employees, value, onChange, disabled = false, closeOnSelect = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef(null);
    const ids = uniqueItems(value);
    const selectedEmployees = ids.map((id) => employees.find((employee) => String(employee.id) === String(id))).filter(Boolean);
    const filtered = employees.filter((employee) => `${fullName(employee)} ${employee.employee_code || ""} ${employee.email || ""} ${employeeRole(employee)}`.toLowerCase().includes(query.trim().toLowerCase()));

    React.useEffect(() => {
        if (!open) return undefined;
        const close = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    const toggle = (id) => {
        const key = String(id);
        if (disabled) return onChange([key]);
        onChange(ids.includes(key) ? ids.filter((item) => item !== key) : [...ids, key]);
        if (closeOnSelect) {
            setOpen(false);
            setQuery("");
        }
    };

    return (
        <div ref={ref} className="relative grid gap-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Employee<span className="ml-1 text-red-500">*</span></span>
            <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-3 py-2 text-left outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <span className={selectedEmployees.length ? "truncate text-sm font-black text-slate-900" : "truncate text-sm font-semibold text-slate-400"}>
                    {selectedEmployees.length === 0 ? "Choose employee" : selectedEmployees.length === 1 ? fullName(selectedEmployees[0]) : `${selectedEmployees.length} employees selected`}
                </span>
                <ChevronDown size={17} className={open ? "shrink-0 rotate-180 text-blue-600 transition" : "shrink-0 text-slate-400 transition"} />
            </button>
            {open && (
                <div className="absolute left-0 top-full z-[170] mt-2 w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/20">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee" className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                    </div>
                    <div className="max-h-[18rem] overflow-auto p-2">
                        {filtered.map((employee) => {
                            const active = ids.includes(String(employee.id));
                            return (
                                <button key={employee.id} type="button" onClick={() => toggle(employee.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${active ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={employeeAvatar(employee)} alt={fullName(employee)} />
                                        <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(fullName(employee))}</AvatarFallback>
                                    </Avatar>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black">{fullName(employee)}</span>
                                        <span className={`block truncate text-xs font-bold ${active ? "text-blue-100" : "text-slate-500"}`}>{employeeRole(employee)}</span>
                                        <span className={`block truncate text-xs font-black ${active ? "text-blue-100" : "text-slate-400"}`}>{employee.employee_code || "No code"}</span>
                                    </span>
                                    <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${active ? "border-white bg-white text-blue-600" : "border-blue-100 text-transparent"}`}>✓</span>
                                </button>
                            );
                        })}
                        {!filtered.length && <p className="px-3 py-4 text-center text-xs font-bold text-slate-400">No employee found</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function Drawer({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-[130] flex justify-end bg-slate-950/30 backdrop-blur-sm">
            <button type="button" aria-label="Close drawer" className="absolute inset-0" onClick={onClose} />
            <aside className="relative h-full w-full max-w-[29rem] overflow-auto border-l border-blue-100 bg-white shadow-2xl shadow-blue-500/20">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white/95 px-5 py-4 backdrop-blur">
                    <h2 className="text-lg font-black text-slate-950">{title}</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"><X size={18} /></button>
                </div>
                {children}
            </aside>
        </div>
    );
}

function ConfirmModal({ title, body, busy, onCancel, onConfirm }) {
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Confirm action</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{body}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={onCancel} disabled={busy} className="h-11 rounded-2xl border border-blue-100 text-sm font-black text-slate-600 hover:bg-blue-50 disabled:opacity-60">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={busy} className="h-11 rounded-2xl bg-red-600 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">{busy ? "Deleting..." : "Delete"}</button>
                </div>
            </div>
        </div>
    );
}

export default function SchedulingPage() {
    const { user } = useAuth();
    const { downloadsAllowed } = useBillingEntitlements(true);
    const queryClient = useQueryClient();
    const branchLabel = labelFor(user?.company, "branch", "Location");
    const projectLabel = labelFor(user?.company, "project", "Project");
    const scheduleCopy = useMemo(() => schedulingCopyFor(user?.company), [user?.company]);
    const userPermissions = new Set(user?.permissions || []);
    const canManageSchedule = ["schedule.manage", "settings.tenant"].some((permission) => userPermissions.has(permission));
    const canSeeCompanySchedule = ["schedule.view_company", "schedule.manage", "settings.tenant", "reports.company"].some((permission) => userPermissions.has(permission));
    const integrations = user?.company?.integrations || {};
    const connectedProviders = [
        integrations?.microsoft_teams?.status === "connected" ? "Teams" : null,
        integrations?.google_meet?.status === "connected" ? "Google Meet" : null,
    ].filter(Boolean);
    const [anchorDate, setAnchorDate] = useState(toDateValue(new Date()));
    const [viewMode, setViewMode] = useState("week");
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [shiftFilter, setShiftFilter] = useState("");
    const [search, setSearch] = useState("");
    const [drawerForm, setDrawerForm] = useState(null);
    const [drawerShiftDraft, setDrawerShiftDraft] = useState(emptyShift);
    const [pendingDelete, setPendingDelete] = useState(null);
    const scheduleGridRef = useRef(null);
    const range = useMemo(() => dateRange(anchorDate, viewMode), [anchorDate, viewMode]);

    const shifts = useShiftTemplatesQuery();
    const assignments = useScheduleAssignmentsQuery({ date_from: range.from, date_to: range.to, employee_id: employeeFilter });
    const employees = useOrganizationQuery(true);
    const branches = useBranchesQuery(canSeeCompanySchedule);
    const projects = useProjectsQuery(canSeeCompanySchedule, { limit: 200, offset: 0 });
    const saveShift = useSaveShiftTemplateMutation();
    const saveAssignment = useSaveScheduleAssignmentMutation();
    const deleteAssignment = useDeleteScheduleAssignmentMutation();
    const shiftRows = shifts.data?.data || [];
    const activeShifts = uniqueById(shiftRows.filter((shift) => shift.status === "active"));
    const microsoftSource = assignments.data?.meta?.sources?.microsoft_teams;
    const microsoftConnected = integrations?.microsoft_teams?.status === "connected";
    const microsoftCount = Number(microsoftSource?.count || 0);
    const employeeRows = employees.data?.data || [];
    const directoryEmployees = useMemo(() => {
        const byId = new Map();
        [user, ...employeeRows].filter(Boolean).forEach((employee) => byId.set(String(employee.id), employee));
        return [...byId.values()];
    }, [employeeRows, user]);
    const monthOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYears = directoryEmployees
            .map((employee) => parseDate(employmentStartValue(employee)).getFullYear())
            .filter((year) => Number.isFinite(year) && year > 1970);
        const firstYear = Math.min(...(startYears.length ? startYears : [currentYear]), currentYear);
        const lastYear = currentYear + 2;
        const options = [];
        for (let year = firstYear; year <= lastYear; year += 1) {
            for (let month = 0; month < 12; month += 1) {
                const date = new Date(year, month, 1);
                options.push({ value: `${year}-${pad(month + 1)}`, label: monthName(date) });
            }
        }
        return options;
    }, [directoryEmployees]);
    const branchOptions = (branches.data?.data || []).filter((branch) => branch.status !== "inactive").map((branch) => ({ value: branch.id, label: [branch.name, branch.city].filter(Boolean).join(" · ") }));
    const projectOptions = (projects.data?.data || []).filter((project) => project.status !== "inactive" && project.status !== "completed").map((project) => ({ value: project.id, label: [project.name, project.code].filter(Boolean).join(" · ") }));
    const orderedEmployees = useMemo(() => {
        const rows = [...directoryEmployees];
        rows.sort((left, right) => Number(String(right.id) === String(user?.id)) - Number(String(left.id) === String(user?.id)) || fullName(left).localeCompare(fullName(right)));
        return rows;
    }, [directoryEmployees, user?.id]);
    const filteredEmployees = orderedEmployees.filter((employee) => {
        if (employeeFilter && String(employee.id) !== String(employeeFilter)) return false;
        if (branchFilter && String(employee.branch_id || "") !== String(branchFilter)) return false;
        if (projectFilter && !(employee.project_ids || []).map(String).includes(String(projectFilter))) return false;
        const text = `${fullName(employee)} ${employee.employee_code || ""} ${employee.email || ""} ${employee.department || ""} ${employeeRole(employee)}`.toLowerCase();
        return text.includes(search.trim().toLowerCase());
    });
    const employeesById = useMemo(() => new Map(directoryEmployees.map((employee) => [String(employee.id), employee])), [directoryEmployees]);
    const shiftsById = useMemo(() => new Map(shiftRows.map((shift) => [String(shift.id), shift])), [shiftRows]);
    const visibleEmployeeIds = useMemo(() => new Set(filteredEmployees.map((employee) => String(employee.id))), [filteredEmployees]);
    const teamsOnlyMode = scheduleCopy.calendarFirst && microsoftConnected && microsoftSource?.status === "connected" && microsoftSource?.calendar_status !== "unavailable";
    const isTeamsBacked = (item) => item?.external_provider === "microsoft_teams" || item?.source === "microsoft_graph" || String(item?.id || "").startsWith("microsoft:");
    const visibleAssignments = useMemo(() => (assignments.data?.data || []).filter((item) => {
        if (teamsOnlyMode && !isTeamsBacked(item)) return false;
        if (shiftFilter && String(item.shift_template_id) !== String(shiftFilter)) return false;
        return visibleEmployeeIds.has(String(item.employee_id));
    }), [assignments.data?.data, shiftFilter, teamsOnlyMode, visibleEmployeeIds]);
    const assignmentsByCell = useMemo(() => visibleAssignments.reduce((map, item) => {
        const key = `${item.employee_id}-${item.work_date}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
        return map;
    }, new Map()), [visibleAssignments]);
    const conflictIds = useMemo(() => {
        const ids = new Set();
        const groups = visibleAssignments.reduce((map, item) => {
            const key = `${item.employee_id}-${item.work_date}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
            return map;
        }, new Map());
        groups.forEach((rows) => {
            rows.forEach((row, index) => {
                rows.slice(index + 1).forEach((other) => {
                    if (isDuplicateScheduleConflict(row, other)) {
                        ids.add(String(row.id));
                        ids.add(String(other.id));
                    }
                });
            });
        });
        return ids;
    }, [visibleAssignments]);
    const assignmentsByDate = useMemo(() => visibleAssignments.reduce((map, item) => {
        if (!map.has(item.work_date)) map.set(item.work_date, []);
        map.get(item.work_date).push(item);
        return map;
    }, new Map()), [visibleAssignments]);
    const assignmentContinuity = useMemo(() => {
        const keys = new Set(visibleAssignments.map((item) => `${item.employee_id}|${item.shift_template_id}|${item.start_time}|${item.end_time}|${item.work_date}`));
        return new Map(visibleAssignments.map((item) => {
            const previous = toDateValue(addDays(parseDate(item.work_date), -1));
            const next = toDateValue(addDays(parseDate(item.work_date), 1));
            const base = `${item.employee_id}|${item.shift_template_id}|${item.start_time}|${item.end_time}|`;
            return [String(item.id), { previous: keys.has(`${base}${previous}`), next: keys.has(`${base}${next}`) }];
        }));
    }, [visibleAssignments]);
    const monthCalendarDays = useMemo(() => {
        const anchor = parseDate(anchorDate);
        const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
        const start = startOfWeek(first);
        const days = [];
        for (let date = new Date(start); date <= last || days.length % 7 !== 0; date = addDays(date, 1)) days.push(new Date(date));
        return days;
    }, [anchorDate]);
    const selectedDrawerEmployeeIds = drawerForm ? uniqueItems(drawerForm.employee_ids || [drawerForm.employee_id]) : [];
    const selectedDrawerEmployee = selectedDrawerEmployeeIds.length === 1 ? employeesById.get(String(selectedDrawerEmployeeIds[0])) : null;
    const chipEmployees = orderedEmployees.filter((employee) => {
        if (branchFilter && String(employee.branch_id || "") !== String(branchFilter)) return false;
        if (projectFilter && !(employee.project_ids || []).map(String).includes(String(projectFilter))) return false;
        return true;
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["scheduling"] });
    const moveRange = (amount) => {
        const date = parseDate(anchorDate);
        date.setDate(date.getDate() + (viewMode === "week" ? amount * 7 : amount * 31));
        setAnchorDate(toDateValue(date));
    };
    const openCreateAssignment = (employeeId = "", workDate = anchorDate) => {
        if (!canManageSchedule) return;
        setDrawerForm({ ...emptyAssignment, employee_id: employeeId, employee_ids: employeeId ? [employeeId] : [], work_date: workDate, end_date: "", days_of_week: [weekdayIndex(workDate)] });
        setDrawerShiftDraft(emptyShift);
    };
    const openEditAssignment = (assignment) => {
        if (!canManageSchedule) return;
        const shift = shiftsById.get(String(assignment.shift_template_id));
        setDrawerForm({ id: assignment.id, employee_id: assignment.employee_id, employee_ids: [assignment.employee_id], shift_template_id: assignment.shift_template_id, work_date: assignment.work_date, end_date: "", days_of_week: [weekdayIndex(assignment.work_date)], status: assignment.status || "published", notes: assignment.notes || "", location: assignment.location || "", repeat_rule: assignment.repeat_rule || "none", external_provider: assignment.external_provider || "", source: assignment.source || "" });
        setDrawerShiftDraft({
            ...emptyShift,
            id: assignment.shift_template_id,
            name: assignment.shift_name || shift?.name || "",
            code: assignment.shift_code || shift?.code || "",
            start_time: assignment.start_time || shift?.start_time || emptyShift.start_time,
            end_time: assignment.end_time || shift?.end_time || emptyShift.end_time,
            break_minutes: assignment.break_minutes ?? shift?.break_minutes ?? emptyShift.break_minutes,
            color: assignment.shift_color || shift?.color || emptyShift.color,
            status: shift?.status || "active",
        });
    };

    const submitAssignment = async (event) => {
        event.preventDefault();
        const employeeIds = uniqueItems(drawerForm.employee_ids || [drawerForm.employee_id]);
        const dates = drawerForm.id ? [drawerForm.work_date] : scheduleDates(drawerForm.work_date, drawerForm.end_date, drawerForm.days_of_week);
        if (!employeeIds.length || !drawerShiftDraft.name.trim() || !drawerForm.work_date) return toast.error(`Choose employee, ${scheduleCopy.item} type, and date`);
        if (!drawerForm.id && !(drawerForm.days_of_week || []).length) return toast.error("Choose at least one day");
        if (!dates.length) return toast.error("End date must be after start date");
        const findMatchingShift = () => activeShifts.find((shift) => (
            String(shift.name || "").toLowerCase() === drawerShiftDraft.name.trim().toLowerCase()
            && String(shift.start_time || "") === String(drawerShiftDraft.start_time || "")
            && String(shift.end_time || "") === String(drawerShiftDraft.end_time || "")
            && Number(shift.break_minutes || 0) === Number(drawerShiftDraft.break_minutes || 0)
            && String(shift.color || "") === String(drawerShiftDraft.color || "")
        ));
        const resolveShiftId = async () => {
            const match = findMatchingShift();
            if (match) return match.id;
            const response = await saveShift.mutateAsync({ ...drawerShiftDraft, id: undefined, code: undefined, name: drawerShiftDraft.name.trim() });
            const shiftId = response?.data?.id;
            if (!shiftId) throw new Error("Shift saved without an id");
            return shiftId;
        };
        const saveCurrentAssignment = async (shiftId) => {
            const basePayload = { ...drawerForm, shift_template_id: shiftId };
            delete basePayload.employee_ids;
            delete basePayload.end_date;
            delete basePayload.days_of_week;
            const attendee_emails = selectedDrawerEmployeeIds
                .map((id) => employeesById.get(String(id))?.email)
                .filter(Boolean);
            const shouldSyncTeams = scheduleCopy.calendarFirst && microsoftConnected && microsoftSource?.calendar_status !== "unavailable";
            if (drawerForm.id) {
                const response = await saveAssignment.mutateAsync({
                    ...basePayload,
                    employee_id: employeeIds[0],
                    attendee_emails,
                    start_time: drawerShiftDraft.start_time,
                    end_time: drawerShiftDraft.end_time,
                    subject: drawerShiftDraft.name,
                    force: true,
                    sync_provider: String(drawerForm.id).startsWith("microsoft:") || drawerForm.external_provider === "microsoft_teams" ? "microsoft_teams" : undefined,
                });
                if (response?.data?.conflicts?.length) toast.warning("Schedule saved with conflict");
                if (response?.data?.sync_error) toast.warning(response.data.sync_error);
            } else {
                let conflictCount = 0;
                let syncErrorCount = 0;
                for (const employeeId of employeeIds) {
                    for (const workDate of dates) {
                        const response = await saveAssignment.mutateAsync({
                            ...basePayload,
                            employee_id: employeeId,
                            work_date: workDate,
                            force: true,
                            attendee_emails,
                            sync_provider: shouldSyncTeams ? "microsoft_teams" : undefined,
                            create_online_meeting: shouldSyncTeams,
                        });
                        if (response?.data?.conflicts?.length) conflictCount += 1;
                        if (response?.data?.sync_error) syncErrorCount += 1;
                    }
                }
                if (conflictCount) toast.warning(`${conflictCount} schedule${conflictCount > 1 ? "s" : ""} saved with conflict`);
                if (syncErrorCount) toast.warning(`${syncErrorCount} ${scheduleCopy.item}${syncErrorCount > 1 ? "s" : ""} saved locally, but Teams sync needs reconnect`);
            }
            const total = drawerForm.id ? 1 : employeeIds.length * dates.length;
            toast.success(drawerForm.id ? "Schedule updated" : `${total} schedule${total > 1 ? "s" : ""} created`);
            setDrawerForm(null);
            setDrawerShiftDraft(emptyShift);
            refresh();
        };
        try {
            if (String(drawerForm.id || "").startsWith("microsoft:")) {
                await saveCurrentAssignment(drawerForm.shift_template_id);
            } else {
                await saveCurrentAssignment(await resolveShiftId());
            }
        } catch (error) {
            toast.error(error.message || "Unable to save schedule");
        }
    };
    const removeAssignment = () => {
        const id = pendingDelete?.id || drawerForm?.id;
        if (!id) return;
        deleteAssignment.mutate(id, {
            onSuccess: () => {
                toast.success("Schedule deleted");
                setDrawerForm(null);
                setPendingDelete(null);
                refresh();
            },
            onError: (error) => toast.error(error.message || "Unable to delete schedule"),
        });
    };
    const exportSchedule = () => {
        const rows = visibleAssignments.map((item) => {
            const employee = employeesById.get(String(item.employee_id));
            return {
                employee: `${fullName(employee || { email: item.employee_name })}${item.employee_code || employee?.employee_code ? ` (${item.employee_code || employee?.employee_code})` : ""}`,
                work_date: item.work_date,
                shift: item.shift_name || "",
                time: `${item.start_time || ""} - ${item.end_time || ""}`,
                break: `${item.break_minutes || 0}m`,
                status: item.status || "",
                notes: item.notes || "",
            };
        });
        downloadSchedulePdf({
            filename: `schedule-${viewMode}-${range.from}-to-${range.to}.pdf`,
            rows,
            title: `${viewMode === "month" ? "Monthly" : "Weekly"} ${scheduleCopy.itemTitle} Calendar`,
            subtitle: `${range.from} to ${range.to}`,
            user,
            labels: { project: scheduleCopy.itemTitle },
        });
    };
    const setViewModeWithFocus = (mode) => {
        setViewMode(mode);
        window.requestAnimationFrame(() => scheduleGridRef.current?.focus({ preventScroll: false }));
    };
    const moveAssignment = (row, nextEmployeeId, nextDate, targetRows = []) => {
        if (!row?.id || !nextEmployeeId || !nextDate) return;
        if (targetRows.some((item) => String(item.id) === String(row.id))) return;
        if (String(row.employee_id) === String(nextEmployeeId) && String(row.work_date).slice(0, 10) === String(nextDate).slice(0, 10)) return;
        const external = row.source === "microsoft_graph" || row.external_provider === "microsoft_teams" || String(row.id).startsWith("microsoft:");
        if (external && String(row.employee_id) !== String(nextEmployeeId)) {
            toast.error("Teams events can only be moved inside the connected user's calendar");
            return;
        }
        saveAssignment.mutate({
            id: row.id,
            employee_id: nextEmployeeId,
            shift_template_id: row.shift_template_id,
            work_date: nextDate,
            start_time: row.start_time,
            end_time: row.end_time,
            subject: row.shift_name,
            status: row.status || "published",
            notes: row.notes || "",
            location: row.location || "",
            sync_provider: external ? "microsoft_teams" : undefined,
            force: true,
        }, {
            onSuccess: () => {
                if (external) toast.success("Teams event moved");
                else toast.success("Schedule moved");
                refresh();
            },
            onError: (error) => toast.error(error.message || "Unable to move schedule"),
        });
    };

    return (
        <div className="space-y-5">
            <section className="rounded-[1.4rem] border border-blue-100 bg-white/90 p-5 shadow-lg shadow-blue-500/5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{scheduleCopy.title}</p>
                        {/* <h1 className="mt-2 text-2xl font-black text-slate-950">View and manage employee schedules</h1>
                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Reusable shifts, roster patterns, conflict checks, and {branchLabel.toLowerCase()} coverage for every industry workflow.</p> */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {connectedProviders.map((provider) => <span key={provider} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{provider} connected</span>)}
                            {scheduleCopy.calendarFirst && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{microsoftConnected ? (microsoftSource?.calendar_status === "unavailable" ? "Manual calendar fallback" : `${microsoftCount} Teams calendar ${microsoftCount === 1 ? "event" : "events"}`) : "Manual calendar fallback"}</span>}
                            {microsoftSource?.status === "error" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Teams sync needs attention</span>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <ProfileChipPicker employees={chipEmployees} selectedId={employeeFilter} onSelect={setEmployeeFilter} />
                        <div className="w-full sm:w-48">
                            <SearchableSelect
                                label=""
                                value={anchorDate.slice(0, 7)}
                                onChange={(value) => setAnchorDate(`${value}-01`)}
                                options={monthOptions}
                                placeholder="Select month"
                                menuMinWidth={220}
                            />
                        </div>
                        {canManageSchedule && <button type="button" onClick={() => openCreateAssignment("", toDateValue(new Date()))} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"><Plus size={17} />{scheduleCopy.create}</button>}
                    </div>
                </div>
            </section>

            <section className="rounded-[1.4rem] border border-blue-100 bg-white/90 shadow-lg shadow-blue-500/5">
                <div className="grid gap-3 border-b border-blue-100 p-4 xl:grid-cols-[minmax(12rem,1fr)_13rem_13rem_13rem_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee..." className={`${inputClass} pl-9`} />
                    </div>
                    <SearchableSelect label="" value={branchFilter} onChange={setBranchFilter} options={[{ value: "", label: `All ${branchLabel.toLowerCase()}s` }, ...branchOptions]} placeholder={`All ${branchLabel.toLowerCase()}s`} />
                    <SearchableSelect label="" value={projectFilter} onChange={setProjectFilter} options={[{ value: "", label: `All ${projectLabel.toLowerCase()}s` }, ...projectOptions]} placeholder={`All ${projectLabel.toLowerCase()}s`} />
                    <SearchableSelect label="" value={shiftFilter} onChange={setShiftFilter} options={[{ value: "", label: scheduleCopy.typeFilter }, ...activeShifts.map((shift) => ({ value: shift.id, label: shift.name }))]} placeholder={scheduleCopy.typeFilter} />
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setViewModeWithFocus("week")} className={`h-11 rounded-xl px-4 text-sm font-black ${viewMode === "week" ? "bg-blue-600 text-white" : "border border-blue-100 text-slate-600 hover:bg-blue-50"}`}>Week</button>
                        <button type="button" onClick={() => setViewModeWithFocus("month")} className={`h-11 rounded-xl px-4 text-sm font-black ${viewMode === "month" ? "bg-blue-600 text-white" : "border border-blue-100 text-slate-600 hover:bg-blue-50"}`}>Month</button>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-5 px-4 py-4">
                    <button type="button" onClick={() => moveRange(-1)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600"><ChevronLeft size={18} /></button>
                    <h2 className="text-lg font-black text-slate-950">{range.days[0].toLocaleDateString(undefined, { day: "2-digit", month: "short" })} - {range.days.at(-1).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</h2>
                    <button type="button" onClick={() => moveRange(1)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600"><ChevronRight size={18} /></button>
                    <button type="button" onClick={exportSchedule} disabled={!visibleAssignments.length || !downloadsAllowed} title={!downloadsAllowed ? "Schedule PDF downloads are available on Standard." : undefined} className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-100 px-3 text-xs font-black text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Download size={14} />PDF {viewMode}</button>
                </div>
                {scheduleCopy.calendarFirst && microsoftConnected && microsoftSource?.status === "connected" && microsoftSource?.calendar_status !== "unavailable" && microsoftCount === 0 && (
                    <div className="mx-4 mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">Teams calendar is connected. No Microsoft calendar events were found in this date range for the signed-in user.</div>
                )}
                {microsoftSource?.status === "error" && (
                    <div className="mx-4 mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Teams calendar could not sync: {microsoftSource.message || "Microsoft Graph returned an error."} {microsoftSource.status_code === 401 ? "Reconnect Microsoft Teams from Settings." : ""}</div>
                )}
                {viewMode === "month" ? (
                    <div ref={scheduleGridRef} tabIndex={-1} className="p-4 outline-none">
                        <div className="grid grid-cols-7 rounded-2xl border border-blue-100 bg-slate-50/70 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            {weekdays.map((day) => <div key={day} className="border-r border-blue-100 px-2 py-3 last:border-r-0">{day}</div>)}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                            {monthCalendarDays.map((date) => {
                                const dateValue = toDateValue(date);
                                const rows = assignmentsByDate.get(dateValue) || [];
                                const muted = !sameMonth(date, parseDate(anchorDate));
                                const defaultEmployeeId = employeeFilter || rows[0]?.employee_id || filteredEmployees[0]?.id || user?.id || "";
                                return (
                                    <div key={dateValue} onDragOver={(event) => canManageSchedule && event.preventDefault()} onDrop={(event) => { if (!canManageSchedule) return; event.preventDefault(); const row = readDraggedAssignment(event); moveAssignment(row, row?.employee_id, dateValue, rows); }} className={`min-h-[7.5rem] rounded-xl border p-2 ${muted ? "border-slate-100 bg-slate-50/60 opacity-70" : rows.length ? "border-blue-200 bg-blue-50/35" : "border-blue-100 bg-white"}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <button type="button" disabled={!canManageSchedule} onClick={() => canManageSchedule && openCreateAssignment(defaultEmployeeId, dateValue)} className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${toDateValue(new Date()) === dateValue ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-600"}`}>
                                                {date.getDate()}
                                            </button>
                                            {rows.length > 0 && <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">{rows.length}</span>}
                                        </div>
                                        <div className="mt-2 space-y-1.5">
                                            {rows.slice(0, 3).map((row) => {
                                                const color = row.shift_color || shiftsById.get(String(row.shift_template_id))?.color || "#2563eb";
                                                const employee = employeesById.get(String(row.employee_id));
                                                const continuity = assignmentContinuity.get(String(row.id)) || {};
                                                const hasConflict = conflictIds.has(String(row.id));
                                                const external = row.source === "microsoft_graph" || row.external_provider;
                                                return (
                                                    <div key={row.id} draggable={canManageSchedule} onDragStart={(event) => canManageSchedule && writeDraggedAssignment(event, row)} className={`group border px-2 py-1.5 shadow-sm ${continuity.previous ? "rounded-l-sm border-l-0" : "rounded-l-lg"} ${continuity.next ? "rounded-r-sm border-r-0" : "rounded-r-lg"}`} style={hasConflict ? conflictCardStyles : colorStyles(color)}>
                                                        <button type="button" onClick={() => canManageSchedule && openEditAssignment(row)} className="w-full text-left">
                                                            <span className="flex items-center justify-between gap-2">
                                                                <span className="min-w-0">
                                                                    <p className="truncate text-[11px] font-black">{row.shift_name}</p>
                                                                    <p className="truncate text-[9px] font-bold opacity-80">{timeRange(row)}</p>
                                                                </span>
                                                                {!employeeFilter && <Avatar className="h-5 w-5 shrink-0 border border-white"><AvatarImage src={employeeAvatar(employee)} alt={fullName(employee)} /><AvatarFallback className="bg-sky-500 text-[8px] font-black text-white">{getInitials(fullName(employee))}</AvatarFallback></Avatar>}
                                                            </span>
                                                            {!employeeFilter && <p className="truncate text-[9px] font-bold opacity-80">{fullName(employee || { email: row.employee_name })}</p>}
                                                            <span className="mt-1 flex flex-wrap gap-1">
                                                                {hasConflict && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Conflict</span>}
                                                                {external && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Teams</span>}
                                                                {!["scheduled", "published"].includes(row.status) && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-black uppercase">{statusLabel(row.status)}</span>}
                                                            </span>
                                                        </button>
                                                        {canManageSchedule && <div className="mt-2 hidden gap-1 group-hover:flex">
                                                            <button type="button" onClick={() => openEditAssignment(row)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/80 px-2 text-[10px] font-black text-blue-600"><Edit3 size={12} />Edit</button>
                                                            <button type="button" onClick={() => setPendingDelete(row)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/80 px-2 text-[10px] font-black text-red-600"><Trash2 size={12} />Delete</button>
                                                        </div>}
                                                    </div>
                                                );
                                            })}
                                            {rows.length > 3 && <button type="button" disabled={!canManageSchedule} onClick={() => canManageSchedule && openCreateAssignment(defaultEmployeeId, dateValue)} className="w-full rounded-lg bg-white px-2 py-1.5 text-[11px] font-black text-blue-600 disabled:cursor-not-allowed disabled:opacity-50">+{rows.length - 3} more</button>}
                                            {!rows.length && <button type="button" disabled={!canManageSchedule} onClick={() => canManageSchedule && openCreateAssignment(defaultEmployeeId, dateValue)} className="grid h-12 w-full place-items-center rounded-lg border border-dashed border-blue-100 text-xs font-black text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50">{scheduleCopy.empty}</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div ref={scheduleGridRef} tabIndex={-1} className="max-h-[min(44rem,calc(100vh-18rem))] overflow-auto outline-none">
                        <div className="min-w-[68rem]">
                            <div className="sticky top-0 z-20 grid border-y border-blue-100 bg-slate-50/95 backdrop-blur" style={{ gridTemplateColumns: `14rem repeat(${range.days.length}, minmax(7.5rem,1fr))` }}>
                                <div className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">Employee</div>
                                {range.days.map((date) => <div key={toDateValue(date)} className="border-l border-blue-100 px-3 py-3 text-center"><p className="text-xs font-black text-slate-950">{date.toLocaleDateString(undefined, { weekday: "short" })}</p><p className="mt-1 text-xs font-bold text-slate-500">{date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</p></div>)}
                            </div>
                            {filteredEmployees.map((employee) => (
                                <div key={employee.id} className="grid min-h-[6.4rem] border-b border-blue-50" style={{ gridTemplateColumns: `14rem repeat(${range.days.length}, minmax(7.5rem,1fr))` }}>
                                    <div className="sticky left-0 z-10 flex items-center gap-3 border-r border-blue-100 bg-white px-4 py-3">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage src={employeeAvatar(employee)} alt={fullName(employee)} />
                                            <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(fullName(employee))}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-950">{fullName(employee)}</p>
                                            <p className="truncate text-xs font-bold text-slate-500">{employee.employee_code || "No code"}</p>
                                            <p className="truncate text-xs font-bold text-blue-600">{employee.department || employeeRole(employee)}</p>
                                        </div>
                                    </div>
                                    {range.days.map((date) => {
                                        const key = `${employee.id}-${toDateValue(date)}`;
                                        const rows = assignmentsByCell.get(key) || [];
                                        return (
                                            <div key={key} onDragOver={(event) => canManageSchedule && event.preventDefault()} onDrop={(event) => { if (!canManageSchedule) return; event.preventDefault(); const row = readDraggedAssignment(event); moveAssignment(row, employee.id, toDateValue(date), rows); }} className="min-h-[6.8rem] border-l border-blue-50 p-2 text-left transition hover:bg-blue-50/40">
                                                {rows.length ? rows.map((row) => {
                                                    const color = row.shift_color || shiftsById.get(String(row.shift_template_id))?.color || "#2563eb";
                                                    const rowEmployee = employeesById.get(String(row.employee_id)) || employee;
                                                    const hasConflict = conflictIds.has(String(row.id));
                                                    const external = row.source === "microsoft_graph" || row.external_provider;
                                                    return (
                                                        <div key={row.id} draggable={canManageSchedule} onDragStart={(event) => canManageSchedule && writeDraggedAssignment(event, row)} className="group mb-2 rounded-xl border px-2 py-2 shadow-sm" style={hasConflict ? conflictCardStyles : colorStyles(color)}>
                                                            <button type="button" onClick={() => canManageSchedule && openEditAssignment(row)} className="w-full text-left">
                                                                <span className="flex items-center justify-between gap-2">
                                                                    <span className="min-w-0">
                                                                        <span className="block truncate text-[11px] font-black">{row.shift_name}</span>
                                                                        <span className="block truncate text-[9px] font-bold opacity-80">{timeRange(row)}</span>
                                                                    </span>
                                                                    <Avatar className="h-6 w-6 shrink-0 border border-white">
                                                                        <AvatarImage src={employeeAvatar(rowEmployee)} alt={fullName(rowEmployee)} />
                                                                        <AvatarFallback className="bg-sky-500 text-[9px] font-black text-white">{getInitials(fullName(rowEmployee))}</AvatarFallback>
                                                                    </Avatar>
                                                                </span>
                                                                <p className="mt-1 truncate text-[9px] font-bold opacity-80">{fullName(rowEmployee || { email: row.employee_name })}</p>
                                                                <span className="mt-1 flex flex-wrap gap-1">
                                                                    {hasConflict && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Conflict</span>}
                                                                    {external && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Teams</span>}
                                                                    {!["scheduled", "published"].includes(row.status) && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-black uppercase">{statusLabel(row.status)}</span>}
                                                                </span>
                                                            </button>
                                                            {canManageSchedule && <div className="mt-2 hidden gap-1 group-hover:flex">
                                                                <button type="button" onClick={() => openEditAssignment(row)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/80 px-2 text-[10px] font-black text-blue-600"><Edit3 size={12} />Edit</button>
                                                                <button type="button" onClick={() => setPendingDelete(row)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-white/80 px-2 text-[10px] font-black text-red-600"><Trash2 size={12} />Delete</button>
                                                            </div>}
                                                        </div>
                                                    );
                                                }) : <button type="button" disabled={!canManageSchedule} onClick={() => canManageSchedule && openCreateAssignment(employee.id, toDateValue(date))} className="grid h-full min-h-[5rem] w-full place-items-center rounded-xl text-xs font-black text-slate-400 hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50">{scheduleCopy.empty}</button>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            {!filteredEmployees.length && <div className="p-8 text-center text-sm font-bold text-slate-500">No employees match these filters.</div>}
                        </div>
                    </div>
                )}
                <div className="flex flex-wrap gap-4 border-t border-blue-100 px-5 py-4">
                    {activeShifts.map((shift) => <span key={shift.id} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: shift.color || "#2563eb" }} />{shift.name} ({timeRange(shift)})</span>)}
                    {!activeShifts.length && <span className="text-xs font-bold text-amber-700">No saved {scheduleCopy.item} types yet. Use {scheduleCopy.create} to define the first one.</span>}
                </div>
            </section>

            {drawerForm && (
                <Drawer title={drawerForm.id ? scheduleCopy.details : scheduleCopy.create} onClose={() => setDrawerForm(null)}>
                    <form onSubmit={submitAssignment} className="grid gap-4 p-5">
                        {selectedDrawerEmployee && <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><Avatar className="h-11 w-11"><AvatarImage src={employeeAvatar(selectedDrawerEmployee)} alt={fullName(selectedDrawerEmployee)} /><AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(fullName(selectedDrawerEmployee))}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-black text-slate-950">{fullName(selectedDrawerEmployee)}</p><p className="truncate text-xs font-bold text-slate-500">{selectedDrawerEmployee.employee_code || "No code"} · {selectedDrawerEmployee.department || employeeRole(selectedDrawerEmployee)}</p></div></div>}
                        {!selectedDrawerEmployee && selectedDrawerEmployeeIds.length > 1 && <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">{selectedDrawerEmployeeIds.length} employees selected for this schedule.</div>}
                        <EmployeeMultiSelect
                            employees={orderedEmployees}
                            value={selectedDrawerEmployeeIds}
                            onChange={(ids) => setDrawerForm((current) => ({ ...current, employee_ids: ids, employee_id: ids[0] || "" }))}
                            disabled={Boolean(drawerForm.id)}
                            closeOnSelect={scheduleCopy.calendarFirst}
                        />
                        <div className="grid gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">{drawerForm.id ? scheduleCopy.details : scheduleCopy.newDetails}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {scheduleCopy.calendarFirst ? (
                                    <>
                                        <label className="grid gap-2 text-left sm:col-span-2">
                                            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Title</span>
                                            <input value={drawerShiftDraft.name || ""} onChange={(event) => setDrawerShiftDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Add title" className={inputClass} required />
                                        </label>
                                        <SearchableSelect
                                            label="Event template"
                                            value={scheduleCopy.presets.find((item) => item.value === drawerShiftDraft.name)?.value || ""}
                                            onChange={(value) => {
                                                const preset = scheduleCopy.presets.find((item) => item.value === value);
                                                if (preset) setDrawerShiftDraft((current) => ({ ...current, ...preset, name: preset.value }));
                                            }}
                                            options={scheduleCopy.presets.map((preset) => ({ value: preset.value, label: preset.label, searchText: `${preset.label} ${preset.value} ${preset.start_time} ${preset.end_time}` }))}
                                            placeholder="Use template"
                                        />
                                    </>
                                ) : (
                                    <SearchableSelect
                                        label={scheduleCopy.typeLabel}
                                        value={drawerShiftDraft.name || ""}
                                        onChange={(value) => {
                                            const preset = scheduleCopy.presets.find((item) => item.value === value);
                                            setDrawerShiftDraft((current) => ({ ...current, ...(preset || {}), name: value }));
                                        }}
                                        options={scheduleCopy.presets.map((preset) => ({ value: preset.value, label: preset.label, searchText: `${preset.label} ${preset.value} ${preset.start_time} ${preset.end_time}` }))}
                                        placeholder={`Choose ${scheduleCopy.item} type`}
                                        required
                                    />
                                )}
                                <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Start</span><input type="time" value={drawerShiftDraft.start_time || ""} onChange={(event) => setDrawerShiftDraft((current) => ({ ...current, start_time: event.target.value }))} className={inputClass} /></label>
                                <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">End</span><input type="time" value={drawerShiftDraft.end_time || ""} onChange={(event) => setDrawerShiftDraft((current) => ({ ...current, end_time: event.target.value }))} className={inputClass} /></label>
                                <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Break minutes</span><input type="number" min="0" value={drawerShiftDraft.break_minutes || 0} onChange={(event) => setDrawerShiftDraft((current) => ({ ...current, break_minutes: Number(event.target.value) }))} className={inputClass} /></label>
                                <div className="grid gap-2 text-left sm:col-span-2"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Color</span><div className="flex flex-wrap gap-2">{shiftColors.map((color) => <button key={color} type="button" onClick={() => setDrawerShiftDraft((current) => ({ ...current, color }))} className={`h-11 w-11 rounded-2xl border-2 ${drawerShiftDraft.color === color ? "border-slate-950" : "border-white"}`} style={{ backgroundColor: color }} title={color} />)}</div></div>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Start date</span><input type="date" value={drawerForm.work_date} onChange={(event) => {
                                const nextStart = event.target.value;
                                setDrawerForm((current) => {
                                    const nextEnd = current.end_date && parseDate(current.end_date) < parseDate(nextStart) ? "" : current.end_date;
                                    return { ...current, work_date: nextStart, end_date: nextEnd, days_of_week: weekdaysBetween(nextStart, nextEnd) };
                                });
                            }} className={inputClass} required /></label>
                            {!drawerForm.id && <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">End date</span><input type="date" value={drawerForm.end_date || ""} min={drawerForm.work_date || undefined} onChange={(event) => {
                                const nextEnd = event.target.value;
                                setDrawerForm((current) => ({ ...current, end_date: nextEnd, days_of_week: weekdaysBetween(current.work_date, nextEnd) }));
                            }} className={inputClass} /></label>}
                        </div>
                        {!drawerForm.id && (
                            <div className="grid gap-2 text-left">
                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Days</span>
                                <div className="flex flex-wrap gap-2">
                                    {weekdays.map((day, index) => {
                                        const active = (drawerForm.days_of_week || []).map(Number).includes(index);
                                        return <button key={day} type="button" onClick={() => setDrawerForm((current) => {
                                            const nextDays = active ? (current.days_of_week || []).filter((item) => Number(item) !== index) : [...(current.days_of_week || []), index].sort();
                                            const nextStart = !current.end_date && nextDays.length ? nearestDateForWeekday(current.work_date, nextDays[0]) : current.work_date;
                                            return {
                                                ...current,
                                                work_date: nextStart,
                                                end_date: !current.end_date && nextDays.length > 1 ? toDateValue(addDays(parseDate(nextStart), 6)) : current.end_date,
                                                days_of_week: nextDays,
                                            };
                                        })} className={`h-10 rounded-xl px-3 text-xs font-black ${active ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-600 hover:bg-blue-50"}`}>{day}</button>;
                                    })}
                                </div>
                            </div>
                        )}
                        {scheduleCopy.calendarFirst && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Repeat</span><select value={drawerForm.repeat_rule || "none"} onChange={(event) => setDrawerForm((current) => ({ ...current, repeat_rule: event.target.value }))} className={inputClass}><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="weekdays">Every weekday</option></select></label>
                                <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Location</span><input value={drawerForm.location || ""} onChange={(event) => setDrawerForm((current) => ({ ...current, location: event.target.value }))} placeholder="Add location or meeting room" className={inputClass} /></label>
                            </div>
                        )}
                        <SearchableSelect label="Status" value={drawerForm.status} onChange={(value) => setDrawerForm((current) => ({ ...current, status: value }))} options={scheduleStatuses} placeholder="Status" />
                        <label className="grid gap-2 text-left"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{scheduleCopy.calendarFirst ? "Details" : "Notes"}</span><textarea value={drawerForm.notes || ""} onChange={(event) => setDrawerForm((current) => ({ ...current, notes: event.target.value }))} rows={4} placeholder={scheduleCopy.calendarFirst ? "Type details for this meeting" : `${branchLabel}, tasks, handover, or coverage notes`} className={`${inputClass} h-auto py-3`} /></label>
                        <button disabled={saveAssignment.isPending || saveShift.isPending} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:bg-slate-300"><Save size={16} />{drawerForm.id ? `Update ${scheduleCopy.itemTitle}` : scheduleCopy.create}</button>
                        {drawerForm.id && <button type="button" disabled={deleteAssignment.isPending} onClick={() => setPendingDelete(drawerForm)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-100 px-5 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={16} />Delete Schedule</button>}
                    </form>
                </Drawer>
            )}
            {pendingDelete && (
                <ConfirmModal
                    title="Delete schedule?"
                    body="This schedule entry will be removed from the grid. The backend keeps an audit trail by cancelling it instead of hard deleting it."
                    busy={deleteAssignment.isPending}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={removeAssignment}
                />
            )}
        </div>
    );
}
