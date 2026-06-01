import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Download, FileText, Info, Search } from "lucide-react";
import { useAuth } from "../../context/auth-context.jsx";
import { useHolidaysQuery, useEmployeeTimesheetQuery, useMyTimesheetQuery } from "../../hooks/useAttendanceService";
import { useEmployeesQuery } from "../../hooks/useEmployeeService";
import { useBillingEntitlements } from "../../hooks/useBillingService.ts";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { getInitials } from "../../utils";
import { labelFor } from "../../config/workspaceProfiles.js";
import {
    EmptyState,
    Field,
    PageHeading,
    formatClock,
    formatMinutes,
    hasPermission,
    parseApiDate,
    todayInputValue,
} from "./attendance-shared.jsx";

const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2000, index, 1).toLocaleDateString(undefined, { month: "long" }));
const statusClass = {
    ready: "bg-emerald-50 text-emerald-700",
    progress: "bg-blue-50 text-blue-700",
    empty: "bg-slate-100 text-slate-500",
};

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const pdfText = (value) => String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, " ");
const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const dateRangeForYear = (year) => {
    const today = todayInputValue();
    const yearEnd = `${year}-12-31`;
    return { from: `${year}-01-01`, to: String(year) === today.slice(0, 4) ? today : yearEnd };
};
const elapsedMonthsForYear = (year) => {
    const now = new Date();
    const maxMonth = Number(year) === now.getFullYear() ? now.getMonth() - 1 : 11;
    return maxMonth < 0 ? [] : Array.from({ length: maxMonth + 1 }, (_, index) => index);
};
const monthEndKey = (year, monthIndex) => toDateKey(new Date(Number(year), monthIndex + 1, 0, 12));
const daysInMonth = (year, monthIndex) => new Date(Number(year), monthIndex + 1, 0).getDate();
const breakTypeLabel = (row) => {
    if (!Number(row.break_minutes || 0)) return "No break";
    const sources = [...new Set((row.breaks || []).map((item) => item.source).filter(Boolean))];
    if (sources.includes("manual")) return "Manual";
    if (sources.includes("correction")) return "Corrected";
    return row.break_type ? titleCase(row.break_type) : "Unpaid";
};
const firstPresent = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== "") || "";
const employeeName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.name || user?.display_name || user?.email || "";
const companyLine = (user) => [user?.company?.address, user?.company?.city, user?.company?.country].filter(Boolean).join(", ");
const statementFileName = (year, monthIndex) => `working-hours-sheet-${year}-${String(monthIndex + 1).padStart(2, "0")}.pdf`;
const generatedAtText = () => new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(new Date());
const holidayStateForUser = (user) => firstPresent(user?.state_code, user?.federal_state, user?.company?.federal_state, user?.company?.state_code);
const buildHolidayMap = (holidays, user) => {
    const state = String(holidayStateForUser(user) || "").toUpperCase();
    return (holidays || []).reduce((map, holiday) => {
        const holidayState = String(holiday.state_code || "").toUpperCase();
        if (state && holidayState && holidayState !== state) return map;
        map[holiday.holiday_date] = holiday;
        return map;
    }, {});
};
const earliestYearForUser = (user, fallbackYear) => {
    const historyYears = Number(user?.timesheet_history_years || user?.company?.timesheet_history_years || user?.company?.settings?.timesheet_history_years || 6);
    const policyStartYear = fallbackYear - Math.max(historyYears - 1, 0);
    const dates = [
        user?.employment_start_date,
        user?.hire_date,
        user?.joining_date,
        user?.created_at,
        user?.company?.created_at,
    ].map((value) => value ? parseApiDate(value) : null).filter(Boolean);
    if (!dates.length) {
        return policyStartYear;
    }
    return Math.max(policyStartYear, Math.min(...dates.map((date) => date.getFullYear())));
};
const startMonthForUser = (user) => {
    const value = firstPresent(user?.start_date, user?.employment_start_date, user?.hire_date, user?.joining_date);
    return value ? parseApiDate(value) : null;
};
const monthIsOnOrAfterStart = (year, monthIndex, startDate) => !startDate
    || Number(year) > startDate.getFullYear()
    || (Number(year) === startDate.getFullYear() && monthIndex >= startDate.getMonth());

