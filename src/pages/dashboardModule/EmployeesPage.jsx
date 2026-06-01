import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Check,
    ChevronDown,
    ChevronRight,
    CalendarDays,
    Download,
    Edit3,
    KeyRound,
    Mail,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    UploadCloud,
    UserRound,
    Users,
    X,
} from "lucide-react";
import {
    useCreateEmployeeMutation,
    useDeleteEmployeeMutation,
    useEmployeesQuery,
    useImportEmployeesMutation,
    useUpdateEmployeeMutation,
    useUpdateEmployeeStatusMutation,
} from "../../hooks/useEmployeeService";
import { useBranchesQuery, useProjectsQuery } from "../../hooks/useAuthService.ts";
import { useBillingEntitlements } from "../../hooks/useBillingService.ts";
import { useAuth } from "../../context/auth-context.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { getInitials } from "../../utils";
import { Button } from "../../components/form/Button.jsx";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { labelFor } from "../../config/workspaceProfiles.js";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];
const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024;
const requiredImportColumns = ["first_name", "last_name", "email"];
const importColumns = [
    "employee_code",
    "first_name",
    "last_name",
    "email",
    "phone",
    "role_key",
    "job_title",
    "department",
    "manager_id",
    "branch_id",
    "project_ids",
    "contract_type",
    "employment_type",
    "expected_hours_period",
    "expected_hours",
    "country",
    "city",
    "start_date",
    "end_date",
    "password",
];

const importColumnAliases = {
    employee_code: ["employeecode", "employeeid", "code"],
    first_name: ["firstname", "first"],
    last_name: ["lastname", "last"],
    email: ["email", "emailaddress", "workemail"],
    phone: ["phone", "phonenumber", "mobile"],
    role_key: ["rolekey", "accessrole"],
    job_title: ["jobtitle", "title", "position", "role"],
    department: ["department", "team"],
    manager_id: ["managerid", "manager", "reportsto", "reports_to", "supervisor"],
    branch_id: ["branchid", "branch"],
    project_ids: ["projectids", "projects", "project"],
    contract_type: ["contracttype", "contract"],
    employment_type: ["employmenttype", "employment"],
    expected_hours_period: ["expectedhoursperiod", "hoursbasis", "hourbasis", "period"],
    expected_hours: ["expectedhours", "contracthours", "weeklyhours", "weekhours", "hoursperweek", "monthlyhours", "monthhours", "hourspermonth"],
    country: ["country"],
    city: ["city"],
    start_date: ["startdate", "joiningdate", "hiredate"],
    end_date: ["enddate", "contractenddate", "leavingdate"],
    password: ["password", "temppassword", "temporarypassword"],
};

const emptyForm = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    employee_code: "",
    password: "",
    role_key: "employee",
    job_title: "",
    department: "",
    manager_id: "",
    branch_id: "",
    project_ids: [],
    contract_type: "permanent_full_time",
    employment_type: "onsite",
    expected_hours_period: "weekly",
    expected_hours: "40",
    country: "",
    city: "",
    start_date: "",
    end_date: "",
};

const roleOptions = [
    { value: "employee", label: "Employee" },
    { value: "team_lead", label: "Team lead" },
    { value: "manager", label: "Manager" },
    { value: "department_head", label: "Department head" },
    { value: "project_manager", label: "Project manager" },
    { value: "recruiter", label: "Recruiter" },
    { value: "hr_admin", label: "HR admin" },
    { value: "finance_admin", label: "Finance admin" },
    { value: "it_admin", label: "IT admin" },
    { value: "auditor", label: "Auditor" },
    { value: "read_only", label: "Read-only" },
];

const contractOptions = [
    { value: "permanent_full_time", label: "Permanent full-time" },
    { value: "permanent_part_time", label: "Permanent part-time" },
    { value: "fixed_term_full_time", label: "Fixed-term full-time" },
    { value: "fixed_term_part_time", label: "Fixed-term part-time" },
    { value: "working_student", label: "Working student" },
    { value: "intern", label: "Intern" },
    { value: "contractor", label: "Contractor" },
    { value: "temporary", label: "Temporary" },
];

const employmentOptions = [
    { value: "onsite", label: "On-site" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
];

const expectedHoursPeriodOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
];

const endDateContractTypes = new Set(["fixed_term_full_time", "fixed_term_part_time", "intern", "working_student", "temporary", "contractor"]);
const employeeColumns = [
    { key: "employee", label: "Employee", width: 420, minWidth: 280 },
    { key: "code", label: "Code", width: 95, minWidth: 82 },
    { key: "role", label: "Role", width: 125, minWidth: 110 },
    { key: "title", label: "Job title", width: 190, minWidth: 150 },
    { key: "status", label: "Status", width: 95, minWidth: 88 },
    { key: "menu", label: "Menu", width: 64, minWidth: 60 },
];
const importPreviewColumns = [
    { key: "row", label: "Row", width: 68, minWidth: 60 },
    { key: "name", label: "Name", width: 190, minWidth: 140 },
    { key: "code", label: "Code", width: 110, minWidth: 92 },
    { key: "email", label: "Email", width: 270, minWidth: 180 },
    { key: "status", label: "Status", width: 190, minWidth: 145 },
    { key: "menu", label: "", width: 92, minWidth: 88 },
];
const employeeDetailColumns = [
    { key: "phone", label: "Phone", width: 150, minWidth: 120 },
    { key: "department", label: "Department", width: 150, minWidth: 120 },
    { key: "projects", label: "Projects", width: 180, minWidth: 140 },
    { key: "contract", label: "Employment contract", width: 180, minWidth: 150 },
    { key: "hours", label: "Expected hours", width: 150, minWidth: 125 },
    { key: "arrangement", label: "Work arrangement", width: 160, minWidth: 130 },
    { key: "country", label: "Country", width: 110, minWidth: 90 },
    { key: "city", label: "City", width: 130, minWidth: 100 },
    { key: "start", label: "Start date", width: 120, minWidth: 105 },
    { key: "end", label: "End date", width: 120, minWidth: 105 },
];
const requiredEmployeeFields = [
    "first_name",
    "last_name",
    "email",
    "role_key",
    "contract_type",
    "employment_type",
    "country",
    "city",
    "start_date",
];

const normalizeOption = (option) =>
    typeof option === "string" ? { value: option, label: option } : option;

const columnTemplate = (columns, widths) =>
    columns.map((column) => `minmax(0, ${widths[column.key]}fr)`).join(" ");

function useResizableColumns(columns, storageKey) {
    const defaultWidths = Object.fromEntries(columns.map((column) => [column.key, column.width]));
    const [widths, setWidths] = useState(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
            return Object.fromEntries(columns.map((column) => [
                column.key,
                Math.max(column.minWidth, Number(saved[column.key]) || column.width),
            ]));
        } catch {
            return defaultWidths;
        }
    });

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(widths));
    }, [storageKey, widths]);

    const startResize = (event, column, nextColumn) => {
        event.preventDefault();
        if (!nextColumn) return;
        const startX = event.clientX;
        const startWidth = widths[column.key];
        const nextStartWidth = widths[nextColumn.key];

        const onMouseMove = (moveEvent) => {
            const requestedDelta = moveEvent.clientX - startX;
            const maxGrow = nextStartWidth - nextColumn.minWidth;
            const maxShrink = startWidth - column.minWidth;
            const delta = Math.min(maxGrow, Math.max(-maxShrink, requestedDelta));
            setWidths((current) => ({
                ...current,
                [column.key]: startWidth + delta,
                [nextColumn.key]: nextStartWidth - delta,
            }));
        };
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    return { widths, startResize };
}

const normalizeImportHeader = (header) => String(header || "").trim().toLowerCase().replace(/[\s_-]/g, "");

const canonicalImportColumn = (header) => {
    const normalized = normalizeImportHeader(header);
    return Object.entries(importColumnAliases).find(([, aliases]) => aliases.includes(normalized))?.[0] || null;
};

const importStatusLabel = (item) => {
    if (item.status === "created") return "Created";
    if (item.status === "updated") return "Updated";
    if (item.status === "skipped" || item.reason?.toLowerCase().includes("already exists")) return "Already exists";
    return display(item.status);
};

const importStatusClass = (item) => {
    if (item.status === "created") return "text-emerald-600";
    if (item.status === "updated") return "text-blue-600";
    if (item.status === "skipped" || item.reason?.toLowerCase().includes("already exists")) return "text-amber-600";
    return "text-red-600";
};

const display = (value) =>
    value
        ? String(value)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
        : "Not set";

const fullName = (employee) =>
    [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
    employee?.email ||
    "Employee";

const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    return Array.from({ length: 14 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

const generateEmployeeCode = () => `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

const toDisplayDate = (value) => {
    if (!value) return "";
    const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
    return value;
};

const toIsoDate = (value) => {
    if (!value) return "";
    const displayMatch = String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
    return value;
};

const parseDateValue = (value) => {
    const display = toDisplayDate(value);
    const match = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (Number.isNaN(date.getTime())) return null;
    const isSameDate =
        date.getFullYear() === Number(match[3]) &&
        date.getMonth() === Number(match[2]) - 1 &&
        date.getDate() === Number(match[1]);
    return isSameDate ? date : null;
};

const formatDateDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}.${month}.${date.getFullYear()}`;
};
const formatDuration = (minutes = 0) => {
    const total = Math.max(Number(minutes || 0), 0);
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
};
const timeLabel = (value) => value
    ? new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "-";

const calendarDays = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        return date;
    });
};

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index,
    label: new Date(2026, index, 1).toLocaleDateString("en-US", { month: "short" }),
}));

const yearOptions = () => {
    const endYear = new Date().getFullYear() + 20;
    return Array.from({ length: endYear - 1979 }, (_, index) => 1980 + index);
};

function CalendarSelect({ value, options, onChange, isOpen, onOpen, onClose, className = "" }) {
    const [query, setQuery] = useState("");
    const inputRef = useRef(null);
    const selected = options.find((option) => String(option.value) === String(value));
    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase())
    );
    useEffect(() => {
        if (isOpen) window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }, [isOpen]);

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => (isOpen ? onClose() : onOpen())}
                className="flex h-9 w-full items-center justify-between rounded-xl border border-blue-100 bg-slate-50 px-2 text-left text-sm font-black text-slate-900 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
                <span className="truncate">{selected?.label}</span>
                <ChevronDown size={14} className={isOpen ? "shrink-0 rotate-180 text-blue-600 transition" : "shrink-0 text-slate-400 transition"} />
            </button>
            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/15">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search"
                                className="h-8 w-full rounded-xl bg-slate-50 pl-8 pr-2 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                    <div className="max-h-44 overflow-auto p-1.5">
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setQuery("");
                                    onClose();
                                }}
                                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                <span>{option.label}</span>
                                {String(option.value) === String(value) && <Check size={14} className="text-blue-600" />}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <p className="px-2 py-3 text-center text-xs font-medium text-slate-400">No match</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const parseCsvLine = (line) => {
    const cells = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            current += '"';
            index += 1;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells;
};