const monthRowsFromData = (rows, year, monthIndex) => rows.filter((row) => {
    const date = parseApiDate(row.date);
    return date?.getFullYear() === Number(year) && date.getMonth() === monthIndex;
});

export const buildMonthStatement = (rows, year, monthIndex, holidayMap = {}) => {
    const today = todayInputValue();
    const isComplete = monthEndKey(year, monthIndex) < today;
    const lastDay = daysInMonth(year, monthIndex);
    const statementRows = [];
    for (let day = 1; day <= lastDay; day += 1) {
        const date = new Date(Number(year), monthIndex, day, 12);
        const key = toDateKey(date);
        if (key > today) break;
        const dailyRows = rows.filter((row) => row.date === key);
        const holiday = holidayMap[key];
        if (dailyRows.length) {
            dailyRows.forEach((row) => statementRows.push({ key: row.id || `${key}-${statementRows.length}`, date, row, holiday }));
        } else {
            statementRows.push({ key, date, row: null, holiday });
        }
    }
    const recordedRows = statementRows.map((item) => item.row).filter(Boolean);
    const totals = recordedRows.reduce((acc, row) => ({
        worked: acc.worked + Number(row.worked_minutes || 0),
        breaks: acc.breaks + Number(row.break_minutes || 0),
        overtime: acc.overtime + Number(row.overtime_minutes || 0),
    }), { worked: 0, breaks: 0, overtime: 0 });
    return {
        monthIndex,
        label: `${monthNames[monthIndex]} ${year}`,
        isComplete,
        statementRows,
        recordedRows,
        totals,
        workingDays: new Set(recordedRows.filter((row) => Number(row.worked_minutes || 0) > 0).map((row) => row.date)).size,
        status: isComplete ? "Sheet ready" : "In progress",
        statusTone: isComplete ? "ready" : "progress",
    };
};

const profileDetails = (user, labels = {}) => ([
    ["Employee", employeeName(user)],
    ["Employee ID", firstPresent(user?.employee_code, user?.employee_id)],
    ["Email", user?.email],
    [labels.department || "Department", firstPresent(user?.department, user?.department_name)],
    [labels.branch || "Office", firstPresent(user?.office, user?.branch_name, user?.city)],
    ["Contract", titleCase(firstPresent(user?.contract_type, user?.employment_type))],
]).filter(([, value]) => value);

const statementRowCells = ({ date, row, holiday }) => {
    const weekend = [0, 6].includes(date.getDay());
    const status = row?.status ? titleCase(row.status) : holiday ? "Public Holiday" : weekend ? "Weekly Off" : "Missing";
    return [
        date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
        date.toLocaleDateString(undefined, { weekday: "short" }),
        row ? formatClock(row.check_in_at) : "-",
        row ? breakTypeLabel(row) : "-",
        row ? formatMinutes(row.break_minutes) : "-",
        row ? formatClock(row.check_out_at) : "-",
        status,
        row ? formatMinutes(row.worked_minutes) : "-",
    ];
};