const normalizePhoneNumber = (value, country) => {
    if (!value) return "";
    const parsed = parsePhoneNumberFromString(String(value), country || undefined);
    return parsed?.isValid() ? parsed.formatInternational() : "";
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => {
    const email = normalizeEmail(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    if (email.length > 254 || email.includes("..")) return false;
    const [localPart, domain] = email.split("@");
    if (!localPart || localPart.length > 64 || !domain) return false;
    return domain.split(".").every((label) => label && !label.startsWith("-") && !label.endsWith("-"));
};

const validatePhoneNumber = (value, country) => {
    if (!value) return null;
    const parsed = parsePhoneNumberFromString(String(value), country || undefined);
    if (!parsed || !parsed.isValid()) return "phone number is invalid for selected country";
    if (country && parsed.country !== country) return "phone number does not match selected country";
    return null;
};

const validateEmployeeData = (data) => {
    const errors = {};

    requiredEmployeeFields.forEach((field) => {
        if (!String(data[field] || "").trim()) errors[field] = "Required";
    });
    if (data.email && !isValidEmail(data.email)) errors.email = "Enter a valid work email";
    if (data.phone) {
        const phoneError = validatePhoneNumber(data.phone, data.country);
        if (phoneError) errors.phone = phoneError;
    }
    if (data.start_date && !parseDateValue(data.start_date)) errors.start_date = "Use dd.mm.yyyy";
    if (endDateContractTypes.has(data.contract_type)) {
        if (!data.end_date) errors.end_date = "Required";
        else if (!parseDateValue(data.end_date)) errors.end_date = "Use dd.mm.yyyy";
    }
    if (data.start_date && data.end_date && parseDateValue(data.start_date) && parseDateValue(data.end_date) && parseDateValue(data.end_date) < parseDateValue(data.start_date)) {
        errors.end_date = "End date must be after start date";
    }
    if (!data.expected_hours_period) errors.expected_hours_period = "Required";
    const maxExpectedHours = data.expected_hours_period === "monthly" ? 220 : 48;
    if (!data.expected_hours) errors.expected_hours = "Required";
    else if (Number(data.expected_hours) <= 0 || Number(data.expected_hours) > maxExpectedHours) errors.expected_hours = data.expected_hours_period === "monthly" ? "Use 1-220" : "Use 1-48";
    return errors;
};

const validateImportRows = (rows, existingEmployees = []) => {
    const existingEmails = new Set(existingEmployees.map((employee) => employee.email?.toLowerCase()).filter(Boolean));
    const seenEmails = new Set();

    const nextRows = rows.map((row) => {
        const email = normalizeEmail(row.data.email);
        const errors = [];

        requiredImportColumns.forEach((column) => {
            if (!row.data[column]) errors.push(`${column.replace(/_/g, " ")} is required`);
        });
        if (email && !isValidEmail(email)) errors.push("email is invalid");
        const phoneError = validatePhoneNumber(row.data.phone, row.data.country);
        if (phoneError) errors.push(phoneError);
        if (row.data.start_date && !parseDateValue(row.data.start_date)) errors.push("start date must use dd.mm.yyyy");
        if (row.data.end_date && !parseDateValue(row.data.end_date)) errors.push("end date must use dd.mm.yyyy");
        if (row.data.start_date && row.data.end_date && parseDateValue(row.data.start_date) && parseDateValue(row.data.end_date) && parseDateValue(row.data.end_date) < parseDateValue(row.data.start_date)) {
            errors.push("end date must be after start date");
        }
        row.data.expected_hours_period = row.data.expected_hours_period || "weekly";
        const maxExpectedHours = row.data.expected_hours_period === "monthly" ? 220 : 48;
        if (!row.data.expected_hours) errors.push("expected hours is required");
        else if (Number(row.data.expected_hours) <= 0 || Number(row.data.expected_hours) > maxExpectedHours) errors.push(row.data.expected_hours_period === "monthly" ? "expected hours must be 1-220 monthly" : "expected hours must be 1-48 weekly");
        if (email && seenEmails.has(email)) errors.push("duplicate email in file");
        if (email) seenEmails.add(email);
        const willUpdate = email && existingEmails.has(email) && errors.length === 0;

        return {
            ...row,
            errors,
            status: errors.length > 0 ? "blocked" : willUpdate ? "update" : "ready",
        };
    });

    return {
        rows: nextRows,
        errors: [],
    };
};

const csvEscape = (value) => `"${String(value || "").replace(/"/g, '""')}"`;

const buildImportFile = (rows) => {
    const csv = [
        importColumns.join(","),
        ...rows.map((row) => {
            const normalizedData = {
                ...row.data,
                phone: normalizePhoneNumber(row.data.phone, row.data.country) || row.data.phone,
                start_date: toIsoDate(row.data.start_date),
                end_date: toIsoDate(row.data.end_date),
            };
            return importColumns.map((column) => csvEscape(normalizedData[column])).join(",");
        }),
    ].join("\n");
    return new File([csv], "employee-import-ready.csv", { type: "text/csv;charset=utf-8" });
};

const parseEmployeeCsv = (text, existingEmployees = []) => {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
        return { rows: [], errors: ["CSV must include a header row and at least one employee row."] };
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    const canonicalHeaders = headers.map((header) => canonicalImportColumn(header));
    const missingColumns = requiredImportColumns.filter((column) => !canonicalHeaders.includes(column));
    const usefulColumns = importColumns.filter((column) => canonicalHeaders.includes(column));

    if (missingColumns.length > 0 || usefulColumns.length < 3) {
        return {
            rows: [],
            errors: [`Missing required columns: ${missingColumns.join(", ") || requiredImportColumns.join(", ")}.`],
        };
    }

    const rows = lines.slice(1).map((line, index) => {
        const cells = parseCsvLine(line);
        const row = canonicalHeaders.reduce((acc, header, cellIndex) => {
            if (header) acc[header] = cells[cellIndex]?.trim() || "";
            return acc;
        }, {});

        return {
            rowNumber: index + 2,
            data: row,
            errors: [],
            status: "ready",
        };
    });

    const errors = rows.length === 0 ? ["CSV does not contain employee rows."] : [];
    const validated = validateImportRows(rows, existingEmployees);

    return { rows: validated.rows, errors: [...errors, ...validated.errors] };
};

function Field({ label, value, onChange, type = "text", placeholder, required = false, error, children }) {
    const datePickerRef = useRef(null);
    const isDate = type === "date";
    const selectedDate = isDate ? parseDateValue(value) : null;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [activeCalendarSelect, setActiveCalendarSelect] = useState(null);
    const [calendarStyle, setCalendarStyle] = useState({});
    const [visibleMonth, setVisibleMonth] = useState(selectedDate || new Date());
    const todayDisplay = formatDateDisplay(new Date());
    const years = yearOptions();

    useEffect(() => {
        if (!isDate || !isCalendarOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setIsCalendarOpen(false);
                setActiveCalendarSelect(null);
            }
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isCalendarOpen, isDate]);

    useEffect(() => {
        if (selectedDate) setVisibleMonth(selectedDate);
    }, [value]);

    const toggleCalendar = () => {
        if (!isCalendarOpen && datePickerRef.current) {
            const rect = datePickerRef.current.getBoundingClientRect();
            const calendarWidth = Math.min(320, window.innerWidth - 32);
            const calendarHeight = 430;
            const left = Math.min(Math.max(16, rect.left), window.innerWidth - calendarWidth - 16);
            const belowTop = rect.bottom + 2;
            const aboveTop = rect.top - calendarHeight - 8;
            const top = belowTop + calendarHeight <= window.innerHeight - 16
                ? belowTop
                : Math.max(16, aboveTop);
            setCalendarStyle({ left, top, width: calendarWidth });
        }
        setIsCalendarOpen((current) => !current);
        setActiveCalendarSelect(null);
    };

    return (
        <label className="space-y-2 text-left">
            {label && (
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}{required && <span className="ml-1 text-red-500">*</span>}
                </span>
            )}
            {children || (
                <div ref={datePickerRef} className="relative">
                    <input
                        value={isDate ? toDisplayDate(value) : value}
                        onChange={(event) => onChange(isDate ? event.target.value : event.target.value)}
                        type={isDate ? "text" : type}
                        placeholder={isDate ? "dd.mm.yyyy" : placeholder}
                        pattern={isDate ? "\\d{2}\\.\\d{2}\\.\\d{4}" : undefined}
                        inputMode={isDate ? "numeric" : undefined}
                        required={required}
                        className={isDate ? "h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 pr-11 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" : "h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"}
                    />
                    {isDate && (
                        <>
                            <button
                                type="button"
                                onClick={toggleCalendar}
                                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-blue-600 transition hover:bg-blue-50"
                                title="Choose date"
                            >
                                <CalendarDays size={16} />
                            </button>
                            {isCalendarOpen && (
                                <div style={calendarStyle} className="fixed z-[120] rounded-2xl border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/15">
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            ‹
                                        </button>
                                        <div className="grid flex-1 grid-cols-[1fr_112px] gap-2">
                                            <CalendarSelect
                                                value={visibleMonth.getMonth()}
                                                options={monthOptions}
                                                onChange={(nextMonth) => setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(nextMonth), 1))}
                                                isOpen={activeCalendarSelect === "month"}
                                                onOpen={() => setActiveCalendarSelect("month")}
                                                onClose={() => setActiveCalendarSelect(null)}
                                            />
                                            <CalendarSelect
                                                value={visibleMonth.getFullYear()}
                                                options={years.map((year) => ({ value: year, label: String(year) }))}
                                                onChange={(nextYear) => setVisibleMonth(new Date(Number(nextYear), visibleMonth.getMonth(), 1))}
                                                isOpen={activeCalendarSelect === "year"}
                                                onOpen={() => setActiveCalendarSelect("year")}
                                                onClose={() => setActiveCalendarSelect(null)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            ›
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                                        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-1">
                                        {calendarDays(visibleMonth).map((day, index) => {
                                            const displayValue = formatDateDisplay(day);
                                            const isSelected = displayValue === toDisplayDate(value);
                                            const isToday = displayValue === todayDisplay;
                                            const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
                                            return (
                                                <button
                                                    key={displayValue}
                                                    type="button"
                                                    onClick={() => {
                                                        onChange(displayValue);
                                                        setIsCalendarOpen(false);
                                                    }}
                                                    className={isSelected ? "grid h-9 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/20" : isToday ? "grid h-9 place-items-center rounded-xl bg-blue-50 text-sm font-black text-blue-600" : isOutsideMonth ? "grid h-9 place-items-center rounded-xl text-sm font-bold text-slate-300 transition hover:bg-blue-50 hover:text-blue-600" : "grid h-9 place-items-center rounded-xl text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"}
                                                >
                                                    {day.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-3">
                                        <button type="button" onClick={() => onChange("")} className="rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50">Clear</button>
                                        <button type="button" onClick={() => { onChange(todayDisplay); setVisibleMonth(new Date()); setIsCalendarOpen(false); }} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-100">Today</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
            {error && <span className="block text-xs font-bold text-red-600">{error}</span>}
        </label>
    );
}

function SearchableSelect({ label, value, onChange, options, placeholder = "Select", allowCustom = false, compact = false, required = false, error, renderOption }) {
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [menuStyle, setMenuStyle] = useState({});
    const normalizedOptions = options.map(normalizeOption);
    const selected = normalizedOptions.find((option) => option.value === value);
    const filteredOptions = normalizedOptions.filter((option) =>
        `${option.label} ${option.value} ${option.searchText || ""}`.toLowerCase().includes(query.toLowerCase())
    );
    const canUseCustom =
        allowCustom &&
        query.trim() &&
        !normalizedOptions.some((option) => option.label.toLowerCase() === query.trim().toLowerCase());
    const placeMenu = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return false;
        const width = Math.min(window.innerWidth - 24, compact ? Math.max(176, rect.width) : Math.max(rect.width, renderOption ? 320 : rect.width));
        const top = rect.bottom + 2;
        const maxHeight = Math.min(renderOption ? 340 : 256, Math.max(80, window.innerHeight - top - 12));
        const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
        setMenuStyle({ left, top, width, maxHeight });
        return true;
    };

    const selectValue = (nextValue) => {
        onChange(nextValue);
        setQuery("");
        setIsOpen(false);
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        const closeOnOutsideClick = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        placeMenu();
        document.addEventListener("mousedown", closeOnOutsideClick);
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", placeMenu, true);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", placeMenu, true);
        };
    }, [compact, isOpen, renderOption]);
    const toggleOpen = () => {
        if (isOpen) {
            setIsOpen(false);
            setQuery("");
            return;
        }
        if (placeMenu()) setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative space-y-2 text-left">
            {label && (
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}{required && <span className="ml-1 text-red-500">*</span>}
                </span>
            )}
            <button
                type="button"
                onClick={toggleOpen}
                className={compact ? "flex h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-2.5 text-left text-sm font-medium text-slate-900 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" : "flex h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"}
            >
                <span className={selected || value ? "truncate" : "truncate text-slate-400"}>
                    {selected ? (selected.flag ? `${selected.flag} ${selected.label}` : selected.label) : value || placeholder}
                </span>
                <ChevronDown size={17} className={isOpen ? "shrink-0 rotate-180 text-blue-600 transition" : "shrink-0 text-slate-400 transition"} />
            </button>
            {isOpen && menuStyle.left !== undefined && (
                <div style={{ position: "fixed", zIndex: 160, ...menuStyle }} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/15">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search..."
                                className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                    </div>
                    <div className="overflow-auto p-2" style={{ maxHeight: Math.max(120, Number(menuStyle.maxHeight || 256) - 58) }}>
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => selectValue(option.value)}
                                className={renderOption ? "flex w-full rounded-xl px-3 py-2 text-left transition hover:bg-blue-50" : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"}
                            >
                                {renderOption ? renderOption(option) : <span className="truncate">{option.flag ? `${option.flag} ${option.label}` : option.label}</span>}
                                {option.value === value && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}
                        {canUseCustom && (
                            <button
                                type="button"
                                onClick={() => selectValue(query.trim())}
                                className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-blue-600 transition hover:bg-blue-50"
                            >
                                Use "{query.trim()}"
                            </button>
                        )}
                        {filteredOptions.length === 0 && !canUseCustom && (
                            <p className="px-3 py-4 text-center text-xs font-medium text-slate-400">No option found</p>
                        )}
                    </div>
                </div>
            )}
            {error && <span className="block text-xs font-bold text-red-600">{error}</span>}
        </div>
    );
}

function PhoneField({ value, onChange, countryOptions, preferredCountry, error }) {
    const [selectedCountryCode, setSelectedCountryCode] = useState("");
    const currentDial = value?.match(/^\+\d+/)?.[0] || "";
    const selectedCountry =
        countryOptions.find((country) => country.dialCode === currentDial) ||
        countryOptions.find((country) => country.value === selectedCountryCode) ||
        countryOptions.find((country) => country.value === preferredCountry || country.name?.toLowerCase() === String(preferredCountry || "").toLowerCase()) ||
        null;
    const localNumber = selectedCountry?.dialCode && value?.startsWith(selectedCountry.dialCode)
        ? value.slice(selectedCountry.dialCode.length).trim()
        : value?.replace(/^\+\d+\s*/, "") || "";

    const updateValue = (country, number) => {
        const prefix = country?.dialCode || "";
        const digitsOnly = number.replace(/[^\d\s()-]/g, "");
        onChange(digitsOnly ? `${prefix} ${digitsOnly}`.trim() : "");
    };

    useEffect(() => {
        if (selectedCountry?.value) setSelectedCountryCode(selectedCountry.value);
    }, [selectedCountry?.value]);

    return (
        <label className="space-y-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Phone optional</span>
            <div className="grid grid-cols-[104px_1fr] gap-2">
                <SearchableSelect
                    label=""
                    value={selectedCountry?.value || ""}
                    onChange={(countryCode) => {
                        setSelectedCountryCode(countryCode);
                        updateValue(countryOptions.find((country) => country.value === countryCode), localNumber);
                    }}
                    options={countryOptions.map((country) => ({
                        value: country.value,
                        label: country.dialCode || country.value,
                        flag: country.flag,
                        searchText: `${country.name} ${country.dialCode} ${country.value}`,
                    }))}
                    placeholder="Code"
                    compact
                />
                <input
                    value={localNumber}
                    onChange={(event) => updateValue(selectedCountry, event.target.value)}
                    placeholder="1590 6340952"
                    inputMode="tel"
                    className="h-11 min-w-0 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
            </div>
            {error && <span className="block text-xs font-bold text-red-600">{error}</span>}
        </label>
    );
}

function ManagerOption({ option }) {
    const employee = option.employee;
    if (!employee) return <span className="truncate text-sm font-medium text-slate-700">{option.label}</span>;
    const name = fullName(employee);
    return (
        <div className="flex min-w-0 items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                <AvatarFallback className="bg-blue-600 text-xs font-black text-white">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{name}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">{employee.role_name || display(employee.role_key || "employee")}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-blue-600">{employee.employee_code || employee.id}</p>
            </div>
        </div>
    );
}

function CheckboxMultiSelect({ label, values = [], onChange, options, placeholder = "Select", emptyText = "No item selected." }) {
    const wrapperRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [menuStyle, setMenuStyle] = useState({});
    const selectedValues = new Set((values || []).map(String));
    const normalizedOptions = options.map(normalizeOption);
    const selectedOptions = normalizedOptions.filter((option) => selectedValues.has(String(option.value)));
    const filteredOptions = normalizedOptions.filter((option) =>
        `${option.label} ${option.value} ${option.searchText || ""}`.toLowerCase().includes(query.toLowerCase())
    );
    const placeMenu = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return false;
        const width = Math.min(window.innerWidth - 24, Math.max(280, rect.width));
        const top = rect.bottom + 2;
        const maxHeight = Math.min(320, Math.max(80, window.innerHeight - top - 12));
        const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
        setMenuStyle({ left, top, width, maxHeight });
        return true;
    };
    const toggleValue = (nextValue) => {
        const key = String(nextValue);
        const nextValues = selectedValues.has(key)
            ? (values || []).filter((item) => String(item) !== key)
            : [...(values || []), nextValue];
        onChange(nextValues);
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        placeMenu();
        document.addEventListener("mousedown", closeOnOutsideClick);
        window.addEventListener("resize", placeMenu);
        window.addEventListener("scroll", placeMenu, true);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            window.removeEventListener("resize", placeMenu);
            window.removeEventListener("scroll", placeMenu, true);
        };
    }, [isOpen]);
    const toggleOpen = () => {
        if (isOpen) {
            setIsOpen(false);
            setQuery("");
            return;
        }
        if (placeMenu()) setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className="space-y-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
            <button type="button" onClick={toggleOpen} className="flex h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <span className={selectedOptions.length ? "truncate" : "truncate text-slate-400"}>
                    {selectedOptions.length ? `${selectedOptions.length} selected` : placeholder}
                </span>
                <ChevronDown size={17} className={isOpen ? "shrink-0 rotate-180 text-blue-600 transition" : "shrink-0 text-slate-400 transition"} />
            </button>
            <div className="min-h-5 text-xs font-bold text-slate-500">
                {selectedOptions.length ? selectedOptions.map((option) => option.label).join(", ") : emptyText}
            </div>
            {isOpen && menuStyle.left !== undefined && (
                <div style={{ position: "fixed", zIndex: 170, ...menuStyle }} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/15">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                    </div>
                    <div className="overflow-auto p-2" style={{ maxHeight: Math.max(160, Number(menuStyle.maxHeight || 320) - 58) }}>
                        {filteredOptions.map((option) => {
                            const checked = selectedValues.has(String(option.value));
                            return (
                                <button key={option.value} type="button" onClick={() => toggleValue(option.value)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                    <span className={checked ? "grid h-5 w-5 shrink-0 place-items-center rounded-md bg-blue-600 text-white" : "grid h-5 w-5 shrink-0 place-items-center rounded-md border border-blue-200 bg-white text-transparent"}>
                                        <Check size={14} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                </button>
                            );
                        })}
                        {!filteredOptions.length && <p className="px-3 py-4 text-center text-xs font-medium text-slate-400">No option found</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function Modal({ title, children, onClose, size = "max-w-4xl" }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
            <div className={`min-w-0 max-h-[92vh] w-full ${size} overflow-auto rounded-[1.4rem] border border-blue-100 bg-white shadow-2xl shadow-blue-500/20`}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white/95 px-5 py-4 backdrop-blur">
                    <h2 className="text-lg font-black text-slate-950">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl px-3 py-2 text-sm font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        Close
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function EmployeeForm({ form, setForm, onSubmit, isLoading, mode, countryOptions, cityOptionsFor, branchOptions, projectOptions, managerOptions, errors, labels }) {
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const updateCountry = (value) => setForm((current) => ({ ...current, country: value, city: "" }));
    const showEndDate = endDateContractTypes.has(form.contract_type);
    const labelSet = { branch: "Branch", project: "Project", department: "Department", manager: "Manager", ...(labels || {}) };
    return (
        <form onSubmit={onSubmit} className="grid gap-5 p-5">
            <div>
                <p className="text-sm font-black text-slate-950">Basic identity</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Only name, email, and {labelSet.department.toLowerCase()} assignment usually need manual input. Defaults can be adjusted when needed.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Field label="First name" value={form.first_name} onChange={(value) => update("first_name", value)} placeholder="First name" required error={errors.first_name} />
                <Field label="Last name" value={form.last_name} onChange={(value) => update("last_name", value)} placeholder="Last name" required error={errors.last_name} />
                <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="employee@company.com" required error={errors.email} />
                <PhoneField value={form.phone} onChange={(value) => update("phone", value)} countryOptions={countryOptions} preferredCountry={form.country} error={errors.phone} />
                <Field label="Employee code optional" value={form.employee_code} onChange={(value) => update("employee_code", value)} placeholder="Auto if empty">
                    <div className="flex gap-2">
                        <input
                            value={form.employee_code}
                            onChange={(event) => update("employee_code", event.target.value)}
                            placeholder="Auto if empty"
                            className="h-11 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                        <button type="button" onClick={() => update("employee_code", generateEmployeeCode())} className="inline-flex items-center gap-1 rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100">
                            <KeyRound size={14} /> Generate
                        </button>
                    </div>
                </Field>
                {mode === "create" && (
                    <Field label="Password" value={form.password} onChange={(value) => update("password", value)} placeholder="Auto if empty">
                        <div className="flex gap-2">
                            <input
                                value={form.password}
                                onChange={(event) => update("password", event.target.value)}
                                placeholder="Auto if empty"
                                className="h-11 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                            <button type="button" onClick={() => update("password", generatePassword())} className="inline-flex items-center gap-1 rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100">
                                <KeyRound size={14} /> Generate
                            </button>
                        </div>
                    </Field>
                )}
            </div>

            <div className="border-t border-blue-50 pt-1">
                <p className="text-sm font-black text-slate-950">Role and assignment</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <SearchableSelect label="Access role" value={form.role_key} onChange={(value) => update("role_key", value)} options={roleOptions} placeholder="Select access role" required error={errors.role_key} />
                <Field label="Job title" value={form.job_title} onChange={(value) => update("job_title", value)} placeholder="Senior frontend engineer" />
                <Field label={labelSet.department} value={form.department} onChange={(value) => update("department", value)} placeholder={labelSet.department === "Ward" ? "Emergency" : labelSet.department === "Section" ? "Fresh produce" : "Operations"} />
                <SearchableSelect label={labelSet.manager} value={form.manager_id} onChange={(value) => update("manager_id", value)} options={[{ value: "", label: `No ${labelSet.manager.toLowerCase()}` }, ...managerOptions]} placeholder={`Select ${labelSet.manager.toLowerCase()}`} renderOption={(option) => <ManagerOption option={option} />} />
                <SearchableSelect label={labelSet.branch} value={form.branch_id} onChange={(value) => update("branch_id", value)} options={branchOptions} placeholder={`Select ${labelSet.branch.toLowerCase()}`} />
                <div className="space-y-2 md:col-span-2">
                    <CheckboxMultiSelect label={`${labelSet.project}s`} values={form.project_ids || []} onChange={(value) => update("project_ids", value)} options={projectOptions} placeholder={`Tick ${labelSet.project.toLowerCase()}s`} emptyText={`No ${labelSet.project.toLowerCase()} assigned.`} />
                </div>
            </div>
            <div className="border-t border-blue-50 pt-1">
                <p className="text-sm font-black text-slate-950">Employment defaults</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <SearchableSelect label="Employment contract" value={form.contract_type} onChange={(value) => update("contract_type", value)} options={contractOptions} placeholder="Select contract" required error={errors.contract_type} />
                <SearchableSelect label="Work arrangement" value={form.employment_type} onChange={(value) => update("employment_type", value)} options={employmentOptions} placeholder="Select arrangement" required error={errors.employment_type} />
                <SearchableSelect label="Expected hours basis" value={form.expected_hours_period || "weekly"} onChange={(value) => update("expected_hours_period", value)} options={expectedHoursPeriodOptions} placeholder="Select basis" required error={errors.expected_hours_period} />
                <Field label="Expected hours" type="number" value={form.expected_hours} onChange={(value) => update("expected_hours", value)} placeholder={form.expected_hours_period === "monthly" ? "e.g. 160" : "e.g. 35"} required error={errors.expected_hours} />
                <SearchableSelect label="Country" value={form.country} onChange={updateCountry} options={countryOptions} placeholder="Select country" required error={errors.country} />
                <SearchableSelect label="City" value={form.city} onChange={(value) => update("city", value)} options={cityOptionsFor(form.country)} placeholder={form.country ? "Select city" : "Select country first"} allowCustom required error={errors.city} />
                <Field label="Start date" type="date" value={form.start_date} onChange={(value) => update("start_date", value)} required error={errors.start_date} />
                {showEndDate && <Field label="End date" type="date" value={form.end_date} onChange={(value) => update("end_date", value)} required error={errors.end_date} />}
            </div>

            <div className="flex justify-end">
                <Button type="submit" isLoading={isLoading} className="w-auto px-6">
                    {mode === "create" ? "Create employee" : "Save changes"}
                </Button>
            </div>
        </form>
    );
}

function EmployeeDetails({ employee, countryLabelFor, labels }) {
    const labelSet = { project: "Project", department: "Department", ...(labels || {}) };
    const columns = useMemo(() => employeeDetailColumns.map((column) => {
        if (column.key === "department") return { ...column, label: labelSet.department };
        if (column.key === "projects") return { ...column, label: `${labelSet.project}s` };
        return column;
    }), [labelSet.department, labelSet.project]);
    const detailColumnSizing = useResizableColumns(columns, `employees-detail-table-widths-${employee.id}`);
    const gridTemplate = columnTemplate(columns, detailColumnSizing.widths);
    const values = {
        phone: employee.phone || "Not set",
        department: employee.department || "Not set",
        projects: (employee.project_names || []).join(", ") || "Not set",
        contract: display(employee.contract_type),
        hours: employee.expected_hours ? `${employee.expected_hours}h/${employee.expected_hours_period === "monthly" ? "month" : "week"}` : employee.weekly_hours ? `${employee.weekly_hours}h/week` : employee.monthly_hours ? `${employee.monthly_hours}h/month` : "Default",
        arrangement: display(employee.employment_type),
        country: countryLabelFor(employee.country),
        city: employee.city || "Not set",
        start: toDisplayDate(employee.start_date) || "Not set",
        end: toDisplayDate(employee.end_date) || "Not set",
    };

    return (
        <div className="border-t border-blue-50 bg-slate-50/70 px-4 py-4">
            <div className="grid gap-3 sm:hidden">
                {columns.map((column) => (
                    <div key={column.key} className="rounded-xl bg-white px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{column.label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{values[column.key]}</p>
                    </div>
                ))}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-blue-100 bg-white sm:block">
                <div className="grid min-w-[980px] gap-0 border-b border-blue-50 bg-slate-50/80" style={{ gridTemplateColumns: gridTemplate }}>
                    {columns.map((column, index) => (
                        <div key={column.key} className="relative min-w-0 whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            <span className="block truncate">{column.label}</span>
                            {index < columns.length - 1 && (
                                <button
                                    type="button"
                                    onMouseDown={(event) => detailColumnSizing.startResize(event, column, columns[index + 1])}
                                    className="absolute -right-1 top-1/2 h-5 w-2 -translate-y-1/2 cursor-col-resize rounded-full after:absolute after:left-1/2 after:top-0 after:h-5 after:w-px after:-translate-x-1/2 after:bg-blue-200 hover:after:bg-blue-500"
                                    title="Resize column"
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="grid min-w-[980px] gap-0" style={{ gridTemplateColumns: gridTemplate }}>
                    {columns.map((column) => (
                        <div key={column.key} className="min-w-0 whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">
                            <span className="block truncate">{values[column.key]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmployeeMobileCard({ employee, onEdit, onStatus, onDelete, isExpanded, onToggle, countryLabelFor, labels }) {
    const menuRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const name = fullName(employee);
    const isInactive = employee.status === "inactive";
    const runAction = (action) => {
        setIsMenuOpen(false);
        action();
    };

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isMenuOpen]);

    return (
        <div className="overflow-visible rounded-2xl border border-blue-100 bg-white text-left shadow-sm shadow-blue-500/5">
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <button type="button" onClick={onToggle} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title={isExpanded ? "Collapse details" : "Expand details"}>
                        <ChevronRight size={16} className={isExpanded ? "rotate-90 transition" : "transition"} />
                    </button>
                    <Avatar className="h-11 w-11 shrink-0 border border-blue-100">
                        <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-sm font-black text-white">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-slate-950">{name}</h3>
                        <p className="mt-1 break-all text-xs font-medium text-slate-500">{employee.email}</p>
                    </div>
                    <div ref={menuRef} className="relative">
                        <button type="button" onClick={() => setIsMenuOpen((current) => !current)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600" title="Employee actions">
                            <MoreHorizontal size={18} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-10 z-[80] w-44 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/15">
                                <button type="button" onClick={() => runAction(() => onEdit(employee))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                    <Edit3 size={15} /> Edit
                                </button>
                                <button type="button" onClick={() => runAction(() => onStatus(employee, isInactive ? "active" : "inactive"))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700">
                                    <Check size={15} /> {isInactive ? "Activate" : "Deactivate"}
                                </button>
                                <button type="button" onClick={() => runAction(() => onDelete(employee))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50">
                                    <Trash2 size={15} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Code</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{employee.employee_code || "Auto"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Status</p>
                        <span className={isInactive ? "mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500" : "mt-1 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600"}>{display(employee.status || "active")}</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Role</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{display(employee.role_key || "employee")}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Job title</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{employee.job_title || "Not set"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{labels?.branch || "Branch"}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{employee.branch_name || "Not set"}</p>
                    </div>
                </div>
            </div>
            {isExpanded && <EmployeeDetails employee={employee} countryLabelFor={countryLabelFor} labels={labels} />}
        </div>
    );
}

function ImportPreviewDetails({ row, countryLabelFor, labels }) {
    const details = [
        ["Phone", row.data.phone || "Not set"],
        [labels?.department || "Department", row.data.department || "Not set"],
        ["Employment contract", display(row.data.contract_type)],
        ["Work arrangement", display(row.data.employment_type)],
        ["Country", countryLabelFor(row.data.country)],
        ["City", row.data.city || "Not set"],
        ["Start date", toDisplayDate(row.data.start_date) || "Not set"],
        ["End date", toDisplayDate(row.data.end_date) || "Not set"],
    ];

    return (
        <div className="border-t border-blue-50 bg-slate-50/70 px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {details.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                        <p className="mt-1 truncate text-xs font-medium text-slate-700">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmployeeRow({ employee, onEdit, onStatus, onDelete, isExpanded, onToggle, gridTemplate, countryLabelFor, labels }) {
    const menuRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const name = fullName(employee);
    const isInactive = employee.status === "inactive";
    const toggleStatusLabel = isInactive ? "Activate" : "Deactivate";
    const runAction = (action) => {
        setIsMenuOpen(false);
        action();
    };

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isMenuOpen]);

    return (
        <div className="overflow-visible rounded-2xl border border-blue-100 bg-white text-left shadow-sm shadow-blue-500/5">
            <div className="grid w-full gap-3 px-4 py-3 xl:items-center" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title={isExpanded ? "Collapse details" : "Expand details"}
                    >
                        <ChevronRight size={16} className={isExpanded ? "rotate-90 transition" : "transition"} />
                    </button>
                    <Avatar className="h-11 w-11 border border-blue-100">
                        <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-sm font-black text-white">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{name}</h3>
                        <p className="mt-1 flex min-w-0 items-start gap-1 text-xs font-medium leading-4 text-slate-500">
                            <Mail size={13} />
                            <span className="line-clamp-2 break-all">{employee.email}</span>
                        </p>
                    </div>
                </div>

                <div className="min-w-0 text-xs font-medium leading-5 text-slate-600">
                    <span className="mr-2 font-black text-slate-400 xl:hidden">Code</span>
                    <span className="line-clamp-2 break-words">{employee.employee_code || "Auto"}</span>
                </div>

                <div className="min-w-0 text-xs font-medium leading-5 text-slate-500">
                    <span className="mr-2 font-black text-slate-400 xl:hidden">Role</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">{display(employee.role_key || "employee")}</span>
                </div>

                <div className="min-w-0 text-xs font-medium leading-5 text-slate-500">
                    <span className="mr-2 font-black text-slate-400 xl:hidden">Title</span>
                    <span className="line-clamp-2 break-words">{employee.job_title || "Not set"}</span>
                </div>

                <div>
                    <span className={isInactive ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500" : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600"}>{display(employee.status || "active")}</span>
                </div>

                <div ref={menuRef} className="relative flex justify-end">
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((current) => !current)}
                        className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Employee actions"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-10 z-[80] w-44 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/15">
                            <button type="button" onClick={() => runAction(() => onEdit(employee))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                <Edit3 size={15} /> Edit
                            </button>
                            <button type="button" onClick={() => runAction(() => onStatus(employee, isInactive ? "active" : "inactive"))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-700">
                                <Check size={15} /> {toggleStatusLabel}
                            </button>
                            <button type="button" onClick={() => runAction(() => onDelete(employee))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-600 transition hover:bg-red-50">
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isExpanded && <EmployeeDetails employee={employee} countryLabelFor={countryLabelFor} labels={labels} />}
        </div>
    );
}

export default function EmployeesPage() {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [form, setForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createTab, setCreateTab] = useState("standard");
    const [pendingCreate, setPendingCreate] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingImportRowDelete, setPendingImportRowDelete] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [importSearch, setImportSearch] = useState("");
    const [editingImportRow, setEditingImportRow] = useState(null);
    const [importResults, setImportResults] = useState([]);
    const [citiesByCountry, setCitiesByCountry] = useState({});
    const [countryOptions, setCountryOptions] = useState([]);
    const [detectedCountry, setDetectedCountry] = useState("");
    const [expandedEmployeeIds, setExpandedEmployeeIds] = useState(() => new Set());
    const [expandedImportRows, setExpandedImportRows] = useState(() => new Set());
    const employeeColumnSizing = useResizableColumns(employeeColumns, "employees-table-widths");
    const importColumnSizing = useResizableColumns(importPreviewColumns, "employee-import-table-widths");
    const branchLabel = labelFor(user?.company, "branch", "Branch");
    const projectLabel = labelFor(user?.company, "project", "Project");
    const departmentLabel = labelFor(user?.company, "department", "Department");
    const managerLabel = labelFor(user?.company, "manager", "Manager");
    const assignmentLabels = useMemo(() => ({ branch: branchLabel, project: projectLabel, department: departmentLabel, manager: managerLabel }), [branchLabel, departmentLabel, managerLabel, projectLabel]);

    const employees = useEmployeesQuery({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        q: search.trim(),
        branch_id: branchFilter,
        project_id: projectFilter,
    });
    const employeeLookups = useEmployeesQuery({ limit: 200, offset: 0 });
    const branches = useBranchesQuery();
    const projects = useProjectsQuery();
    const createEmployee = useCreateEmployeeMutation();
    const updateEmployee = useUpdateEmployeeMutation();
    const updateStatus = useUpdateEmployeeStatusMutation();
    const deleteEmployee = useDeleteEmployeeMutation();
    const importEmployees = useImportEmployeesMutation();
    const { downloadsAllowed, restrictedFreeMode, limits: billingLimits } = useBillingEntitlements(true);
    const countryCodeFor = (countryValue) => {
        if (!countryValue) return "";
        const match = countryOptions.find((country) =>
            country.value === countryValue || country.name?.toLowerCase() === String(countryValue).toLowerCase() || country.label.toLowerCase() === String(countryValue).toLowerCase()
        );
        return match?.value || countryValue;
    };
    const countryLabelFor = (countryValue) => {
        if (!countryValue) return "Not set";
        const match = countryOptions.find((country) =>
            country.value === countryValue || country.name?.toLowerCase() === String(countryValue).toLowerCase() || country.label.toLowerCase() === String(countryValue).toLowerCase()
        );
        return match?.label || match?.name || countryValue;
    };
    const cityOptionsFor = (countryCode) => {
        const normalizedCode = countryCodeFor(countryCode);
        return normalizedCode ? (citiesByCountry[normalizedCode] || []).map((name) => ({ value: name, label: name })) : [];
    };

    const employeeList = employees.data?.data || [];
    const employeeMeta = employees.data?.meta || {};
    const employeeTotal = Number(employeeMeta.total ?? employeeList.length);
    const employeeLimitReached = restrictedFreeMode && billingLimits.employees != null && employeeTotal >= Number(billingLimits.employees);
    const lookupEmployeeList = employeeLookups.data?.data || employeeList;
    const branchOptions = useMemo(() => (branches.data?.data || []).filter((branch) => branch.status !== "inactive").map((branch) => ({ value: branch.id, label: [branch.name, branch.city].filter(Boolean).join(" · ") })), [branches.data]);
    const projectOptions = useMemo(() => (projects.data?.data || []).filter((project) => project.status !== "inactive" && project.status !== "completed").map((project) => ({ value: project.id, label: [project.name, project.code].filter(Boolean).join(" · ") })), [projects.data]);
    const managerOptions = useMemo(() => lookupEmployeeList
        .filter((employee) => String(employee.id) !== String(editing?.id || ""))
        .map((employee) => ({ value: employee.id, label: fullName(employee), searchText: `${employee.employee_code || ""} ${employee.email || ""} ${employee.role_name || ""} ${employee.role_key || ""}`, employee })),
    [editing?.id, lookupEmployeeList]);
    const totalPages = Math.max(1, Math.ceil(employeeTotal / pageSize));
    const visibleEmployees = employeeList;
    const visibleStart = employeeTotal === 0 ? 0 : (page - 1) * pageSize + 1;
    const visibleEnd = Math.min((page - 1) * pageSize + visibleEmployees.length, employeeTotal);
    const readyImportRows = importPreview.filter((row) => row.status === "ready" || row.status === "update");
    const updateImportRows = importPreview.filter((row) => row.status === "update");
    const blockedImportRows = importPreview.filter((row) => row.status === "blocked");
    const importRowEditor = importPreview.find((row) => row.rowNumber === editingImportRow);
    const filteredImportPreview = useMemo(() => {
        const query = importSearch.trim().toLowerCase();
        if (!query) return importPreview;
        return importPreview.filter((row) =>
            `${row.data.first_name || ""} ${row.data.last_name || ""} ${row.data.email || ""} ${row.data.employee_code || ""} ${row.data.role_key || ""} ${row.data.country || ""} ${row.data.city || ""} ${row.errors.join(" ")}`.toLowerCase().includes(query)
        );
    }, [importPreview, importSearch]);
    const importEditorShowEndDate = importRowEditor ? endDateContractTypes.has(importRowEditor.data.contract_type) : false;
    const employeeGridTemplate = columnTemplate(employeeColumns, employeeColumnSizing.widths);
    const importGridTemplate = columnTemplate(importPreviewColumns, importColumnSizing.widths);

    const toggleExpandedEmployee = (employeeId) => {
        setExpandedEmployeeIds((current) => {
            const next = new Set(current);
            if (next.has(employeeId)) next.delete(employeeId);
            else next.add(employeeId);
            return next;
        });
    };
    const toggleExpandedImportRow = (rowNumber) => {
        setExpandedImportRows((current) => {
            const next = new Set(current);
            if (next.has(rowNumber)) next.delete(rowNumber);
            else next.add(rowNumber);
            return next;
        });
    };

    useEffect(() => {
        if (importResults.length === 0) return undefined;
        const timeoutId = window.setTimeout(() => setImportResults([]), 60000);
        return () => window.clearTimeout(timeoutId);
    }, [importResults]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        let isMounted = true;
        import("country-state-city/lib/country").then((module) => {
            if (!isMounted) return;
            const countryApi = module.default;
            const options = countryApi.getAllCountries().map((country) => {
                const rawPhoneCode = String(country.phonecode || "").replace(/\+/g, "").trim();
                return {
                    value: country.isoCode,
                    label: country.name,
                    name: country.name,
                    flag: country.flag,
                    dialCode: rawPhoneCode ? `+${rawPhoneCode}` : "",
                    searchText: `${country.name} ${country.isoCode}`,
                };
            });
            const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const countryFromTimeZone = countryApi.getAllCountries().find((country) =>
                country.timezones?.some((zone) => zone.zoneName === browserTimeZone)
            )?.isoCode;
            const regionFromLocale = Intl.DateTimeFormat().resolvedOptions().locale?.match(/[-_]([A-Z]{2})\b/i)?.[1]?.toUpperCase();
            const detectedRegion = countryFromTimeZone || regionFromLocale;
            const validRegion = options.some((country) => country.value === detectedRegion) ? detectedRegion : "";
            setDetectedCountry(validRegion);
            setCountryOptions(options);
        });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const requestedCountries = [form.country, editing?.country, importRowEditor?.data.country]
            .map(countryCodeFor)
            .filter((code) => code && !citiesByCountry[code]);
        if (requestedCountries.length === 0) return undefined;
        let isMounted = true;
        [...new Set(requestedCountries)].forEach((code) => {
            fetch(`/geo/cities/${code}.json`)
                .then((response) => response.ok ? response.json() : [])
                .then((names) => {
                    if (isMounted) setCitiesByCountry((current) => ({ ...current, [code]: names }));
                })
                .catch(() => {});
        });
        return () => {
            isMounted = false;
        };
    }, [form.country, editing?.country, importRowEditor?.data.country, citiesByCountry, countryOptions]);

    const cleanPayload = (source) => {
        const payload = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
        if (payload.email) payload.email = normalizeEmail(payload.email);
        if (payload.phone) payload.phone = normalizePhoneNumber(payload.phone, payload.country) || payload.phone;
        if (payload.start_date) payload.start_date = toIsoDate(payload.start_date);
        if (payload.end_date) payload.end_date = toIsoDate(payload.end_date);
        payload.expected_hours_period = payload.expected_hours_period || "weekly";
        if (payload.expected_hours) {
            payload.expected_hours = Number(payload.expected_hours);
            payload.weekly_hours = payload.expected_hours_period === "weekly" ? payload.expected_hours : undefined;
            payload.monthly_hours = payload.expected_hours_period === "monthly" ? payload.expected_hours : undefined;
        }
        Object.keys(payload).forEach((key) => {
            if (payload[key] === "" && key !== "manager_id") delete payload[key];
        });
        payload.provider = "local";
        return payload;
    };

    const openCreate = () => {
        if (employeeLimitReached) {
            toast.error(`Free plan allows ${billingLimits.employees} team members. Upgrade to Standard to add more.`);
            return;
        }
        setForm({ ...emptyForm, country: detectedCountry, start_date: formatDateDisplay(new Date()) });
        setFormErrors({});
        setCreateTab("standard");
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setImportSearch("");
        setEditingImportRow(null);
        setPendingImportRowDelete(null);
        setExpandedImportRows(new Set());
        setIsCreateOpen(true);
    };

    const openEdit = (employee) => {
        setEditing(employee);
        setForm({ ...emptyForm, ...employee, start_date: toDisplayDate(employee.start_date), end_date: toDisplayDate(employee.end_date), password: "", role_key: employee.role_key || "employee" });
        setFormErrors({});
    };

    const handleCreate = (event) => {
        event.preventDefault();
        const errors = validateEmployeeData(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error("Please fix the highlighted fields");
            return;
        }
        setPendingCreate(cleanPayload({
            ...form,
        }));
    };

    const confirmCreate = () => {
        if (!pendingCreate) return;
        createEmployee.mutate(pendingCreate, {
            onSuccess: (response) => {
                toast.success("Employee created", { description: response?.data?.generated_password ? `Temporary password: ${response.data.generated_password}` : "Employee record has been added." });
                setIsCreateOpen(false);
                setForm({ ...emptyForm, country: detectedCountry });
                setPendingCreate(null);
                employees.refetch();
            },
            onError: (error) => toast.error(error.message || "Unable to create employee"),
        });
    };

    const handleUpdate = (event) => {
        event.preventDefault();
        if (!editing?.id) {
            toast.error("Select an employee before saving changes");
            return;
        }
        const errors = validateEmployeeData(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error("Please fix the highlighted fields");
            return;
        }
        updateEmployee.mutate({ id: editing.id, data: cleanPayload(form) }, {
            onSuccess: () => {
                toast.success("Employee updated");
                setEditing(null);
                employees.refetch();
            },
            onError: (error) => toast.error(error.message || "Unable to update employee"),
        });
    };

    const handleStatus = (employee, status) => {
        updateStatus.mutate({ id: employee.id, status }, {
            onSuccess: () => {
                toast.success(status === "active" ? "Employee activated" : "Employee deactivated");
                employees.refetch();
            },
            onError: (error) => toast.error(error.message || "Unable to update status"),
        });
    };

    const handleDelete = (employee) => {
        setPendingDelete(employee);
    };

    const confirmDelete = () => {
        if (!pendingDelete?.id) return;
        deleteEmployee.mutate(pendingDelete.id, {
            onSuccess: () => {
                toast.success("Employee deleted");
                setPendingDelete(null);
                employees.refetch();
            },
            onError: (error) => toast.error(error.message || "Unable to delete employee"),
        });
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportResults([]);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setImportSearch("");
        setEditingImportRow(null);
        setPendingImportRowDelete(null);
        setExpandedImportRows(new Set());

        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "csv") {
            setImportErrors(["Only CSV files are supported here. In Apple Numbers, use File > Export To > CSV, then upload that CSV."]);
            event.target.value = "";
            return;
        }
        if (file.size > MAX_IMPORT_SIZE_BYTES) {
            setImportErrors(["CSV file is too large. Keep imports under 2 MB."]);
            event.target.value = "";
            return;
        }

        try {
            const text = await file.text();
            const parsed = parseEmployeeCsv(text, employeeList);
            setImportFile(file);
            setImportPreview(parsed.rows);
            setImportErrors(parsed.errors);
            setEditingImportRow(null);
            setPendingImportRowDelete(null);
            if (parsed.errors.length > 0) {
                toast.error("CSV needs review before import");
            } else {
                toast.success("CSV preview is ready");
            }
        } catch {
            setImportErrors(["Unable to read this CSV file."]);
        } finally {
            event.target.value = "";
        }
    };

    const confirmImport = () => {
        if (!importFile && importPreview.length === 0) {
            toast.error("Choose a CSV file first");
            return;
        }
        if (readyImportRows.length === 0) {
            toast.error("No ready employees to create");
            return;
        }
        if (restrictedFreeMode && billingLimits.employees != null && employeeTotal + readyImportRows.length > Number(billingLimits.employees)) {
            toast.error(`Free plan allows ${billingLimits.employees} team members. Reduce this import or upgrade to Standard.`);
            return;
        }

        importEmployees.mutate(buildImportFile(readyImportRows), {
            onSuccess: (response) => {
                setImportResults(response?.data || []);
                toast.success("Employee import completed");
                setImportFile(null);
                setImportPreview([]);
                setImportErrors([]);
                setImportSearch("");
                setEditingImportRow(null);
                setPendingImportRowDelete(null);
                employees.refetch();
            },
            onError: (error) => toast.error(error.message || "Unable to import employees"),
        });
    };

    const updateImportRow = (rowNumber, key, value) => {
        setImportPreview((current) => {
            const editedRows = current.map((row) =>
                row.rowNumber === rowNumber ? { ...row, data: { ...row.data, [key]: value } } : row
            );
            const validated = validateImportRows(editedRows, employeeList);
            return validated.rows;
        });
    };

    const removeImportRow = (rowNumber) => {
        setImportPreview((current) => {
            const editedRows = current.filter((row) => row.rowNumber !== rowNumber);
            const validated = validateImportRows(editedRows, employeeList);
            return validated.rows;
        });
        if (editingImportRow === rowNumber) setEditingImportRow(null);
        if (pendingImportRowDelete?.rowNumber === rowNumber) setPendingImportRowDelete(null);
        setExpandedImportRows((current) => {
            const next = new Set(current);
            next.delete(rowNumber);
            return next;
        });
    };

    const exportEmployees = () => {
        const headers = ["employee_code", "first_name", "last_name", "email", "phone", "role_key", "job_title", "department", "manager_id", "branch_id", "project_ids", "contract_type", "employment_type", "expected_hours_period", "expected_hours", "country", "city", "start_date", "end_date", "status"];
        const rows = employeeList.map((employee) => headers.map((key) => `"${String(employee[key] || "").replace(/"/g, '""')}"`).join(","));
        const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "registered-employees.csv";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-5">
            <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 text-left shadow-lg shadow-blue-500/5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Workforce directory</p>
                        {/* <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Employees</h1>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Create, import, edit, deactivate, and export company employees.</p> */}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={!downloadsAllowed} title={!downloadsAllowed ? "Exports are available on Standard." : undefined} onClick={exportEmployees} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-black text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300"><Download size={17} />Export employees</button>
                        <button type="button" disabled={employeeLimitReached} title={employeeLimitReached ? `Free plan allows ${billingLimits.employees} team members.` : undefined} onClick={openCreate} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><Plus size={17} />Add employee</button>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.4rem] border border-blue-100 bg-white/90 p-4 shadow-lg shadow-blue-500/5 sm:p-5">
                <div className="flex flex-col gap-3 text-left lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Users size={19} /></div>
                        <div>
                            <h2 className="text-base font-black text-slate-950">Registered employees</h2>
                            <p className="text-xs font-bold text-slate-500">{visibleEmployees.length} shown of {employeeTotal} records.</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="w-full sm:w-56">
                            <SearchableSelect
                                label=""
                                value={branchFilter}
                                onChange={(value) => {
                                    setBranchFilter(value);
                                    setPage(1);
                                }}
                                options={[{ value: "", label: `All ${branchLabel.toLowerCase()}s` }, ...branchOptions]}
                                placeholder={`All ${branchLabel.toLowerCase()}s`}
                                compact
                            />
                        </div>
                        <div className="w-full sm:w-56">
                            <SearchableSelect
                                label=""
                                value={projectFilter}
                                onChange={(value) => {
                                    setProjectFilter(value);
                                    setPage(1);
                                }}
                                options={[{ value: "", label: `All ${projectLabel.toLowerCase()}s` }, ...projectOptions]}
                                placeholder={`All ${projectLabel.toLowerCase()}s`}
                                compact
                            />
                        </div>
                        <div className="w-32">
                            <SearchableSelect
                                label=""
                                value={pageSize}
                                onChange={(value) => {
                                    setPageSize(Number(value));
                                    setPage(1);
                                }}
                                options={PAGE_SIZE_OPTIONS.map((option) => ({ value: option, label: `${option} rows` }))}
                                placeholder="Rows"
                                compact
                            />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search employees" className="h-10 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-64 lg:w-72" />
                        </div>
                    </div>
                </div>

                {importResults.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Last import · {importResults.length} rows</p>
                            <button
                                type="button"
                                onClick={() => setImportResults([])}
                                className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
                                title="Dismiss import results"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                            {importResults.slice(0, 9).map((item, index) => <p key={`${item.email}-${index}`} className="truncate">{item.email}: <span className={importStatusClass(item)}>{importStatusLabel(item)}</span></p>)}
                        </div>
                    </div>
                )}

                <div className="mt-4 space-y-3">
                    {employees.isLoading ? (
                        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">Loading employees...</div>
                    ) : visibleEmployees.length > 0 ? (
                        <>
                            <div className="space-y-3 lg:hidden">
                                {visibleEmployees.map((employee) => (
                                    <EmployeeMobileCard
                                        key={employee.id}
                                        employee={employee}
                                        onEdit={openEdit}
                                        onStatus={handleStatus}
                                        onDelete={handleDelete}
                                        isExpanded={expandedEmployeeIds.has(employee.id)}
                                        onToggle={() => toggleExpandedEmployee(employee.id)}
                                        countryLabelFor={countryLabelFor}
                                        labels={assignmentLabels}
                                    />
                                ))}
                            </div>
                            <div className="hidden overflow-x-auto pb-1 lg:block xl:overflow-visible">
                                <div className="min-w-[820px] space-y-3 xl:w-full xl:min-w-0">
                                    <div className="grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500" style={{ gridTemplateColumns: employeeGridTemplate }}>
                                        {employeeColumns.map((column, index) => (
                                            <span key={column.key} className="relative min-w-0 whitespace-nowrap pr-2">
                                                <span className="block truncate">{column.label}</span>
                                                {index < employeeColumns.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onMouseDown={(event) => employeeColumnSizing.startResize(event, column, employeeColumns[index + 1])}
                                                        className="group absolute -right-1 top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-col-resize items-center justify-center"
                                                        title={`Resize ${column.label}`}
                                                    >
                                                        <span className="h-5 w-px rounded-full bg-blue-200 transition group-hover:w-0.5 group-hover:bg-blue-500" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    {visibleEmployees.map((employee) => (
                                        <EmployeeRow
                                            key={employee.id}
                                            employee={employee}
                                            onEdit={openEdit}
                                            onStatus={handleStatus}
                                            onDelete={handleDelete}
                                            isExpanded={expandedEmployeeIds.has(employee.id)}
                                            onToggle={() => toggleExpandedEmployee(employee.id)}
                                            gridTemplate={employeeGridTemplate}
                                            countryLabelFor={countryLabelFor}
                                            labels={assignmentLabels}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
                            <UserRound className="mx-auto h-8 w-8 text-slate-300" />
                            <p className="mt-2 text-sm font-black text-slate-700">No employees found</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">Create or import employees to populate the list.</p>
                        </div>
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-blue-100 pt-4 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <p>{visibleStart}-{visibleEnd} of {employeeTotal} records · Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-blue-100 px-4 py-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                        <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-2xl border border-blue-100 px-4 py-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                    </div>
                </div>
            </section>

            {isCreateOpen && (
                <Modal title="Add employee" onClose={() => setIsCreateOpen(false)}>
                    <div className="border-b border-blue-100 bg-white px-5 pt-4">
                        <div className="inline-flex rounded-xl border border-blue-100 bg-slate-50 p-1">
                            {[
                                ["standard", "Standard"],
                                ["import", "Import CSV"],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCreateTab(key)}
                                    className={createTab === key ? "rounded-lg bg-white px-4 py-2 text-sm font-black text-blue-600 shadow-sm" : "rounded-lg px-4 py-2 text-sm font-black text-slate-500 transition hover:text-slate-900"}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {createTab === "standard" ? (
                        <EmployeeForm form={form} setForm={setForm} onSubmit={handleCreate} isLoading={createEmployee.isPending} mode="create" countryOptions={countryOptions} cityOptionsFor={cityOptionsFor} branchOptions={branchOptions} projectOptions={projectOptions} managerOptions={managerOptions} errors={formErrors} labels={assignmentLabels} />
                    ) : (
                        <div className="grid min-w-0 gap-5 p-4 sm:p-5">
                            <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 px-4 py-4 text-center">
                                <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
                                    <UploadCloud size={21} />
                                </div>
                                <h3 className="mt-3 text-center text-base font-black text-slate-950">Import workforce CSV</h3>
                                <p className="mx-auto mt-1 text-center text-sm font-medium leading-6 text-slate-500">
                                    Bring employee records in with review, corrections, and approval before the directory changes.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importEmployees.isPending}
                                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    <UploadCloud size={17} />
                                    Choose CSV
                                </button>
                                <a
                                    href="/sample-employee-import.csv"
                                    download
                                    className="ml-2 mt-4 inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-black text-blue-600 shadow-sm transition hover:bg-blue-50"
                                >
                                    <Download size={17} />
                                    Sample CSV
                                </a>
                                <input ref={fileInputRef} type="file" accept=".csv,.numbers,.xlsx,.xls,text/csv" onChange={handleImport} className="hidden" />
                            </div>

                            {importErrors.length > 0 && (
                                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-left">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-red-700">CSV needs review</p>
                                            <div className="mt-2 space-y-1 text-xs font-bold text-red-600">
                                                {importErrors.map((error) => <p key={error}>{error}</p>)}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setImportErrors([])} className="grid h-8 w-8 place-items-center rounded-xl text-red-400 transition hover:bg-white hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {importFile && (
                                <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4 text-left">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-950">{importFile.name}</p>
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                {readyImportRows.length} ready, {updateImportRows.length} updates, {blockedImportRows.length} blocked
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={importSearch}
                                                    onChange={(event) => setImportSearch(event.target.value)}
                                                    placeholder="Search preview"
                                                    className="h-10 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:w-56"
                                                />
                                            </div>
                                            <Button type="button" onClick={confirmImport} isLoading={importEmployees.isPending} className="w-auto px-5" disabled={readyImportRows.length === 0}>
                                                Apply {readyImportRows.length} ready
                                            </Button>
                                        </div>
                                    </div>
                                    {blockedImportRows.length > 0 && readyImportRows.length > 0 && (
                                        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                                            Blocked rows will be skipped. Edit or delete them here, or create only the ready employees.
                                        </p>
                                    )}
                                    <div className="mt-4 max-h-[360px] min-w-0 overflow-auto rounded-2xl border border-blue-50">
                                        <div className="divide-y divide-blue-50 lg:hidden">
                                            {filteredImportPreview.map((row) => (
                                                <div key={row.rowNumber} className="bg-white p-3 text-left">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-slate-900">{row.data.first_name || "Missing"} {row.data.last_name || ""}</p>
                                                            <p className="mt-1 break-all text-xs font-medium text-slate-500">{row.data.email || "Missing"}</p>
                                                        </div>
                                                        <button type="button" onClick={() => toggleExpandedImportRow(row.rowNumber)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400">
                                                            <ChevronRight size={14} className={expandedImportRows.has(row.rowNumber) ? "rotate-90 transition" : "transition"} />
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between gap-2">
                                                        <span className={row.status === "ready" ? "text-xs font-black text-emerald-600" : row.status === "update" ? "text-xs font-black text-blue-600" : "text-xs font-black text-red-600"}>{row.status === "ready" ? "Create" : row.status === "update" ? "Update existing" : row.errors.join(", ")}</span>
                                                        <div className="flex gap-1">
                                                            <button type="button" onClick={() => setEditingImportRow(row.rowNumber)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title="Edit row"><Edit3 size={15} /></button>
                                                            <button type="button" onClick={() => setPendingImportRowDelete(row)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Remove row"><Trash2 size={15} /></button>
                                                        </div>
                                                    </div>
                                                    {expandedImportRows.has(row.rowNumber) && <ImportPreviewDetails row={row} countryLabelFor={countryLabelFor} labels={assignmentLabels} />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hidden min-w-[760px] w-full lg:block">
                                            <div className="sticky top-0 z-10 grid gap-3 bg-slate-50 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500" style={{ gridTemplateColumns: importGridTemplate }}>
                                                {importPreviewColumns.map((column, index) => (
                                                    <span key={column.key} className="relative pr-2">
                                                        {column.label}
                                                        {index < importPreviewColumns.length - 1 && (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(event) => importColumnSizing.startResize(event, column, importPreviewColumns[index + 1])}
                                                                className="group absolute -right-1 top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-col-resize items-center justify-center"
                                                                title={`Resize ${column.label || "column"}`}
                                                            >
                                                                <span className="h-5 w-px rounded-full bg-blue-200 transition group-hover:w-0.5 group-hover:bg-blue-500" />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="divide-y divide-blue-50">
                                                {filteredImportPreview.map((row) => (
                                                    <div key={row.rowNumber} className="bg-white">
                                                        <div className="grid gap-3 px-3 py-2 text-left text-xs font-bold text-slate-600" style={{ gridTemplateColumns: importGridTemplate }}>
                                                            <span className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandedImportRow(row.rowNumber)}
                                                                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                                    title={expandedImportRows.has(row.rowNumber) ? "Collapse details" : "Expand details"}
                                                                >
                                                                    <ChevronRight size={14} className={expandedImportRows.has(row.rowNumber) ? "rotate-90 transition" : "transition"} />
                                                                </button>
                                                                {row.rowNumber}
                                                            </span>
                                                            <span className="truncate">{row.data.first_name || "Missing"} {row.data.last_name || ""}</span>
                                                            <span className="truncate">{row.data.employee_code || "Auto"}</span>
                                                            <span className="truncate">{row.data.email || "Missing"}</span>
                                                            <span className={row.status === "ready" ? "truncate text-emerald-600" : row.status === "update" ? "truncate text-blue-600" : "truncate text-red-600"}>{row.status === "ready" ? "Create" : row.status === "update" ? "Update existing" : row.errors.join(", ")}</span>
                                                            <span className="flex items-center gap-1">
                                                                <button type="button" onClick={() => setEditingImportRow(row.rowNumber)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title="Edit row">
                                                                    <Edit3 size={15} />
                                                                </button>
                                                                <button type="button" onClick={() => setPendingImportRowDelete(row)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Remove row">
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </span>
                                                        </div>
                                                        {expandedImportRows.has(row.rowNumber) && <ImportPreviewDetails row={row} countryLabelFor={countryLabelFor} labels={assignmentLabels} />}
                                                    </div>
                                                ))}
                                                {filteredImportPreview.length === 0 && (
                                                    <div className="px-3 py-8 text-center text-xs font-bold text-slate-400">No preview rows match your search.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {importResults.length > 0 && (
                                <div className="rounded-2xl border border-blue-100 bg-white p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Import results · {importResults.length} rows</p>
                                    <div className="mt-3 grid max-h-52 gap-2 overflow-auto pr-1 text-xs font-bold text-slate-600 sm:grid-cols-2">
                                        {importResults.map((item, index) => (
                                            <p key={`${item.email}-${index}`} className="truncate">
                                                {item.email}: <span className={importStatusClass(item)}>{importStatusLabel(item)}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            )}

            {editing && (
                <Modal title={`Edit ${fullName(editing)}`} onClose={() => setEditing(null)}>
                    <EmployeeForm form={form} setForm={setForm} onSubmit={handleUpdate} isLoading={updateEmployee.isPending} mode="edit" countryOptions={countryOptions} cityOptionsFor={cityOptionsFor} branchOptions={branchOptions} projectOptions={projectOptions} managerOptions={managerOptions} errors={formErrors} labels={assignmentLabels} />
                </Modal>
            )}

            {importRowEditor && (
                <Modal title={`Edit CSV row ${importRowEditor.rowNumber}`} onClose={() => setEditingImportRow(null)}>
                    <div className="grid gap-5 p-5">
                        {importRowEditor.status === "blocked" && (
                            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {importRowEditor.errors.join(", ")}
                            </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="First name" value={importRowEditor.data.first_name || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "first_name", value)} required />
                            <Field label="Last name" value={importRowEditor.data.last_name || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "last_name", value)} required />
                            <Field label="Employee code" value={importRowEditor.data.employee_code || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "employee_code", value)} placeholder="Auto if empty" />
                            <Field label="Email" type="email" value={importRowEditor.data.email || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "email", value)} required />
                            <SearchableSelect label="Access role" value={importRowEditor.data.role_key || "employee"} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "role_key", value)} options={roleOptions} placeholder="Select role" />
                            <PhoneField value={importRowEditor.data.phone || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "phone", value)} countryOptions={countryOptions} preferredCountry={importRowEditor.data.country} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Job title" value={importRowEditor.data.job_title || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "job_title", value)} placeholder="Developer" />
                            <Field label={departmentLabel} value={importRowEditor.data.department || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "department", value)} placeholder={departmentLabel === "Ward" ? "Emergency" : departmentLabel === "Section" ? "Fresh produce" : "Operations"} />
                            <SearchableSelect label={managerLabel} value={importRowEditor.data.manager_id || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "manager_id", value)} options={[{ value: "", label: `No ${managerLabel.toLowerCase()}` }, ...employeeList.map((employee) => ({ value: employee.id, label: [fullName(employee), employee.employee_code].filter(Boolean).join(" · ") }))]} placeholder={`Select ${managerLabel.toLowerCase()}`} />
                            <SearchableSelect label="Employment contract" value={importRowEditor.data.contract_type || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "contract_type", value)} options={contractOptions} placeholder="Select contract" />
                            <SearchableSelect label="Work arrangement" value={importRowEditor.data.employment_type || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "employment_type", value)} options={employmentOptions} placeholder="Select arrangement" />
                            <SearchableSelect label="Expected hours basis" value={importRowEditor.data.expected_hours_period || "weekly"} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "expected_hours_period", value)} options={expectedHoursPeriodOptions} placeholder="Select basis" />
                            <Field label="Expected hours" type="number" value={importRowEditor.data.expected_hours || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "expected_hours", value)} placeholder={(importRowEditor.data.expected_hours_period || "weekly") === "monthly" ? "e.g. 160" : "e.g. 35"} />
                            <SearchableSelect label="Country" value={importRowEditor.data.country || ""} onChange={(value) => { updateImportRow(importRowEditor.rowNumber, "country", value); updateImportRow(importRowEditor.rowNumber, "city", ""); }} options={countryOptions} placeholder="Select country" />
                            <SearchableSelect label="City" value={importRowEditor.data.city || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "city", value)} options={cityOptionsFor(importRowEditor.data.country)} placeholder={importRowEditor.data.country ? "Select city" : "Select country first"} allowCustom />
                            <Field label="Start date" type="date" value={importRowEditor.data.start_date || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "start_date", value)} />
                            {importEditorShowEndDate && <Field label="End date" type="date" value={importRowEditor.data.end_date || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "end_date", value)} />}
                            <Field label="Password" value={importRowEditor.data.password || ""} onChange={(value) => updateImportRow(importRowEditor.rowNumber, "password", value)} placeholder="Auto if empty">
                                <div className="flex gap-2">
                                    <input
                                        value={importRowEditor.data.password || ""}
                                        onChange={(event) => updateImportRow(importRowEditor.rowNumber, "password", event.target.value)}
                                        placeholder="Auto if empty"
                                        className="h-11 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                    <button type="button" onClick={() => updateImportRow(importRowEditor.rowNumber, "password", generatePassword())} className="inline-flex items-center gap-1 rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100">
                                        <KeyRound size={14} /> Generate
                                    </button>
                                </div>
                            </Field>
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setPendingImportRowDelete(importRowEditor)} className="rounded-2xl border border-red-100 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-50">Delete row</button>
                            <Button type="button" onClick={() => setEditingImportRow(null)} className="w-auto px-6">
                                Done
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {pendingImportRowDelete && (
                <Modal title="Delete CSV row?" onClose={() => setPendingImportRowDelete(null)} size="max-w-md">
                    <div className="grid gap-4 p-5">
                        <div className="rounded-2xl bg-red-50 p-3">
                            <p className="text-sm font-black text-slate-950">
                                Row {pendingImportRowDelete.rowNumber}: {pendingImportRowDelete.data.first_name || "Missing"} {pendingImportRowDelete.data.last_name || ""}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-600">{pendingImportRowDelete.data.email || "No email"}</p>
                        </div>
                        <p className="text-sm font-medium leading-6 text-slate-500">This row will be removed from the import preview only.</p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setPendingImportRowDelete(null)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={() => removeImportRow(pendingImportRowDelete.rowNumber)} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700">
                                Delete row
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {pendingCreate && (
                <Modal title="Review employee" onClose={() => setPendingCreate(null)} size="max-w-lg">
                    <div className="grid gap-4 p-5">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                            <p className="text-base font-black text-slate-950">{pendingCreate.first_name} {pendingCreate.last_name}</p>
                            <p className="mt-1 text-sm font-bold text-slate-600">{pendingCreate.email}</p>
                        </div>
                        <div className="grid gap-2 rounded-2xl border border-blue-100 bg-white p-4 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-slate-400">Role</span>
                                <span className="text-right font-black text-slate-800">{display(pendingCreate.role_key)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-slate-400">Title</span>
                                <span className="text-right font-black text-slate-800">{pendingCreate.job_title || "Not set"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-slate-400">Contract</span>
                                <span className="text-right font-black text-slate-800">{display(pendingCreate.contract_type)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-slate-400">Expected hours</span>
                                <span className="text-right font-black text-slate-800">{pendingCreate.expected_hours ? `${pendingCreate.expected_hours}h/${pendingCreate.expected_hours_period === "monthly" ? "month" : "week"}` : "Default by contract"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-slate-400">Location</span>
                                <span className="text-right font-black text-slate-800">{[pendingCreate.city, pendingCreate.country].filter(Boolean).join(", ")}</span>
                            </div>
                        </div>
                        <p className="text-sm font-medium leading-6 text-slate-500">Confirm once before this employee is added to the company directory.</p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setPendingCreate(null)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancel</button>
                            <Button type="button" onClick={confirmCreate} isLoading={createEmployee.isPending} className="w-auto px-6">Create employee</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {pendingDelete && (
                <Modal title="Delete employee?" onClose={() => setPendingDelete(null)}>
                    <div className="grid gap-5 p-5">
                        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4">
                            <Avatar className="h-12 w-12 border border-red-100">
                                <AvatarImage src={pendingDelete.profile_picture || pendingDelete.avatar_url} alt={fullName(pendingDelete)} />
                                <AvatarFallback className="bg-red-600 text-sm font-black text-white">{getInitials(fullName(pendingDelete))}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{fullName(pendingDelete)}</p>
                                <p className="truncate text-sm font-bold text-slate-600">{pendingDelete.email}</p>
                            </div>
                        </div>
                        <p className="text-sm font-semibold leading-6 text-slate-500">This removes the employee from the active directory. Historical records should stay preserved on the backend.</p>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setPendingDelete(null)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={confirmDelete} disabled={deleteEmployee.isPending} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70">
                                {deleteEmployee.isPending ? "Deleting..." : "Delete employee"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