const downloadBlob = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const downloadStatements = (statements, user, year, filename, labels) => {
    const pageWidth = 595;
    const pageHeight = 842;
    const brandName = "Attendio";
    const objects = [];
    const pages = [];
    const fontRegular = 1;
    const fontBold = 2;
    const addObject = (body) => {
        objects.push(body);
        return objects.length + 4;
    };
    const line = (x1, y1, x2, y2) => `${x1} ${y1} m ${x2} ${y2} l S`;
    const rect = (x, y, w, h, fill = false) => `${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}`;
    const text = (value, x, y, size = 10, bold = false) => `BT /F${bold ? "B" : "R"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`;
    const columns = [74, 40, 58, 72, 48, 58, 78, 76];
    const headers = ["Date", "Day", "Check In", "Break Type", "Break", "Check Out", "Status", "Worked Hours"];

    statements.forEach((statement) => {
        const ops = [];
        const details = profileDetails(user, labels);
        ops.push("1 1 1 rg", rect(0, 0, pageWidth, pageHeight, true));
        ops.push("0.02 0.45 0.98 rg", rect(48, 760, 40, 40, true));
        ops.push("1 1 1 rg", rect(58, 770, 20, 20, true));
        ops.push("0.03 0.09 0.22 rg", text(brandName, 104, 773, 26, true));
        ops.push(text("Working Hours Sheet generated through " + brandName, 48, 714, 17, true));
        ops.push(text("as of " + generatedAtText(), 414, 696, 11, true));
        const companyLines = [
            companyLine(user),
            user?.company?.phone ? `Tel: ${user.company.phone}` : "",
            user?.company?.email ? `Email: ${user.company.email}` : "",
            `Sheet Month: ${statement.label}`,
        ].filter(Boolean);
        companyLines.forEach((item, index) => ops.push(text(item, 48, 688 - (index * 13), 9)));
        details.slice(0, 6).forEach(([label, value], index) => ops.push(text(`${label}: ${value}`, 340, 675 - (index * 13), 9, index === 0)));

        const meta = [
            ["Total Worked", formatMinutes(statement.totals.worked)],
            ["Total Break", formatMinutes(statement.totals.breaks)],
            ["Total Overtime", formatMinutes(statement.totals.overtime)],
            ["Working Days", statement.workingDays],
        ];
        meta.forEach(([label, value], index) => {
            const x = 48 + (index * 125);
            ops.push("0.02 0.45 0.98 rg", rect(x, 574, 120, 18, true));
            ops.push("1 1 1 rg", text(label, x + 7, 580, 8, true));
            ops.push("1 1 1 rg", rect(x, 552, 120, 22, true));
            ops.push("0.10 0.10 0.12 RG", rect(x, 552, 120, 40));
            ops.push("0.03 0.09 0.22 rg", text(value, x + 7, 560, 10, true));
        });

        const tableX = 48;
        let y = 512;
        const rowH = 12;
        const tableW = columns.reduce((total, width) => total + width, 0);
        const drawColumnBorders = (top, bottom) => {
            let borderX = tableX;
            ops.push("0.48 0.52 0.60 RG", line(borderX, bottom, borderX, top));
            columns.forEach((width) => {
                borderX += width;
                ops.push("0.48 0.52 0.60 RG", line(borderX, bottom, borderX, top));
            });
        };
        ops.push("0.02 0.45 0.98 rg", rect(tableX, y, tableW, rowH + 5, true));
        ops.push("0.48 0.52 0.60 RG", rect(tableX, y, tableW, rowH + 5));
        drawColumnBorders(y + rowH + 5, y);
        let x = tableX;
        headers.forEach((header, index) => {
            ops.push("1 1 1 rg", text(header, x + 4, y + 5, 8, true));
            x += columns[index];
        });
        y -= rowH;
        statement.statementRows.forEach((item, rowIndex) => {
            if (rowIndex % 2 === 0) ops.push("0.98 0.99 1 rg", rect(tableX, y - 1, tableW, rowH, true));
            const cells = statementRowCells(item);
            x = tableX;
            ops.push("0.55 0.58 0.64 RG", line(tableX, y - 1, tableX + tableW, y - 1));
            drawColumnBorders(y + rowH - 1, y - 1);
            cells.forEach((cell, index) => {
                ops.push("0.03 0.09 0.22 rg", text(String(cell).slice(0, 18), x + 4, y + 2, 7));
                x += columns[index];
            });
            y -= rowH;
        });
        const footerY = y - 4;
        ops.push("0.91 0.95 1 rg", rect(tableX, footerY, tableW, rowH + 3, true));
        ops.push("0.48 0.52 0.60 RG", rect(tableX, footerY, tableW, rowH + 3));
        drawColumnBorders(footerY + rowH + 3, footerY);
        ops.push("0.03 0.09 0.22 rg", text("TOTAL", tableX + 4, footerY + 5, 8, true));
        ops.push(text(formatMinutes(statement.totals.breaks), tableX + 248, footerY + 5, 8, true));
        ops.push(text(formatMinutes(statement.totals.worked), tableX + tableW - 70, footerY + 5, 8, true));
        ops.push(text("This is a system generated working-hours sheet and does not require signature.", 48, 34, 8));
        ops.push(text(`Generated for ${year} by ${brandName}`, 372, 34, 8));

        const stream = ops.join("\n");
        const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        const pageId = addObject(`<< /Type /Page /Parent 3 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /FR ${fontRegular} 0 R /FB ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
        pages.push(pageId);
    });

    const catalog = "<< /Type /Catalog /Pages 3 0 R >>";
    const fontR = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    const fontB = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    const pagesObject = `<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    const allObjects = [fontR, fontB, pagesObject, catalog, ...objects];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    allObjects.forEach((body, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root 4 0 R >>\nstartxref\n${xref}\n%%EOF`;
    downloadBlob(filename, new Blob([pdf], { type: "application/pdf" }));
};

function SearchableYearSelect({ value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const visibleOptions = search.trim()
        ? options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()))
        : options;

    useEffect(() => {
        if (!open) return undefined;
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        const close = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        window.addEventListener("mousedown", close);
        return () => window.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div ref={rootRef} className="relative w-full sm:w-52">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
                <span className="truncate">{options.find((option) => option.value === value)?.label || value}</span>
                <ChevronDown size={16} className={`shrink-0 text-blue-600 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/15">
                    <label className="relative block">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={inputRef}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search year"
                            className="h-10 w-full rounded-lg border border-blue-100 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                    </label>
                    <div className="mt-2 max-h-52 overflow-auto">
                        {visibleOptions.map((option) => {
                            const selected = option.value === value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => { onChange(option.value); setSearch(""); setOpen(false); }}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold ${selected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
                                >
                                    {option.label}
                                    {selected && <Check size={15} />}
                                </button>
                            );
                        })}
                        {!visibleOptions.length && <p className="px-3 py-2 text-sm font-medium text-slate-500">No year found</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeePicker({ employees, selectedId, onSelect, canSelect }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [menuStyle, setMenuStyle] = useState({});
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const selected = employees.find((employee) => String(employee.id) === String(selectedId)) || employees[0];
    const visibleEmployees = employees.filter((employee) => {
        const text = `${employeeName(employee)} ${employee.employee_code || ""} ${employee.role_name || employee.job_title || ""}`.toLowerCase();
        return text.includes(query.trim().toLowerCase());
    });
    const openPicker = () => {
        if (!canSelect) return;
        const rect = rootRef.current?.getBoundingClientRect();
        if (rect) {
            const width = Math.min(384, window.innerWidth - 24);
            const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
            const top = rect.bottom + 2;
            const maxHeight = Math.min(420, Math.max(180, window.innerHeight - top - 12));
            setMenuStyle({ position: "fixed", left, top, width, maxHeight, zIndex: 220 });
        }
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return undefined;
        openPicker();
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        const close = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        };
        window.addEventListener("mousedown", close);
        window.addEventListener("resize", openPicker);
        window.addEventListener("scroll", openPicker, true);
        return () => {
            window.removeEventListener("mousedown", close);
            window.removeEventListener("resize", openPicker);
            window.removeEventListener("scroll", openPicker, true);
        };
    }, [open]);

    if (!selected) return null;

    return (
        <div ref={rootRef} className="relative min-w-0">
            <div className="flex min-w-0 items-center">
                {employees.slice(0, 4).map((employee, index) => {
                    const name = employeeName(employee);
                    const isSelected = String(employee.id) === String(selected.id);
                    return (
                        <span key={employee.id} className="group relative -ml-2 first:ml-0" style={{ zIndex: 10 - index }}>
                        <button
                            type="button"
                            onClick={() => canSelect && onSelect(employee.id)}
                            className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-blue-600 text-xs font-black text-white shadow-sm ${isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-white"}`}
                            title={name}
                        >
                            <Avatar className="h-full w-full">
                                <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-black text-white">{getInitials(name)}</AvatarFallback>
                            </Avatar>
                        </button>
                        <span className="pointer-events-none absolute left-1/2 top-full z-[230] mt-2 hidden w-max max-w-48 -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-black text-white shadow-xl group-hover:block group-focus-within:block">{name}</span>
                        </span>
                    );
                })}
                {employees.length > 4 && <button type="button" onClick={() => (open ? setOpen(false) : openPicker())} className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white bg-slate-950 text-xs font-black text-white shadow-sm">+{employees.length - 4}</button>}
                {canSelect && (
                    <button
                        type="button"
                        onClick={() => (open ? setOpen(false) : openPicker())}
                        className="ml-3 inline-flex h-11 min-w-0 items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-600 shadow-sm transition hover:bg-blue-50"
                    >
                        <span className="truncate">{employeeName(selected)}</span>
                        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
                    </button>
                )}
            </div>
            {open && canSelect && (
                <div style={menuStyle} className="overflow-hidden rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/20">
                    <label className="relative block">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee" className="h-11 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                    </label>
                    <div className="mt-2 overflow-auto" style={{ maxHeight: Math.max(140, Number(menuStyle.maxHeight || 420) - 72) }}>
                        {visibleEmployees.map((employee) => {
                            const name = employeeName(employee);
                            const active = String(employee.id) === String(selected.id);
                            return (
                                <button
                                    key={employee.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(employee.id);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}
                                >
                                    <Avatar className="h-11 w-11 shrink-0 border border-blue-100">
                                        <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-xs font-black text-white">{getInitials(name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-black">{name}</span>
                                        <span className={`block truncate text-xs font-bold ${active ? "text-blue-100" : "text-slate-500"}`}>{employee.role_name || employee.job_title || titleCase(employee.role_key || "employee")}</span>
                                        <span className={`block truncate text-[11px] font-bold ${active ? "text-blue-100" : "text-slate-400"}`}>{employee.employee_code || employee.email}</span>
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

export default function TimesheetsPage() {
    const { user } = useAuth();
    const { downloadsAllowed } = useBillingEntitlements(true);
    const departmentLabel = labelFor(user?.company, "department", "team");
    const branchLabel = labelFor(user?.company, "branch", "Office");
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(String(currentYear));
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const range = useMemo(() => dateRangeForYear(year), [year]);
    const canSelectEmployees = hasPermission(user, "reports.company") || hasPermission(user, "users.invite") || hasPermission(user, "attendance.approve");
    const employees = useEmployeesQuery(canSelectEmployees, { limit: 100, offset: 0 });
    const employeeOptions = useMemo(() => {
        const rows = employees.data?.data || [];
        const byId = new Map();
        [user, ...rows].filter(Boolean).forEach((employee) => byId.set(String(employee.id), employee));
        return [...byId.values()];
    }, [employees.data?.data, user]);
    const effectiveEmployeeId = selectedEmployeeId || user?.id;
    const isOwnTimesheet = !effectiveEmployeeId || String(effectiveEmployeeId) === String(user?.id);
    const myTimesheet = useMyTimesheetQuery(range, isOwnTimesheet);
    const employeeTimesheet = useEmployeeTimesheetQuery(effectiveEmployeeId, range, canSelectEmployees && Boolean(effectiveEmployeeId) && !isOwnTimesheet);
    const timesheet = isOwnTimesheet ? myTimesheet : employeeTimesheet;
    const selectedEmployee = employeeOptions.find((employee) => String(employee.id) === String(effectiveEmployeeId)) || user;
    const statementUser = isOwnTimesheet ? user : selectedEmployee;
    const holidays = useHolidaysQuery(true);
    const holidayMap = useMemo(() => buildHolidayMap(holidays.data?.data || [], statementUser), [holidays.data?.data, statementUser]);
    const startDate = startMonthForUser(statementUser);
    const months = useMemo(() => {
        const rows = timesheet.data?.data || [];
        return elapsedMonthsForYear(year)
            .filter((month) => monthIsOnOrAfterStart(year, month, startDate))
            .map((month) => buildMonthStatement(monthRowsFromData(rows, year, month), year, month, holidayMap));
    }, [holidayMap, startDate, timesheet.data?.data, year]);
    const downloadableMonths = months.filter((month) => month.isComplete);
    const startYear = earliestYearForUser(statementUser, currentYear);
    const yearOptions = Array.from({ length: currentYear - startYear + 1 }, (_, index) => {
        const optionYear = String(currentYear - index);
        return { value: optionYear, label: optionYear };
    });

    return (
        <div className="space-y-5">
            <PageHeading
                eyebrow="Timesheets"
                title="My Timesheet"
                text={`Select an employee and download completed monthly working-hours sheets for your ${departmentLabel.toLowerCase()} operation.`}
            />

            <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 px-5 py-4 shadow-lg shadow-blue-500/5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <EmployeePicker employees={employeeOptions} selectedId={effectiveEmployeeId} onSelect={setSelectedEmployeeId} canSelect={canSelectEmployees} />
                        <Field label="Year">
                            <SearchableYearSelect value={year} onChange={setYear} options={yearOptions} />
                        </Field>
                        <button
                            type="button"
                            disabled={!downloadableMonths.length || !downloadsAllowed}
                            title={!downloadsAllowed ? "Timesheet downloads are available on Standard." : undefined}
                            onClick={() => downloadStatements(downloadableMonths, statementUser, year, `working-hours-sheet-${year}.pdf`, { branch: branchLabel, department: departmentLabel })}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                        >
                            <Download size={16} /> Download All ({year})
                        </button>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white/85 shadow-lg shadow-blue-500/5">
                <div className="flex items-center gap-2 border-b border-blue-100 px-5 py-4">
                    <CalendarDays size={18} className="text-blue-600" />
                    <h2 className="text-lg font-black text-slate-950">Monthly Timesheet Summary</h2>
                </div>
                <div className="hidden grid-cols-[1.1fr_0.85fr_0.85fr_0.85fr_0.7fr_0.8fr_0.8fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 md:grid">
                    <span>Month</span><span>Worked Hours</span><span>Break Hours</span><span>Overtime</span><span>Working Days</span><span>Sheet</span><span>Action</span>
                </div>
                <div className="divide-y divide-blue-100">
                    {timesheet.isLoading && <div className="p-5"><EmptyState title="Loading timesheets" text="Monthly records are being prepared." /></div>}
                    {!timesheet.isLoading && !months.length && <div className="p-5"><EmptyState title="No completed sheets yet" text="Sheets appear after the first employment month is complete." /></div>}
                    {!timesheet.isLoading && months.map((month) => (
                        <div key={month.label} className="grid gap-3 px-5 py-4 md:grid-cols-[1.1fr_0.85fr_0.85fr_0.85fr_0.7fr_0.8fr_0.8fr] md:items-center">
                            <div className="flex items-center gap-3"><FileText size={17} className="text-blue-600" /><p className="font-black text-slate-950">{month.label}</p></div>
                            <p className="text-sm font-semibold text-slate-700">{month.recordedRows.length ? formatMinutes(month.totals.worked) : "-"}</p>
                            <p className="text-sm font-semibold text-slate-700">{month.recordedRows.length ? formatMinutes(month.totals.breaks) : "-"}</p>
                            <p className="text-sm font-semibold text-slate-700">{month.recordedRows.length ? formatMinutes(month.totals.overtime) : "-"}</p>
                            <p className="text-sm font-semibold text-slate-700">{month.recordedRows.length ? month.workingDays : "-"}</p>
                            <p><span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass[month.statusTone]}`}>{month.status}</span></p>
                            <button
                                type="button"
                                disabled={!month.isComplete || !downloadsAllowed}
                                title={!downloadsAllowed ? "Timesheet downloads are available on Standard." : undefined}
                                onClick={() => downloadStatements([month], statementUser, year, statementFileName(year, month.monthIndex), { branch: branchLabel, department: departmentLabel })}
                                className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-blue-100 px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400 disabled:hover:bg-white"
                            >
                                <Download size={15} /> Download
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 border-t border-blue-100 px-5 py-4 text-sm font-medium text-slate-500">
                    <Info size={16} className="text-blue-600" />
                    <span>Future months are hidden. The current month becomes available after it is complete.</span>
                </div>
            </section>
        </div>
    );
}
