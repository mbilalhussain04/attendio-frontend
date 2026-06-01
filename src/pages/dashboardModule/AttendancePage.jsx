import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Download, Eye, LogIn, LogOut, MoreHorizontal, Save, Search, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context.jsx";
import { useBillingEntitlements } from "../../hooks/useBillingService.ts";
import {
    useAttendanceLocksQuery,
    useAttendancePolicyQuery,
    useBulkReviewAttendanceCorrectionsMutation,
    useCheckInMutation,
    useCheckOutMutation,
    useCreateSelfManualEntryMutation,
    useEndBreakMutation,
    useHolidaysQuery,
    useMyAttendanceCorrectionsQuery,
    useMyTimesheetQuery,
    useOpenAttendanceQuery,
    usePendingAttendanceCorrectionsQuery,
    useRequestAttendanceCorrectionMutation,
    useResetMyAttendanceDateMutation,
    useReviewAttendanceCorrectionMutation,
    useStartBreakMutation,
    useTodayAttendanceQuery,
    useWhoIsInQuery,
} from "../../hooks/useAttendanceService";
import { useEmployeesQuery } from "../../hooks/useEmployeeService";
import { EmptyState, Field, PageHeading, formatClock, formatDate, formatMinutes, hasPermission, inputClassName, parseApiDate, todayInputValue } from "./attendance-shared.jsx";
import { labelFor, moduleEnabled, resolveWorkspaceProfile } from "../../config/workspaceProfiles.js";

const toDateKey = (value) => {
    const date = parseApiDate(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const toLocalInput = (dateKey, time) => {
    if (!dateKey || !time) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
};
const splitDateTimeValue = (value) => {
    if (!value) return { date: "", time: "" };
    const date = parseApiDate(value);
    return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    };
};
const combineDateTimeValue = (date, time) => toLocalInput(date, time);
const timeOptions = Array.from({ length: 96 }, (_, index) => {
    const minutes = index * 15;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const breakOptions = Array.from({ length: 13 }, (_, index) => index * 15);
const timeOptionItems = timeOptions.map((time) => ({ value: time, label: time }));
const breakOptionItems = breakOptions.map((minutes) => ({ value: minutes, label: minutes ? formatMinutes(minutes) : "No break" }));
const correctionTypeOptions = [
    { value: "missing_checkout", label: "Missing checkout" },
    { value: "missing_checkin", label: "Missing check-in" },
    { value: "late_checkin", label: "Late check-in" },
    { value: "early_checkout", label: "Early checkout" },
    { value: "wrong_checkin", label: "Wrong check-in time" },
    { value: "wrong_checkout", label: "Wrong checkout time" },
    { value: "break_correction", label: "Break correction" },
    { value: "forgot_break", label: "Forgot break" },
    { value: "extra_break", label: "Extra break recorded" },
    { value: "system_error", label: "System error" },
    { value: "device_issue", label: "Device issue" },
    { value: "location_issue", label: "Location issue" },
    { value: "manual_adjustment", label: "Manual adjustment" },
    { value: "other", label: "Other" },
];
const correctionColumns = [
    { key: "employee", label: "Employee", width: 330, minWidth: 260 },
    { key: "date", label: "Work Date", width: 160, minWidth: 112 },
    { key: "requested", label: "Requested At", width: 205, minWidth: 132 },
    { key: "type", label: "Type", width: 205, minWidth: 130 },
    { key: "status", label: "Status", width: 130, minWidth: 92 },
    { key: "action", label: "Action", width: 130, minWidth: 96 },
];
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
const countryTimeZones = {
    AT: "Europe/Vienna",
    AU: "Australia/Sydney",
    CA: "America/Toronto",
    CH: "Europe/Zurich",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    GB: "Europe/London",
    IN: "Asia/Kolkata",
    PK: "Asia/Karachi",
    US: "America/New_York",
};
const contractWeeklyDefaults = {
    permanent_full_time: 40,
    fixed_term_full_time: 40,
    intern: 40,
    temporary: 35,
    permanent_part_time: 20,
    fixed_term_part_time: 20,
    working_student: 20,
    contractor: null,
};
const minutesBetweenTimes = (start, end) => {
    if (!start || !end) return 0;
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
};
const resolveExpectedMinutes = (user, policy, period = "day") => {
    const expectedPeriod = user?.expected_hours_period || (user?.monthly_hours ? "monthly" : "weekly");
    const expectedHours = Number(user?.expected_hours || 0);
    const explicitWeekly = expectedPeriod === "weekly" && expectedHours ? expectedHours : Number(user?.weekly_hours || 0);
    const explicitMonthly = expectedPeriod === "monthly" && expectedHours ? expectedHours : Number(user?.monthly_hours || 0);
    const contractWeekly = contractWeeklyDefaults[user?.contract_type];
    const policyWeekly = Number(policy?.weekly_hours || 40);
    const weeklyHours = explicitWeekly || (explicitMonthly ? explicitMonthly * 12 / 52 : 0) || contractWeekly || policyWeekly;
    if (period === "month") return Math.round((explicitMonthly || weeklyHours * 52 / 12) * 60);
    if (period === "week") return Math.round(weeklyHours * 60);
    return Math.round((weeklyHours / 5) * 60);
};
const getMonthRange = (anchor) => ({ from: toDateKey(new Date(anchor.getFullYear(), anchor.getMonth(), 1)), to: toDateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)) });
const getWeekRange = (key) => {
    const date = new Date(`${key}T12:00:00`);
    const start = new Date(date);
    start.setDate(date.getDate() - ((date.getDay() || 7) - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDateKey(start), to: toDateKey(end) };
};
const buildRangeDays = (from, count = 7) => {
    const start = new Date(`${from}T12:00:00`);
    return Array.from({ length: count }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
};
const buildCalendarDays = (anchor) => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
    });
};
const liveWorkedMinutes = (entry, now) => {
    if (!entry?.check_in_at) return Number(entry?.worked_minutes || 0);
    if (entry.check_out_at) return Number(entry.worked_minutes || 0);
    const checkIn = parseApiDate(entry.check_in_at);
    const gross = Math.max(Math.floor((now - checkIn) / 60000), 0);
    const breakMinutes = liveBreakMinutes(entry, now);
    return Math.max(gross - breakMinutes, 0);
};
const liveBreakMinutes = (entry, now) => {
    if (!entry) return 0;
    if (entry.check_out_at) return Number(entry.break_minutes || 0);
    return (entry.breaks || []).reduce((total, item) => {
        const start = parseApiDate(item.start_at);
        const end = item.end_at ? parseApiDate(item.end_at) : now;
        return total + Math.max(Math.floor((end - start) / 60000), 0);
    }, 0);
};
const sumRowsLive = (rows, now) => rows.reduce((acc, row) => ({
    worked: acc.worked + liveWorkedMinutes(row, now),
    breaks: acc.breaks + liveBreakMinutes(row, now),
    overtime: acc.overtime + Number(row.overtime_minutes || 0),
}), { worked: 0, breaks: 0, overtime: 0 });
const formatLiveDuration = (value = 0) => {
    const seconds = Math.max(Math.floor(Number(value || 0)), 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return hours ? `${hours}h ${minutes}m ${remainder}s` : minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
};
const liveWorkedSeconds = (entry, now) => {
    if (!entry?.check_in_at) return Number(entry?.worked_minutes || 0) * 60;
    if (entry.check_out_at) return Number(entry.worked_minutes || 0) * 60;
    const gross = Math.max(Math.floor((now - parseApiDate(entry.check_in_at)) / 1000), 0);
    const breaks = (entry.breaks || []).reduce((total, item) => {
        const start = parseApiDate(item.start_at);
        const end = item.end_at ? parseApiDate(item.end_at) : now;
        return total + Math.max(Math.floor((end - start) / 1000), 0);
    }, 0);
    return Math.max(gross - breaks, 0);
};
const liveBreakSeconds = (rows, now) => rows.reduce((total, row) => {
    if (row.check_out_at) return total + Number(row.break_minutes || 0) * 60;
    return total + (row.breaks || []).reduce((sum, item) => {
        const start = parseApiDate(item.start_at);
        const end = item.end_at ? parseApiDate(item.end_at) : now;
        return sum + Math.max(Math.floor((end - start) / 1000), 0);
    }, 0);
}, 0);
const totalSpanMinutes = (rows, now) => rows.reduce((total, row) => {
    if (!row.check_in_at) return total;
    const start = parseApiDate(row.check_in_at);
    const end = row.check_out_at ? parseApiDate(row.check_out_at) : now;
    return total + Math.max(Math.floor((end - start) / 60000), 0);
}, 0);
const downloadCsv = (filename, rows) => {
    const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
const refreshAttendance = (queryClient) => queryClient.invalidateQueries({ queryKey: ["attendance"] });
const statusDot = { missing: "bg-slate-300", submitted: "bg-blue-500", holiday: "bg-slate-950", approved: "bg-blue-500", rejected: "bg-blue-500", locked: "bg-blue-500", open: "bg-blue-500", corrected: "bg-blue-500", closed: "bg-blue-500" };
const statusLabel = { missing: "Missing", submitted: "Submitted", holiday: "Public holiday", approved: "Submitted", rejected: "Submitted", locked: "Submitted", open: "Submitted", corrected: "Submitted", closed: "Submitted", future: "Future" };
const calendarSummaryItems = [
    ["missing", "Missing"],
    ["submitted", "Submitted"],
];
const holidayStateForUser = (user, policy) => {
    const value = user?.state_code || user?.federal_state || user?.company?.state_code || user?.company?.federal_state || policy?.federal_state || "";
    return String(value).toUpperCase();
};
const buildHolidayMap = (holidays, stateCode) => {
    const state = String(stateCode || "").toUpperCase();
    return (holidays || []).reduce((map, holiday) => {
        const holidayState = String(holiday.state_code || "").toUpperCase();
        if (state && holidayState && holidayState !== state) return map;
        map[holiday.holiday_date] = holiday;
        return map;
    }, {});
};
const actionLabels = { "check-in": "Check in", "check-out": "Check out", "break-start": "Start break", "break-end": "End break" };
const buildTimelineEvents = (entries, now) => entries.flatMap((entry) => {
    const events = [];
    const liveBreaks = (entry.breaks || []).filter((item) => !["manual", "correction"].includes(item.source));
    const liveBreakTotal = liveBreaks.reduce((total, item) => {
        if (!item.start_at) return total;
        const start = parseApiDate(item.start_at);
        const end = item.end_at ? parseApiDate(item.end_at) : now;
        return total + Math.max(Math.floor((end - start) / 60000), 0);
    }, 0);
    const deductedBreakMinutes = Math.max(Number(entry.break_minutes || 0) - liveBreakTotal, 0);
    if (entry.check_in_at) {
        events.push({
            id: `${entry.id}-check-in`,
            entryId: entry.id,
            type: "check-in",
            label: "Check in",
            time: entry.check_in_at,
            sortTime: entry.check_in_at,
            sequence: 0,
            detail: entry.source === "manual_self" ? "Submitted time" : "Work started",
        });
    }
    if (deductedBreakMinutes > 0) {
        events.push({
            id: `${entry.id}-deducted-break`,
            entryId: entry.id,
            type: "break",
            label: "Break time",
            time: null,
            displayTime: formatMinutes(deductedBreakMinutes),
            sortTime: entry.check_in_at || entry.check_out_at,
            sequence: 1,
            detail: "Recorded duration",
        });
    }
    liveBreaks.forEach((item) => {
        events.push({
            id: `${item.id}-break`,
            entryId: entry.id,
            type: "break",
            label: "Break",
            time: item.start_at,
            sortTime: item.start_at,
            sequence: 2,
            endTime: item.end_at,
            detail: item.end_at ? formatMinutes(Math.max(Math.floor((parseApiDate(item.end_at) - parseApiDate(item.start_at)) / 60000), 0)) : "In progress",
        });
        if (item.end_at && entry.source !== "manual_self") {
            events.push({
                id: `${item.id}-resume`,
                entryId: entry.id,
                type: "resume",
                label: "Check in",
                time: item.end_at,
                sortTime: item.end_at,
                sequence: 3,
                detail: "Back from break",
            });
        }
    });
    if (entry.check_out_at) {
        events.push({
            id: `${entry.id}-check-out`,
            entryId: entry.id,
            type: "check-out",
            label: "Check out",
            time: entry.check_out_at,
            sortTime: entry.check_out_at,
            sequence: 4,
            detail: "Work ended",
        });
    }
    return events;
}).sort((a, b) => {
    const left = a.sortTime || a.time;
    const right = b.sortTime || b.time;
    const leftValue = left ? parseApiDate(left).getTime() : 0;
    const rightValue = right ? parseApiDate(right).getTime() : 0;
    return leftValue === rightValue ? Number(a.sequence || 0) - Number(b.sequence || 0) : leftValue - rightValue;
});
const compactEventTime = (event) => event.displayTime || (event.type === "check-out" && !event.time ? "--:--" : formatClock(event.time));
const withPendingCheckout = (events, activeEntry) => activeEntry && !activeEntry.check_out_at
    ? [...events, { id: `${activeEntry.id}-pending-check-out`, entryId: activeEntry.id, type: "check-out", label: "Check out", time: null, detail: "Pending" }]
    : events;
const closedEntryForActions = (rows = []) => rows.find((entry) => ["closed", "approved", "corrected", "submitted"].includes(entry.status) && entry.check_in_at && entry.check_out_at);
const correctionStatusClass = (status) => status === "approved"
    ? "bg-emerald-50 text-emerald-700"
    : status === "rejected"
        ? "bg-rose-50 text-rose-600"
        : "bg-amber-50 text-amber-700";
const correctionItemsForRecord = (item) => item?._items || [item];
const correctionChanges = (item) => correctionItemsForRecord(item).flatMap((part) => ([
    part.requested_check_in_at && { label: "Check in", oldValue: formatClock(part.original_check_in_at), newValue: formatClock(part.requested_check_in_at) },
    part.requested_check_out_at && { label: "Check out", oldValue: formatClock(part.original_check_out_at), newValue: formatClock(part.requested_check_out_at) },
    part.requested_break_minutes !== null && part.requested_break_minutes !== undefined && { label: "Break", oldValue: formatMinutes(part.original_break_minutes || 0), newValue: formatMinutes(part.requested_break_minutes || 0) },
])).filter(Boolean);
const correctionTypeLabel = (item) => {
    const explicitType = correctionItemsForRecord(item).find((part) => part.correction_type)?.correction_type;
    const option = correctionTypeOptions.find((type) => type.value === explicitType);
    if (option) return option.label;
    if (correctionChanges(item).length > 1) return "Full Record Correction";
    if (item.requested_check_out_at && !item.original_check_out_at) return "Missing Checkout";
    if (item.requested_check_in_at && item.original_check_in_at && parseApiDate(item.requested_check_in_at) > parseApiDate(item.original_check_in_at)) return "Late Check In";
    if (item.requested_check_out_at && item.original_check_out_at && parseApiDate(item.requested_check_out_at) < parseApiDate(item.original_check_out_at)) return "Early Checkout";
    if (item.requested_break_minutes !== null && item.requested_break_minutes !== undefined) return "Break Correction";
    if (item.requested_check_in_at) return "Check In Correction";
    if (item.requested_check_out_at) return "Checkout Correction";
    return "Correction Request";
};
const correctionTypeClass = (item) => {
    const label = correctionTypeLabel(item);
    if (label === "Full Record Correction") return "bg-blue-50 text-blue-600";
    if (label === "Missing Checkout") return "bg-rose-50 text-rose-600";
    if (label === "Late Check In") return "bg-amber-50 text-amber-700";
    if (label === "Early Checkout") return "bg-violet-50 text-violet-700";
    return "bg-blue-50 text-blue-600";
};
const correctionRequestedChange = (item) => correctionChanges(item).map((change) => `${change.label} ${change.newValue}`).join(", ") || "Requested time change";
const correctionReasonText = (item) => [...new Set(correctionItemsForRecord(item).map((part) => part.reason).filter(Boolean))].join(" / ") || "Not provided";
const minutesBetweenDates = (start, end) => start && end ? Math.max(Math.floor((parseApiDate(end) - parseApiDate(start)) / 60000), 0) : 0;
const correctionSnapshot = (item, mode = "requested") => {
    const parts = correctionItemsForRecord(item);
    const base = parts[0] || item;
    const checkIn = mode === "requested" ? (parts.find((part) => part.requested_check_in_at)?.requested_check_in_at || base.original_check_in_at) : base.original_check_in_at;
    const checkOut = mode === "requested" ? (parts.find((part) => part.requested_check_out_at)?.requested_check_out_at || base.original_check_out_at) : base.original_check_out_at;
    const breakPart = mode === "requested" ? parts.find((part) => part.requested_break_minutes !== null && part.requested_break_minutes !== undefined) : null;
    const breakMinutes = Number((breakPart ? breakPart.requested_break_minutes : base.original_break_minutes) || 0);
    const grossMinutes = minutesBetweenDates(checkIn, checkOut);
    return { checkIn, checkOut, breakMinutes, grossMinutes, workedMinutes: Math.max(grossMinutes - breakMinutes, 0) };
};
const correctionDeltaMinutes = (item) => correctionSnapshot(item, "requested").workedMinutes - correctionSnapshot(item, "original").workedMinutes;
const correctionFinalEvents = (item, timeZone) => {
    const requested = correctionSnapshot(item, "requested");
    return [
        requested.checkIn && { label: "Check in", time: formatClockForZone(requested.checkIn, timeZone), tone: "bg-emerald-500" },
        Number(requested.breakMinutes || 0) > 0 && { label: "Break", time: formatMinutes(requested.breakMinutes), tone: "bg-amber-400" },
        requested.checkOut && { label: "Check out", time: formatClockForZone(requested.checkOut, timeZone), tone: "bg-rose-500" },
    ].filter(Boolean);
};
const correctionOriginalEvents = (item) => ([
    item.original_check_in_at && { id: `${item.id}-original-in`, type: "check-in", label: "Check In", time: item.original_check_in_at, detail: item.source || "Recorded" },
    Number(item.original_break_minutes || 0) > 0 && { id: `${item.id}-original-break`, type: "break", label: "Break Time", displayTime: formatMinutes(item.original_break_minutes || 0), detail: "Recorded duration" },
    item.original_check_out_at
        ? { id: `${item.id}-original-out`, type: "check-out", label: "Check Out", time: item.original_check_out_at, detail: item.source || "Recorded" }
        : { id: `${item.id}-original-missing-out`, type: "check-out", label: "Missing Checkout", time: null, detail: "Not recorded" },
]).filter(Boolean);
const employeeName = (employee, fallback = "Employee") => employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.email || fallback : fallback;
const employeeInitials = (employee) => employeeName(employee, "NA").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const realValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "Not available";
const timezoneForEmployee = (employee) => employee?.timezone || employee?.time_zone || countryTimeZones[String(employee?.country || "").toUpperCase()] || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const formatClockForZone = (value, timeZone) => {
    if (!value) return "--:--";
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone }).format(parseApiDate(value));
};
const formatDateForZone = (value, timeZone) => {
    if (!value) return "Not available";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone }).format(parseApiDate(value));
};
const groupCorrectionRecords = (items = []) => Object.values(items.reduce((groups, item) => {
    const key = `${item.attendance_entry_id || item.id}:${item.status}`;
    const existing = groups[key];
    const nextItems = [...(existing?._items || []), item].sort((a, b) => parseApiDate(a.created_at || a.entry_date).getTime() - parseApiDate(b.created_at || b.entry_date).getTime());
    const statuses = nextItems.map((part) => part.status);
    groups[key] = {
        ...nextItems[0],
        id: key,
        _items: nextItems,
        reason: [...new Set(nextItems.map((part) => part.reason).filter(Boolean))].join(" / "),
        requested_check_in_at: nextItems.find((part) => part.requested_check_in_at)?.requested_check_in_at || null,
        requested_check_out_at: nextItems.find((part) => part.requested_check_out_at)?.requested_check_out_at || null,
        requested_break_minutes: nextItems.find((part) => part.requested_break_minutes !== null && part.requested_break_minutes !== undefined)?.requested_break_minutes,
        correction_type: nextItems.find((part) => part.correction_type)?.correction_type,
        requester_timezone: nextItems.find((part) => part.requester_timezone)?.requester_timezone,
        status: statuses.includes("pending") ? "pending" : statuses.every((status) => status === "approved") ? "approved" : statuses.every((status) => status === "rejected") ? "rejected" : "reviewed",
        created_at: nextItems[0]?.created_at,
        updated_at: nextItems[nextItems.length - 1]?.updated_at,
    };
    return groups;
}, {}));
const previewEventsForTimes = (dateKey, checkIn, checkOut, breakMinutes = 0) => ([
    checkIn && { id: "preview-check-in", type: "check-in", label: "Check in", time: toLocalInput(dateKey, checkIn), detail: "Selected time", sequence: 0 },
    Number(breakMinutes || 0) > 0 && { id: "preview-break", type: "break", label: "Break time", time: null, sortTime: checkIn ? toLocalInput(dateKey, checkIn) : null, displayTime: formatMinutes(breakMinutes), detail: "Recorded duration", sequence: 1 },
    checkOut && { id: "preview-check-out", type: "check-out", label: "Check out", time: toLocalInput(dateKey, checkOut), detail: "Selected time", sequence: 4 },
]).filter(Boolean);

function TimelineList({ events, orientation = "vertical", onEventClick, activeEntry, activeBreak }) {
    if (!events.length) return <EmptyState title="No activity yet" text="Your attendance events will appear here in order." />;
    const horizontal = orientation === "horizontal";
    const currentEventId = (() => {
        if (!activeEntry || activeEntry.check_out_at) return null;
        if (activeBreak) {
            return [...events].reverse().find((event) => event.entryId === activeEntry.id && event.type === "break" && !event.endTime)?.id || null;
        }
        return [...events].reverse().find((event) => event.entryId === activeEntry.id && ["resume", "check-in"].includes(event.type))?.id || null;
    })();
    const shouldScroll = horizontal && events.length > 5;
    return (
        <div className={horizontal
            ? `${shouldScroll ? "overflow-x-auto" : "overflow-x-hidden"} w-full max-w-full px-3 pb-2 pt-3`
            : "relative space-y-5 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-blue-100"
        }>
            {horizontal && <div className={`flex min-w-full gap-0 ${shouldScroll ? "w-max" : "w-full"}`}>
            {events.map((event, index) => {
                const Wrapper = onEventClick ? "button" : "div";
                const isCurrent = event.id === currentEventId;
                return (
                    <Wrapper
                        key={event.id}
                        type={onEventClick ? "button" : undefined}
                        onClick={onEventClick ? () => onEventClick(event) : undefined}
                        className={horizontal
                            ? "relative grid min-w-[8.5rem] flex-1 grid-cols-1 gap-2 px-2 pt-0 text-left"
                            : "relative grid w-full grid-cols-[24px_76px_1fr] items-start gap-3 text-left"
                        }
                    >
                        {horizontal && index < events.length - 1 && <span className="pointer-events-none absolute -right-4 left-4 top-[8px] h-px bg-blue-100" />}
                        <span className={`relative z-10 flex h-4 w-4 items-center justify-center ${horizontal ? "ml-0" : "ml-1"}`}>
                            <span className={`rounded-full border-2 border-white ${isCurrent ? "h-4 w-4 bg-blue-600 ring-[5px] ring-blue-100" : `h-3 w-3 ${event.type === "check-out" ? "bg-rose-500" : event.type === "break" ? "bg-amber-400" : "bg-emerald-500"}`}`} />
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium text-slate-600">{compactEventTime(event)}</span>
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">{event.label}</span>
                            <span className={`mt-1 block text-xs font-medium ${isCurrent ? "text-blue-600" : "text-slate-500"}`}>{isCurrent ? `${event.detail} now` : event.detail}</span>
                        </span>
                    </Wrapper>
                );
            })}
            </div>}
            {!horizontal && events.map((event) => {
                const Wrapper = onEventClick ? "button" : "div";
                const isCurrent = event.id === currentEventId;
                return (
                    <Wrapper
                        key={event.id}
                        type={onEventClick ? "button" : undefined}
                        onClick={onEventClick ? () => onEventClick(event) : undefined}
                        className="relative grid w-full grid-cols-[24px_76px_1fr] items-start gap-3 text-left"
                    >
                        <span className="relative z-10 ml-1 flex h-4 w-4 items-center justify-center">
                            <span className={`rounded-full border-2 border-white ${isCurrent ? "h-4 w-4 bg-blue-600 ring-[5px] ring-blue-100" : `h-3 w-3 ${event.type === "check-out" ? "bg-rose-500" : event.type === "break" ? "bg-amber-400" : "bg-emerald-500"}`}`} />
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium text-slate-600">{compactEventTime(event)}</span>
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">{event.label}</span>
                            <span className={`mt-1 block text-xs font-medium ${isCurrent ? "text-blue-600" : "text-slate-500"}`}>{isCurrent ? `${event.detail} now` : event.detail}</span>
                        </span>
                    </Wrapper>
                );
            })}
        </div>
    );
}

function CorrectionCards({ items = [] }) {
    if (!items.length) return null;
    return (
        <div className="mt-5 space-y-3 border-t border-blue-100 pt-4">
            <p className="text-xs font-semibold text-blue-600">Correction requests</p>
            {items.map((item) => (
                (() => {
                    const original = correctionSnapshot(item, "original");
                    const requested = correctionSnapshot(item, "requested");
                    return (
                        <div key={item.id} className="rounded-2xl border border-blue-100 bg-white px-4 py-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-950">Requested change</p>
                                    {item.entry_date && <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(item.entry_date)}</p>}
                                </div>
                                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${correctionStatusClass(item.status)}`}>{item.status}</span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-600"><span className="font-semibold text-slate-950">Reason:</span> {correctionReasonText(item)}</p>
                            <div className="mt-3 overflow-hidden rounded-2xl border border-blue-100">
                                {[
                                    ["Check in", formatClock(original.checkIn), formatClock(requested.checkIn)],
                                    ["Check out", formatClock(original.checkOut), formatClock(requested.checkOut)],
                                    ["Break", formatMinutes(original.breakMinutes), formatMinutes(requested.breakMinutes)],
                                    ["Worked", formatMinutes(original.workedMinutes), formatMinutes(requested.workedMinutes)],
                                ].map(([label, oldValue, newValue]) => (
                                    <div key={label} className="grid gap-2 border-b border-blue-50 px-3 py-3 text-xs last:border-b-0 sm:grid-cols-[120px_1fr_auto_1fr] sm:items-center">
                                        <p className="font-semibold text-slate-500">{label}</p>
                                        <span className="text-slate-500">{oldValue}</span>
                                        <span className="hidden text-slate-300 sm:inline">→</span>
                                        <span className="font-semibold text-blue-600">{newValue}</span>
                                    </div>
                                ))}
                            </div>
                            {item.status === "approved" && <p className="mt-2 text-xs font-medium text-emerald-700">Approved changes are reflected in the attendance record.</p>}
                            {item.status === "rejected" && item.decision_reason && <p className="mt-2 text-xs font-medium text-rose-600">{item.decision_reason}</p>}
                        </div>
                    );
                })()
            ))}
        </div>
    );
}

function EmployeeAvatar({ employee }) {
    const src = employee?.avatar_url || employee?.profile_image_url || employee?.photo_url;
    return src
        ? <img src={src} alt="" className="h-11 w-11 rounded-full object-cover ring-4 ring-blue-50" />
        : <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ring-4 ring-blue-50">{employeeInitials(employee)}</span>;
}

function CorrectionReviewDrawer({ item, employee, note, setNote, onClose, onDecision, busy }) {
    if (!item) return null;
    const timeZone = item.requester_timezone || timezoneForEmployee(employee);
    const original = correctionSnapshot(item, "original");
    const requested = correctionSnapshot(item, "requested");
    const finalEvents = correctionFinalEvents(item, timeZone);

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-sm" onClick={onClose}>
            <aside
                className="ml-auto flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl shadow-slate-950/20"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-950">Review Correction Request</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-50"><X size={19} /></button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <section className="rounded-xl border border-blue-100 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-950">Employee Information</p>
                        <div className="mt-4 flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <EmployeeAvatar employee={employee} />
                                <div>
                                    <p className="font-semibold text-slate-950">{employeeName(employee, item.requested_by_user_id)}</p>
                                    <p className="mt-1 text-xs font-medium text-slate-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />{realValue(employee?.employee_code, item.employee_code)}</p>
                                </div>
                            </div>
                            <div className="text-left text-xs font-medium text-slate-500 sm:text-right">
                                <p>{realValue(employee?.branch_name, employee?.branch)}</p>
                                <p className="mt-1">{realValue(employee?.department_name, employee?.department)}</p>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-blue-100 pt-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-slate-950">Time Change</p>
                                <span className="text-xs font-semibold text-slate-500">{timeZone}</span>
                            </div>
                            <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 text-sm">
                                <div className="grid grid-cols-[1fr_1fr_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                                    <span>Field</span><span>Previous</span><span>New</span>
                                </div>
                                {[
                                    ["Check in", formatClockForZone(original.checkIn, timeZone), formatClockForZone(requested.checkIn, timeZone)],
                                    ["Check out", formatClockForZone(original.checkOut, timeZone), formatClockForZone(requested.checkOut, timeZone)],
                                    ["Break", formatMinutes(original.breakMinutes), formatMinutes(requested.breakMinutes)],
                                    ["Worked", formatMinutes(original.workedMinutes), formatMinutes(requested.workedMinutes)],
                                ].map(([label, oldValue, newValue]) => (
                                    <div key={label} className="grid grid-cols-[1fr_1fr_1fr] border-t border-blue-50 px-3 py-3">
                                        <span className="font-medium text-slate-500">{label}</span>
                                        <span className="font-semibold text-slate-700">{oldValue}</span>
                                        <span className="font-semibold text-blue-600">{newValue}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 rounded-xl border border-blue-100 bg-slate-50 px-3 py-3">
                                <p className="text-xs font-semibold text-slate-500">Reason</p>
                                <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{correctionReasonText(item)}</p>
                            </div>
                            <p className="mt-2 text-xs font-medium text-slate-500">Requested {item.created_at ? `${formatDateForZone(item.created_at, timeZone)}, ${formatClockForZone(item.created_at, timeZone)}` : "Not available"}</p>
                        </div>

                        <div className="mt-4 border-t border-blue-100 pt-4">
                            <p className="text-sm font-semibold text-slate-950">Day Summary</p>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <div className="rounded-xl border border-blue-100 px-3 py-3 text-left"><p className="text-[11px] font-semibold text-slate-500">Worked Hours</p><p className="mt-1 font-semibold text-slate-950">{formatMinutes(requested.workedMinutes)}</p></div>
                                <div className="rounded-xl border border-blue-100 px-3 py-3 text-left"><p className="text-[11px] font-semibold text-slate-500">Break</p><p className="mt-1 font-semibold text-slate-950">{formatMinutes(requested.breakMinutes)}</p></div>
                                <div className="rounded-xl border border-blue-100 px-3 py-3 text-left"><p className="text-[11px] font-semibold text-slate-500">Status</p><p className="mt-1 font-semibold capitalize text-slate-950">{item.status}</p></div>
                            </div>
                        </div>
                        <div className="mt-4 border-t border-blue-100 pt-4">
                            <p className="text-sm font-semibold text-slate-950">Final Timeline</p>
                            <div className="relative mt-5">
                                {finalEvents.map((event, index) => (
                                    <div key={`${event.label}-${index}`} className="relative flex min-h-14 items-center gap-4">
                                        {index < finalEvents.length - 1 && <span className="absolute left-[11.5px] top-1/2 h-14 w-px bg-blue-100" />}
                                        <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center bg-white">
                                            <span className={`h-[18px] w-[18px] rounded-full ${event.tone}`} />
                                        </span>
                                        <span className="w-[94px] shrink-0 whitespace-nowrap text-xl font-medium text-slate-600">{event.time}</span>
                                        <span className="text-xl font-medium text-slate-900">{event.label}</span>
                                    </div>
                                ))}
                                {!finalEvents.length && <p className="text-sm font-medium text-slate-500">No final timeline available.</p>}
                            </div>
                        </div>
                    </section>
                </div>
                <div className="border-t border-blue-100 bg-white px-4 py-4 sm:px-5">
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-950">Manager Notes (Optional)</span>
                        <textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 300))} placeholder="Add a note for this request..." className="mt-2 h-20 w-full resize-none rounded-xl border border-blue-100 px-3 py-2 text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                        <span className="mt-1 block text-right text-xs font-medium text-slate-400">{note.length}/300</span>
                    </label>
                    {item.status === "pending" && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button type="button" disabled={busy} onClick={() => onDecision("rejected")} className="h-12 rounded-xl border border-rose-300 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">Reject</button>
                            <button type="button" disabled={busy} onClick={() => onDecision("approved")} className="h-12 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Approve</button>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

function ThemedSelect({ value, onChange, options, placeholder = "Select", searchable = false }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const triggerRef = useRef(null);
    const selectedOptionRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState(null);
    const selected = options.find((option) => String(option.value) === String(value));
    const visibleOptions = searchable && search.trim()
        ? options.filter((option) => String(option.label || "").toLowerCase().includes(search.trim().toLowerCase()))
        : options;
    useEffect(() => {
        if (!open || !triggerRef.current) return undefined;
        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuStyle({ left: rect.left, top: rect.bottom + 2, width: rect.width });
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        window.requestAnimationFrame(() => selectedOptionRef.current?.scrollIntoView({ block: "center" }));
    }, [open, value]);
    return (
        <div className="relative" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
            <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)} className="flex h-12 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-4 text-left text-sm font-medium text-slate-900 outline-none transition hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100">
                <span>{selected?.label || placeholder}</span>
                <ChevronRight size={16} className={`text-blue-600 transition ${open ? "rotate-90" : ""}`} />
            </button>
            {open && (
                <div style={menuStyle || undefined} className="fixed z-[120] max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/20">
                    {searchable && <input value={search} onChange={(event) => setSearch(event.target.value)} onMouseDown={(event) => event.stopPropagation()} placeholder="Search..." className="mb-2 h-10 w-full rounded-xl border border-blue-100 px-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />}
                    {visibleOptions.map((option) => {
                        const active = String(option.value) === String(value);
                        return (
                            <button ref={active ? selectedOptionRef : null} key={String(option.value)} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value); setSearch(""); setOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}>
                                {option.label}
                                {active && <span className="h-2 w-2 rounded-full bg-white" />}
                            </button>
                        );
                    })}
                    {!visibleOptions.length && <p className="px-3 py-2 text-sm font-medium text-slate-500">No results</p>}
                </div>
            )}
        </div>
    );
}

function ManualActionModal({ action, value, setValue, onClose, onConfirm, busy }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-950">{actionLabels[action]}</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 hover:bg-slate-50"><X size={17} /></button>
                </div>
                <div className="mt-4"><Field label="Manual time"><ThemedSelect value={value} onChange={setValue} options={timeOptionItems} /></Field></div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                    <button type="button" disabled={busy} onClick={onConfirm} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save activity"}</button>
                </div>
            </div>
        </div>
    );
}

function ConfirmCheckoutModal({ entry, now, expectedDay, onClose, onConfirm, busy }) {
    const events = withPendingCheckout(buildTimelineEvents([entry], now), entry);
    const worked = liveWorkedMinutes(entry, now);
    const breaks = (entry.breaks || []).reduce((total, item) => {
        const start = parseApiDate(item.start_at);
        const end = item.end_at ? parseApiDate(item.end_at) : now;
        return total + Math.max(Math.floor((end - start) / 60000), 0);
    }, 0);
    const gross = entry?.check_in_at ? Math.max(Math.floor((now - parseApiDate(entry.check_in_at)) / 60000), 0) : 0;
    const overtime = Math.max(worked - expectedDay, 0);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <h2 className="text-lg font-semibold text-slate-950">Check out?</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Started at {formatClock(entry?.check_in_at)}. Review the day before closing it.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-blue-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Worked</p><p className="mt-1 text-lg font-semibold text-blue-600">{formatMinutes(worked)}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Break</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(breaks)}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Day span</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(gross)}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Extra time</p><p className="mt-1 text-lg font-semibold text-slate-950">{overtime ? `+${formatMinutes(overtime)}` : "-"}</p></div>
                </div>
                <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-blue-100 p-4">
                    <p className="text-xs font-semibold text-blue-600">Today's timeline</p>
                    <div className="mt-4"><TimelineList events={events} activeEntry={entry} activeBreak={entry?.breaks?.find((item) => !item.end_at)} /></div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                    <button type="button" disabled={busy} onClick={onConfirm} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Check out"}</button>
                </div>
            </div>
        </div>
    );
}

function BreakConfirmModal({ action, activeBreak, onClose, onConfirm, busy }) {
    const isStart = action === "break-start";
    const now = new Date();
    const breakStarted = activeBreak?.start_at ? parseApiDate(activeBreak.start_at) : null;
    const subtitle = now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-950">{isStart ? "Start Break" : "End Break"}</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 hover:bg-slate-50"><X size={17} /></button>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-2xl font-semibold text-slate-950">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
                    <div className="mx-auto mt-7 grid h-20 w-20 place-items-center rounded-full bg-blue-50 text-blue-600">
                        <Coffee size={34} />
                    </div>
                    <h3 className="mt-6 text-base font-semibold text-slate-950">{isStart ? "Start break now?" : "End break now?"}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        {isStart ? "Your worked timer will pause while break is active." : breakStarted ? `Break started at ${formatClock(activeBreak.start_at)}.` : "Your worked timer will resume after this."}
                    </p>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                    <button type="button" disabled={busy} onClick={onConfirm} className="h-12 rounded-2xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Saving..." : isStart ? "Start Break" : "End Break"}</button>
                    <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-blue-100 text-sm font-semibold text-slate-700 hover:bg-blue-50">Cancel</button>
                </div>
            </div>
        </div>
    );
}

function TimesheetPreviewModal({ title, subtitle, events, rows = [], note, onClose, onConfirm, busy, confirmLabel = "Submit" }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <div className="flex items-start justify-between gap-4 border-b border-blue-100 pb-4">
                    <div>
                        <p className="text-xs font-semibold text-blue-600">Review before submitting</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
                        {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-slate-500 hover:bg-slate-50"><X size={17} /></button>
                </div>
                <div className="mt-5 rounded-2xl border border-blue-100 p-4">
                    <p className="mb-4 text-sm font-semibold text-slate-950">Timeline preview</p>
                    <TimelineList events={events} orientation="horizontal" />
                </div>
                {rows.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100">
                        {rows.map((row) => (
                            <div key={row.label} className="grid grid-cols-[minmax(120px,0.8fr)_1fr] items-center gap-4 border-b border-blue-50 px-4 py-3 last:border-b-0">
                                <p className="text-sm font-medium text-slate-500">{row.label}</p>
                                <p className="text-sm font-semibold text-slate-950">{row.value}</p>
                            </div>
                        ))}
                    </div>
                )}
                {note && <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{note}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Back</button>
                    <button type="button" disabled={busy} onClick={onConfirm} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting..." : confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

export default function AttendancePage({ initialTab = "overview", correctionOnly = false }) {
    const { user } = useAuth();
    const { downloadsAllowed } = useBillingEntitlements(true);
    const profile = resolveWorkspaceProfile(user?.company || {});
    const branchLabel = labelFor(user?.company, "branch", "Branch");
    const departmentLabel = labelFor(user?.company, "department", "Department");
    const schedulingEnabled = moduleEnabled(user?.company, "scheduling");
    const queryClient = useQueryClient();
    const canViewTeam = hasPermission(user, "attendance.view_team");
    const canApprove = hasPermission(user, "attendance.approve");
    const canLock = hasPermission(user, "attendance.lock");
    const canResetDate = hasPermission(user, "attendance.manual_entry");
    const tabs = ["overview", "timesheet", ...(canViewTeam ? ["team"] : [])];
    const [activeTab, setActiveTab] = useState(initialTab);
    const [monthAnchor, setMonthAnchor] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(todayInputValue());
    const [manualForm, setManualForm] = useState({ check_in: "", check_out: "", break_minutes: "", reason: "" });
    const [manualAction, setManualAction] = useState(null);
    const [manualActionTime, setManualActionTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [correctionDraft, setCorrectionDraft] = useState(null);
    const [manualPreview, setManualPreview] = useState(null);
    const [correctionPreview, setCorrectionPreview] = useState(null);
    const [activeCorrection, setActiveCorrection] = useState(null);
    const [correctionStatusFilter, setCorrectionStatusFilter] = useState("pending");
    const [correctionDecisionNote, setCorrectionDecisionNote] = useState("");
    const [correctionSearch, setCorrectionSearch] = useState("");
    const [correctionDate, setCorrectionDate] = useState("");
    const [correctionPage, setCorrectionPage] = useState(1);
    const [pendingCorrectionDecision, setPendingCorrectionDecision] = useState(null);
    const [confirmCheckout, setConfirmCheckout] = useState(false);
    const [confirmBreakAction, setConfirmBreakAction] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const [optimisticEntry, setOptimisticEntry] = useState(null);
    const [expandedSummaryDate, setExpandedSummaryDate] = useState(null);
    const [summaryPeriod, setSummaryPeriod] = useState("week");
    const [now, setNow] = useState(() => new Date());
    const correctionColumnSizing = useResizableColumns(correctionColumns, "attendance-correction-table-widths-v3");
    const correctionGridTemplate = columnTemplate(correctionColumns, correctionColumnSizing.widths);
    const isTodaySelected = selectedDate === todayInputValue();
    const monthRange = getMonthRange(monthAnchor);
    const weekRange = getWeekRange(selectedDate);
    const calendarDays = buildCalendarDays(monthAnchor);

    const today = useTodayAttendanceQuery();
    const openAttendance = useOpenAttendanceQuery();
    const monthSheet = useMyTimesheetQuery(monthRange);
    const whoIsIn = useWhoIsInQuery({}, canViewTeam);
    const policy = useAttendancePolicyQuery(true);
    const holidays = useHolidaysQuery(true);
    const locks = useAttendanceLocksQuery(canLock);
    const pendingCorrections = usePendingAttendanceCorrectionsQuery(canApprove);
    const myCorrections = useMyAttendanceCorrectionsQuery(true);
    const employees = useEmployeesQuery(canViewTeam || canApprove);
    const checkIn = useCheckInMutation();
    const checkOut = useCheckOutMutation();
    const startBreak = useStartBreakMutation();
    const endBreak = useEndBreakMutation();
    const createSelfEntry = useCreateSelfManualEntryMutation();
    const requestCorrection = useRequestAttendanceCorrectionMutation();
    const resetDate = useResetMyAttendanceDateMutation();
    const reviewCorrection = useReviewAttendanceCorrectionMutation();
    const bulkReviewCorrection = useBulkReviewAttendanceCorrectionsMutation();

    const todayEntries = today.data?.data || [];
    const monthRows = monthSheet.data?.data || [];
    const rowsByDate = useMemo(() => monthRows.reduce((map, row) => ({ ...map, [row.date]: [...(map[row.date] || []), row] }), {}), [monthRows]);
    const todayEntryRows = todayEntries.length ? todayEntries : rowsByDate[todayInputValue()] || [];
    const selectedRows = rowsByDate[selectedDate] || [];
    const isFutureSelected = selectedDate > todayInputValue();
    const selectedEntryIds = useMemo(() => new Set(selectedRows.map((entry) => String(entry.id))), [selectedRows]);
    const selectedCorrections = useMemo(() => (myCorrections.data?.data || []).filter((item) => selectedEntryIds.has(String(item.attendance_entry_id))), [myCorrections.data, selectedEntryIds]);
    const pendingSelectedCorrection = selectedCorrections.find((item) => item.status === "pending");
    const selectedClosedEntry = closedEntryForActions(selectedRows);
    const dailyTotals = sumRowsLive(selectedRows, now);
    const dailySpan = totalSpanMinutes(selectedRows, now);
    const expectedDay = resolveExpectedMinutes(user, policy.data?.data, "day");
    const holidayMap = useMemo(() => buildHolidayMap(holidays.data?.data || [], holidayStateForUser(user, policy.data?.data)), [holidays.data?.data, policy.data?.data, user]);
    const employeeMap = useMemo(() => Object.fromEntries((employees.data?.data || []).map((employee) => [employee.id, employee])), [employees.data]);
    const activeEntry = optimisticEntry || openAttendance.data?.data || todayEntryRows.find((entry) => entry.status === "open");
    const activeBreak = activeEntry?.breaks?.find((item) => !item.end_at);
    const closedTodayEntry = closedEntryForActions(todayEntryRows);
    const pendingTodayCorrection = closedTodayEntry
        ? (myCorrections.data?.data || []).find((item) => String(item.attendance_entry_id) === String(closedTodayEntry.id) && item.status === "pending")
        : null;
    const todayCorrections = closedTodayEntry
        ? (myCorrections.data?.data || []).filter((item) => String(item.attendance_entry_id) === String(closedTodayEntry.id))
        : [];
    const overviewEntries = useMemo(() => {
        if (!activeEntry) return todayEntryRows;
        return todayEntryRows.some((entry) => entry.id === activeEntry.id)
            ? todayEntryRows
            : [...todayEntryRows, activeEntry];
    }, [todayEntryRows, activeEntry]);
    const todayTotals = sumRowsLive(overviewEntries, now);
    const todaySpan = totalSpanMinutes(overviewEntries, now);
    const todayWorkedSeconds = overviewEntries.reduce((total, entry) => total + liveWorkedSeconds(entry, now), 0);
    const todayBreakSeconds = liveBreakSeconds(overviewEntries, now);
    const timelineEvents = useMemo(() => withPendingCheckout(buildTimelineEvents(overviewEntries, now), activeEntry), [overviewEntries, now, activeEntry]);
    const selectedTimelineEvents = useMemo(() => buildTimelineEvents(selectedRows, now), [selectedRows, now]);
    const canSubmitManual = Boolean(manualForm.check_in && manualForm.check_out && manualForm.reason.trim()) && !isFutureSelected && !createSelfEntry.isPending;
    const primaryAction = !activeEntry ? "check-in" : activeBreak ? "break-end" : "check-out";
    const dayClosed = !activeEntry && Boolean(closedTodayEntry);
    const getDateStatus = (key) => {
        const rows = rowsByDate[key] || [];
        const day = new Date(`${key}T12:00:00`);
        if (rows.length) return "submitted";
        if (holidayMap[key]) return "holiday";
        if (![0, 6].includes(day.getDay()) && key <= todayInputValue()) return "missing";
        return null;
    };
    const dateStatuses = useMemo(() => Object.fromEntries(calendarDays.map((day) => {
        const key = toDateKey(day);
        return [key, getDateStatus(key)];
    })), [calendarDays, holidayMap, locks.data, rowsByDate]);
    const summaryRange = summaryPeriod === "month" ? monthRange : weekRange;
    const summaryEffectiveTo = summaryRange.to > todayInputValue() ? todayInputValue() : summaryRange.to;
    const summaryDayCount = summaryPeriod === "month" ? new Date(`${monthRange.to}T12:00:00`).getDate() : 7;
    const summaryDays = useMemo(() => buildRangeDays(summaryRange.from, summaryDayCount).filter((day) => toDateKey(day) <= todayInputValue()), [summaryDayCount, summaryRange.from]);
    const summaryRows = useMemo(() => {
        return summaryDays.reduce((items, day) => {
            const key = toDateKey(day);
            const rows = rowsByDate[key] || [];
            const totals = sumRowsLive(rows, now);
            const expected = [0, 6].includes(day.getDay()) || holidayMap[key] ? 0 : expectedDay;
            const previousBalance = items.length ? items[items.length - 1].balance : 0;
            const balance = previousBalance + totals.worked - expected;
            const status = getDateStatus(key) || "missing";
            return [...items, { key, day, rows, totals, expected, balance, status, events: buildTimelineEvents(rows, now) }];
        }, []);
    }, [expectedDay, holidayMap, locks.data, now, rowsByDate, summaryDays]);
    const summaryTotals = useMemo(() => sumRowsLive(summaryRows.flatMap((row) => row.rows), now), [now, summaryRows]);
    const summaryExpected = summaryRange.from <= summaryEffectiveTo ? summaryRows.reduce((total, row) => total + row.expected, 0) : 0;
    const monthCompliance = useMemo(() => {
        const daysInMonth = new Date(`${monthRange.to}T12:00:00`).getDate();
        return buildRangeDays(monthRange.from, daysInMonth).reduce((acc, day) => {
            const status = getDateStatus(toDateKey(day));
            if (status) acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
    }, [holidayMap, locks.data, monthRange.from, monthRange.to, rowsByDate]);
    const correctionItems = useMemo(() => groupCorrectionRecords(pendingCorrections.data?.data || []), [pendingCorrections.data]);
    const correctionStats = useMemo(() => ({
        pending: correctionItems.filter((item) => item.status === "pending").length,
        approved: correctionItems.filter((item) => item.status === "approved").length,
        rejected: correctionItems.filter((item) => item.status === "rejected").length,
        all: correctionItems.length,
    }), [correctionItems]);
    const filteredCorrectionItems = useMemo(() => {
        const query = correctionSearch.trim().toLowerCase();
        return correctionItems.filter((item) => {
            if (correctionStatusFilter !== "all" && item.status !== correctionStatusFilter) return false;
            if (correctionDate && item.entry_date !== correctionDate) return false;
            if (!query) return true;
            const employee = employeeMap[item.requested_by_user_id];
            return [
                employeeName(employee, ""),
                employee?.employee_code,
                item.employee_code,
                item.reason,
                item.entry_date ? formatDate(item.entry_date) : "",
                correctionTypeLabel(item),
                correctionRequestedChange(item),
                item.status,
            ].filter(Boolean).join(" ").toLowerCase().includes(query);
        });
    }, [correctionDate, correctionItems, correctionSearch, correctionStatusFilter, employeeMap]);
    const activeCorrectionEmployee = activeCorrection ? employeeMap[activeCorrection.requested_by_user_id] : null;
    const correctionPageSize = 8;
    const correctionTotalPages = Math.max(Math.ceil(filteredCorrectionItems.length / correctionPageSize), 1);
    const correctionPageItems = filteredCorrectionItems.slice((correctionPage - 1) * correctionPageSize, correctionPage * correctionPageSize);

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(id);
    }, []);
    useEffect(() => {
        setCorrectionPage(1);
    }, [correctionDate, correctionSearch, correctionStatusFilter]);
    useEffect(() => {
        if (correctionPage > correctionTotalPages) setCorrectionPage(correctionTotalPages);
    }, [correctionPage, correctionTotalPages]);
    useEffect(() => {
        if (!optimisticEntry) return;
        const serverEntry = openAttendance.data?.data || todayEntries.find((entry) => entry.status === "open");
        if (!serverEntry) return;
        const optimisticOpenBreak = optimisticEntry.breaks?.some((item) => !item.end_at);
        const serverOpenBreak = serverEntry.breaks?.some((item) => !item.end_at);
        const sameLiveState = optimisticEntry.id === "optimistic-check-in"
            ? serverEntry.id !== "optimistic-check-in"
            : optimisticOpenBreak === serverOpenBreak;
        if (sameLiveState) setOptimisticEntry(null);
    }, [openAttendance.data, optimisticEntry, todayEntries]);
    useEffect(() => {
        const closeMenu = () => setMobileActionsOpen(false);
        if (!mobileActionsOpen) return undefined;
        window.addEventListener("click", closeMenu);
        return () => window.removeEventListener("click", closeMenu);
    }, [mobileActionsOpen]);

    const runMutation = (mutation, payload, success, options = {}) => mutation.mutate(payload, {
        onSuccess: (response) => {
            options.onSuccess?.(response);
            refreshAttendance(queryClient);
            toast.success(success);
        },
        onError: (error) => {
            options.onError?.(error);
            toast.error(error.message || "Attendance action failed");
        },
    });
    const actionMutation = {
        "check-in": checkIn,
        "check-out": checkOut,
        "break-start": startBreak,
        "break-end": endBreak,
    };
    const buildActionPayload = (action, manualTime) => {
        if (!manualTime) return action === "break-start" ? { source: "web" } : action === "break-end" ? {} : { source: "web" };
        const key = action === "check-in" ? "check_in_at" : action === "check-out" ? "check_out_at" : action === "break-start" ? "start_at" : "end_at";
        return { [key]: toLocalInput(todayInputValue(), manualTime), ...(action === "break-start" ? { source: "web" } : {}) };
    };
    const recordNow = () => {
        if (primaryAction === "check-out") {
            setConfirmCheckout(true);
            return;
        }
        runMutation(actionMutation[primaryAction], buildActionPayload(primaryAction), `${actionLabels[primaryAction]} recorded`);
    };
    const recordManual = () => {
        runMutation(actionMutation[manualAction], buildActionPayload(manualAction, manualActionTime), `${actionLabels[manualAction]} recorded`);
        setManualAction(null);
    };
    const submitManual = (event) => {
        event.preventDefault();
        if (isFutureSelected) return toast.error("Future dates cannot be submitted");
        if (!manualForm.check_in || !manualForm.check_out || !manualForm.reason.trim()) return toast.error("Add check-in, check-out, and a reason before submitting");
        if (manualForm.check_out <= manualForm.check_in) return toast.error("Check-out time must be after check-in time");
        if (Number(manualForm.break_minutes || 0) >= minutesBetweenTimes(manualForm.check_in, manualForm.check_out)) return toast.error("Break time must be less than the total attendance span");
        const span = minutesBetweenTimes(manualForm.check_in, manualForm.check_out);
        const breakMinutes = Number(manualForm.break_minutes || 0);
        setManualPreview({
            payload: { check_in_at: toLocalInput(selectedDate, manualForm.check_in), check_out_at: toLocalInput(selectedDate, manualForm.check_out), reason: manualForm.reason.trim(), break_minutes: breakMinutes },
            date: selectedDate,
            events: previewEventsForTimes(selectedDate, manualForm.check_in, manualForm.check_out, breakMinutes),
            rows: [
                { label: "Worked", value: formatMinutes(span - breakMinutes) },
                { label: "Break", value: formatMinutes(breakMinutes) },
                { label: "Day span", value: formatMinutes(span) },
            ],
        });
    };
    const confirmManualPreview = () => {
        if (!manualPreview) return;
        createSelfEntry.mutate(manualPreview.payload, {
            onSuccess: () => {
                setManualPreview(null);
                setManualForm({ check_in: "", check_out: "", break_minutes: "", reason: "" });
                refreshAttendance(queryClient);
                toast.success("Time recorded");
            },
            onError: (error) => toast.error(error.message || "Unable to submit time"),
        });
    };
    const openManualEntry = () => {
        setManualAction(primaryAction);
        setManualActionTime(new Date().toTimeString().slice(0, 5));
        setMobileActionsOpen(false);
    };
    const openCorrectionDraft = (entry, dateKey) => {
        const checkInParts = splitDateTimeValue(entry.check_in_at);
        const checkOutParts = splitDateTimeValue(entry.check_out_at);
        setCorrectionDraft({
            attendance_entry_id: entry.id,
            selected_date: dateKey,
            reason: "",
            correction_type: "",
            check_in_time: checkInParts.time,
            check_out_time: checkOutParts.time,
            break_minutes: Number(entry.break_minutes || 0),
            original_check_in_time: checkInParts.time,
            original_check_out_time: checkOutParts.time,
            original_break_minutes: Number(entry.break_minutes || 0),
        });
    };
    const applyOptimisticBreakStart = () => {
        setConfirmBreakAction(null);
        const startedAt = new Date().toISOString();
        setNow(new Date());
        setOptimisticEntry({
            ...activeEntry,
            breaks: [...(activeEntry?.breaks || []), { id: `optimistic-break-${startedAt}`, start_at: startedAt, end_at: null }],
        });
        runMutation(startBreak, { source: "web" }, "Break started", {
            onError: () => setOptimisticEntry(null),
        });
    };
    const applyOptimisticBreakEnd = () => {
        setConfirmBreakAction(null);
        const endedAt = new Date().toISOString();
        setNow(new Date());
        setOptimisticEntry({
            ...activeEntry,
            breaks: (activeEntry?.breaks || []).map((item) => item.end_at ? item : { ...item, end_at: endedAt }),
        });
        runMutation(endBreak, {}, "Break ended", {
            onError: () => setOptimisticEntry(null),
        });
    };
    const correctionChanged = correctionDraft ? (
        (correctionDraft.check_in_time || correctionDraft.original_check_in_time) !== correctionDraft.original_check_in_time
        || (correctionDraft.check_out_time || correctionDraft.original_check_out_time) !== correctionDraft.original_check_out_time
        || Number(correctionDraft.break_minutes ?? correctionDraft.original_break_minutes) !== Number(correctionDraft.original_break_minutes)
    ) : false;
    const canSubmitCorrection = Boolean(correctionDraft?.correction_type && correctionDraft?.reason?.trim() && correctionChanged && !requestCorrection.isPending);
    const confirmCorrectionPreview = () => {
        if (!correctionPreview) return;
        requestCorrection.mutate(correctionPreview.payload, {
            onSuccess: () => {
                setCorrectionPreview(null);
                setCorrectionDraft(null);
                refreshAttendance(queryClient);
                toast.success("Correction requested");
            },
            onError: (error) => toast.error(error.message || "Unable to request correction"),
        });
    };
    const decideCorrection = (item, status) => {
        if (!item) return;
        const ids = correctionItemsForRecord(item).map((part) => part.id);
        const mutation = ids.length > 1 ? bulkReviewCorrection : reviewCorrection;
        const payload = ids.length > 1
            ? { ids, status, decision_reason: correctionDecisionNote.trim() || undefined }
            : { correction_request_id: ids[0], status, decision_reason: correctionDecisionNote.trim() || undefined };
        mutation.mutate(payload, {
            onSuccess: () => {
                refreshAttendance(queryClient);
                setActiveCorrection(null);
                setPendingCorrectionDecision(null);
                setCorrectionDecisionNote("");
                toast.success(status === "approved" ? "Correction approved" : "Correction rejected");
            },
            onError: (error) => toast.error(error.message || "Unable to review correction"),
        });
    };

    return (
        <div className="space-y-5">
            <PageHeading
                eyebrow={correctionOnly ? "Attendance" : "Attendance"}
                title={correctionOnly ? "Correction requests" : schedulingEnabled ? "Shift attendance workspace" : "Time workspace"}
                text={correctionOnly ? "Review employee attendance correction requests from one dedicated queue." : `Record activity, submit timesheets, and review ${profile.operating_model.replaceAll("_", " ")} attendance without crowding one screen.`}
            />
            {!correctionOnly && (
                <nav className="overflow-x-auto rounded-[1.3rem] border border-blue-100 bg-white/85 p-2 shadow-lg shadow-blue-500/5">
                    <div className="flex min-w-max gap-2">
                        {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}>{tab}</button>)}
                    </div>
                </nav>
            )}

            {correctionOnly && !canApprove && <EmptyState title="Access required" text="You need attendance approval permission to review correction requests." />}

            {activeTab === "overview" && isTodaySelected && <>
                <section className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                    <div className="min-w-0 overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white/85 shadow-lg shadow-blue-500/5">
                        <div className="flex flex-col gap-3 border-b border-blue-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-slate-950">My attendance</h2>
                            <span className="w-fit rounded-2xl border border-blue-100 px-3 py-2 text-sm font-semibold text-slate-600">{formatDate(todayInputValue())}</span>
                        </div>
                        <div className="grid gap-4 border-b border-blue-100 px-5 py-5 lg:grid-cols-[minmax(18rem,1.3fr)_repeat(3,minmax(0,0.7fr))]">
                            <div className="rounded-3xl bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold text-slate-500">Current status</p>
                                <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-950">
                                    <span className={`h-2.5 w-2.5 rounded-full ${activeEntry ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    {activeEntry ? (activeBreak ? "On break" : "Checked in") : "Checked out"}
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-500">{activeEntry ? `Started ${formatClock(activeEntry.check_in_at)} · ${formatLiveDuration(liveWorkedSeconds(activeEntry, now))} worked` : todayTotals.worked ? `Today's total ${formatMinutes(todayTotals.worked)} worked` : "No active session"}</p>
                            </div>
                            <div className="rounded-3xl border border-blue-100 px-4 py-4">
                                <p className="text-xs font-semibold text-slate-500">Worked</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">{activeEntry ? formatLiveDuration(todayWorkedSeconds) : formatMinutes(todayTotals.worked)}</p>
                            </div>
                            <div className="rounded-3xl border border-blue-100 px-4 py-4">
                                <p className="text-xs font-semibold text-slate-500">Break</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">{activeEntry ? formatLiveDuration(todayBreakSeconds) : formatMinutes(todayTotals.breaks)}</p>
                            </div>
                            <div className="rounded-3xl border border-blue-100 px-4 py-4">
                                <p className="text-xs font-semibold text-slate-500">Day span</p>
                                <p className="mt-2 text-xl font-semibold text-slate-950">{formatMinutes(todaySpan)}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 px-5 py-4">
                            {!activeEntry && !dayClosed && <button type="button" onClick={() => {
                                const startedAt = new Date().toISOString();
                                setNow(new Date());
                                setOptimisticEntry({ id: "optimistic-check-in", check_in_at: startedAt, check_out_at: null, breaks: [], status: "open", date: todayInputValue(), source: "web" });
                                runMutation(checkIn, { source: "web" }, "Check in recorded", {
                                    onSuccess: (response) => setOptimisticEntry(response?.data || null),
                                    onError: () => setOptimisticEntry(null),
                                });
                            }} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><LogIn size={16} />Check in</button>}
                            {dayClosed && <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Day closed</span>}
                            {activeBreak && <button type="button" onClick={() => setConfirmBreakAction("break-end")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><LogIn size={16} />End break</button>}
                            {activeEntry && !activeBreak && <span className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Checked in</span>}
                            <div className="hidden flex-wrap items-center gap-3 sm:flex">
                                {activeEntry && !activeBreak && <button type="button" onClick={() => setConfirmBreakAction("break-start")} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"><Coffee size={16} />Start break</button>}
                                {activeEntry && !activeBreak && <button type="button" onClick={recordNow} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"><LogOut size={16} />Check out</button>}
                                {!dayClosed && <button type="button" onClick={openManualEntry} className="h-12 rounded-2xl border border-blue-100 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-50">Add manual entry</button>}
                                {dayClosed && closedTodayEntry && <button type="button" disabled={Boolean(pendingTodayCorrection)} onClick={() => openCorrectionDraft(closedTodayEntry, todayInputValue())} className="h-12 rounded-2xl border border-blue-100 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{pendingTodayCorrection ? "Correction pending" : "Request correction"}</button>}
                                {dayClosed && canResetDate && <button type="button" onClick={() => { setSelectedDate(todayInputValue()); setConfirmReset(true); }} className="h-12 rounded-2xl border border-red-100 px-4 text-sm font-semibold text-red-600 hover:bg-red-50">Reset date</button>}
                            </div>
                            <div className="relative sm:hidden" onClick={(event) => event.stopPropagation()}>
                                <button type="button" onClick={() => setMobileActionsOpen((value) => !value)} className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 text-slate-600 hover:bg-blue-50" aria-label="More actions">
                                    <MoreHorizontal size={20} />
                                </button>
                                {mobileActionsOpen && (
                                    <div className="absolute right-0 top-14 z-20 w-52 rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/15">
                                        {activeBreak && <button type="button" onClick={() => { setMobileActionsOpen(false); setConfirmBreakAction("break-end"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50"><LogIn size={16} />End break</button>}
                                        {activeEntry && !activeBreak && <button type="button" onClick={() => { setMobileActionsOpen(false); setConfirmBreakAction("break-start"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><Coffee size={16} />Start break</button>}
                                        {activeEntry && !activeBreak && <button type="button" onClick={() => { setMobileActionsOpen(false); recordNow(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16} />Check out</button>}
                                        {!dayClosed && <button type="button" onClick={openManualEntry} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50">Add manual entry</button>}
                                        {dayClosed && closedTodayEntry && <button type="button" disabled={Boolean(pendingTodayCorrection)} onClick={() => { setMobileActionsOpen(false); openCorrectionDraft(closedTodayEntry, todayInputValue()); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{pendingTodayCorrection ? "Correction pending" : "Request correction"}</button>}
                                        {dayClosed && canResetDate && <button type="button" onClick={() => { setMobileActionsOpen(false); setSelectedDate(todayInputValue()); setConfirmReset(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Reset date</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-5">
                            <h3 className="text-base font-semibold text-slate-950">Today's timeline</h3>
                            <div className="mt-4 hidden max-w-full overflow-x-auto pb-2 lg:block"><TimelineList events={timelineEvents} orientation="horizontal" activeEntry={activeEntry} activeBreak={activeBreak} onEventClick={() => { setSelectedDate(todayInputValue()); setActiveTab("overview"); }} /></div>
                            <div className="mt-4 max-h-80 overflow-y-auto pr-2 lg:hidden"><TimelineList events={timelineEvents} activeEntry={activeEntry} activeBreak={activeBreak} onEventClick={() => { setSelectedDate(todayInputValue()); setActiveTab("overview"); }} /></div>
                            <CorrectionCards items={todayCorrections} />
                        </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-blue-600" /><h2 className="text-lg font-semibold text-slate-950">Calendar</h2></div><div className="flex gap-1"><button onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-blue-50"><ChevronLeft size={17} /></button><button onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-blue-50"><ChevronRight size={17} /></button></div></div>
                        <p className="mt-2 text-sm font-semibold text-slate-600">{monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div>
                        <div className="mt-2 grid grid-cols-7 gap-1">{calendarDays.map((day) => { const key = toDateKey(day); const status = dateStatuses[key]; const outside = day.getMonth() !== monthAnchor.getMonth(); return <button key={key} onClick={() => setSelectedDate(key)} className={`relative grid aspect-square place-items-center rounded-2xl text-sm font-semibold ${key === selectedDate ? "bg-blue-600 text-white" : outside ? "text-slate-300" : "text-slate-700 hover:bg-blue-50"}`}>{day.getDate()}{status && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${key === selectedDate ? "bg-white" : statusDot[status]}`} />}</button>; })}</div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-500">Month status</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-2">
                                {calendarSummaryItems.map(([key, label]) => (
                                    <span key={key} className="inline-flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                        <span className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${statusDot[key]}`} />{label}</span>
                                        <b className="font-semibold text-slate-900">{monthCompliance[key] || 0}</b>
                                    </span>
                                ))}
                            </div>
                            {Boolean(monthCompliance.holiday) && (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                    <i className={`h-2 w-2 rounded-full ${statusDot.holiday}`} />
                                    Public holiday
                                    <b className="ml-auto font-semibold text-slate-900">{monthCompliance.holiday}</b>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </>}

            {activeTab === "overview" && !isTodaySelected && <>
            <section className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                <div className="min-w-0 rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                    <div className="flex flex-col gap-4 border-b border-blue-100 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-blue-600">Selected day</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{formatDate(selectedDate)}</h2></div><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{statusLabel[dateStatuses[selectedDate] || "future"]}</span></div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Worked</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(dailyTotals.worked)}</p></div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Break</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(dailyTotals.breaks)}</p></div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Day span</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(dailySpan)}</p></div>
                    </div>
                    {selectedRows.length > 0 ? (
                        <div className="mt-5 rounded-3xl border border-blue-100 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-blue-600">Recorded day</p>
                                    <p className="mt-1 text-sm font-medium text-slate-500">Connected events for the selected date.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedClosedEntry && (
                                        <button
                                            type="button"
                                            disabled={Boolean(pendingSelectedCorrection)}
                                            onClick={() => openCorrectionDraft(selectedClosedEntry, selectedDate)}
                                            className="h-10 rounded-2xl border border-blue-100 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {pendingSelectedCorrection ? "Correction pending" : "Request correction"}
                                        </button>
                                    )}
                                    {canResetDate && <button type="button" onClick={() => setConfirmReset(true)} className="h-10 rounded-2xl border border-red-100 px-4 text-sm font-semibold text-red-600 hover:bg-red-50">Reset date</button>}
                                </div>
                            </div>
                            <div className="mt-5 hidden max-w-full overflow-x-auto pb-2 lg:block">
                                <TimelineList events={selectedTimelineEvents} orientation="horizontal" />
                            </div>
                            <div className="mt-5 max-h-80 overflow-y-auto pr-2 lg:hidden">
                                <TimelineList events={selectedTimelineEvents} />
                            </div>
                            <CorrectionCards items={selectedCorrections} />
                        </div>
                    ) : isFutureSelected ? (
                        <div className="mt-6 rounded-3xl border border-blue-100 bg-slate-50 p-5">
                            <p className="text-xs font-semibold text-blue-600">Future date</p>
                            <p className="mt-1 text-sm font-medium text-slate-500">Time can be recorded only after the workday starts. Future dates stay read-only.</p>
                        </div>
                    ) : (
                        <div className="mt-6 border-t border-blue-100 pt-5">
                            <p className="text-xs font-semibold text-blue-600">Add time for this day</p>
                            <p className="mt-1 text-sm font-medium text-slate-500">No time is recorded for this date. Submit remote or missed time for review.</p>
                            <form onSubmit={submitManual} className="mt-5 grid gap-4 sm:grid-cols-2">
                                <Field label="Check in"><ThemedSelect value={manualForm.check_in} onChange={(value) => setManualForm((v) => ({ ...v, check_in: value }))} options={timeOptionItems} placeholder="Select check-in" /></Field>
                                <Field label="Check out"><ThemedSelect value={manualForm.check_out} onChange={(value) => setManualForm((v) => ({ ...v, check_out: value }))} options={timeOptionItems} placeholder="Select check-out" /></Field>
                                <Field label="Break time"><ThemedSelect value={manualForm.break_minutes} onChange={(value) => setManualForm((v) => ({ ...v, break_minutes: value }))} options={breakOptionItems} placeholder="Optional break" /></Field>
                                <Field label="Reason"><input value={manualForm.reason} onChange={(e) => setManualForm((v) => ({ ...v, reason: e.target.value }))} className={inputClassName} placeholder="Why is this time being submitted?" /></Field>
                                <button disabled={!canSubmitManual} className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"><Save size={17} />{createSelfEntry.isPending ? "Submitting..." : "Submit time"}</button>
                            </form>
                        </div>
                    )}
                </div>
                <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-blue-600" /><h2 className="text-lg font-semibold text-slate-950">Calendar</h2></div><div className="flex gap-1"><button onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-blue-50"><ChevronLeft size={17} /></button><button onClick={() => setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-2xl hover:bg-blue-50"><ChevronRight size={17} /></button></div></div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">{monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div>
                    <div className="mt-2 grid grid-cols-7 gap-1">{calendarDays.map((day) => { const key = toDateKey(day); const status = dateStatuses[key]; const outside = day.getMonth() !== monthAnchor.getMonth(); return <button key={key} onClick={() => setSelectedDate(key)} className={`relative grid aspect-square place-items-center rounded-2xl text-sm font-semibold ${key === selectedDate ? "bg-blue-600 text-white" : outside ? "text-slate-300" : "text-slate-700 hover:bg-blue-50"}`}>{day.getDate()}{status && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${key === selectedDate ? "bg-white" : statusDot[status]}`} />}</button>; })}</div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">Month status</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-2">
                            {calendarSummaryItems.map(([key, label]) => (
                                <span key={key} className="inline-flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                    <span className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${statusDot[key]}`} />{label}</span>
                                    <b className="font-semibold text-slate-900">{monthCompliance[key] || 0}</b>
                                </span>
                            ))}
                        </div>
                        {Boolean(monthCompliance.holiday) && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                <i className={`h-2 w-2 rounded-full ${statusDot.holiday}`} />
                                Public holiday
                                <b className="ml-auto font-semibold text-slate-900">{monthCompliance.holiday}</b>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            </>}

            {activeTab === "timesheet" && <section className="overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white/85 shadow-lg shadow-blue-500/5">
                <div className="flex flex-col gap-4 border-b border-blue-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-blue-600">Timesheet</p>
                        <h2 className="mt-1 text-xl font-semibold text-slate-950">{summaryPeriod === "month" ? "Monthly view" : "Weekly view"}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-2xl border border-blue-100 bg-slate-50 p-1">
                            {["week", "month"].map((period) => <button key={period} type="button" onClick={() => setSummaryPeriod(period)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${summaryPeriod === period ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20" : "text-slate-600 hover:bg-white"}`}>{period}</button>)}
                        </div>
                        <span className="rounded-2xl border border-blue-100 px-3 py-2 text-sm font-semibold text-slate-600">{formatDate(summaryRange.from)} - {formatDate(summaryEffectiveTo)}</span>
                        <button type="button" onClick={() => { if (summaryPeriod === "month") { setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1)); return; } const previous = new Date(`${selectedDate}T12:00:00`); previous.setDate(previous.getDate() - 7); setSelectedDate(toDateKey(previous)); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 hover:bg-blue-50"><ChevronLeft size={17} /></button>
                        <button type="button" onClick={() => { if (summaryPeriod === "month") { setMonthAnchor((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1)); return; } const next = new Date(`${selectedDate}T12:00:00`); next.setDate(next.getDate() + 7); setSelectedDate(toDateKey(next)); }} className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 hover:bg-blue-50"><ChevronRight size={17} /></button>
                        <button type="button" onClick={() => downloadCsv(`attendio-${summaryPeriod}-timesheet-${summaryRange.from}.csv`, [
                            ["Date", "Status", "Worked", "Break", "Time difference"],
                            ...summaryRows.map((row) => {
                                return [formatDate(row.key), statusLabel[row.status] || statusLabel.missing, formatMinutes(row.totals.worked), formatMinutes(row.totals.breaks), `${row.balance >= 0 ? "+" : "-"}${formatMinutes(Math.abs(row.balance))}`];
                            }),
                        ])} disabled={!downloadsAllowed} title={!downloadsAllowed ? "Attendance downloads are available on Standard." : undefined} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"><Download size={16} />Download</button>
                    </div>
                </div>
                <div className="grid gap-4 border-b border-blue-100 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Worked</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(summaryTotals.worked)}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Break</p><p className="mt-1 text-lg font-semibold text-slate-950">{formatMinutes(summaryTotals.breaks)}</p></div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Time difference</p><p className={`mt-1 text-lg font-semibold ${summaryTotals.worked >= summaryExpected ? "text-emerald-600" : "text-amber-700"}`}>{summaryTotals.worked >= summaryExpected ? "+" : "-"}{formatMinutes(Math.abs(summaryTotals.worked - summaryExpected))}</p></div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Status</p><p className="mt-1 text-lg font-semibold text-emerald-700">{(monthCompliance.rejected || 0) ? "Needs review" : "OK"}</p></div>
                </div>
                <div className="max-h-[34rem] overflow-auto">
                    <div className="min-w-[720px]">
                        <div className="sticky top-0 z-10 grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr_1fr_72px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
                            <span>Date</span><span>Status</span><span>Worked</span><span>Break</span><span>Difference</span><span>Actions</span>
                        </div>
                        <div className="divide-y divide-blue-100">
                            {summaryRows.map((row) => {
                                const expanded = expandedSummaryDate === row.key;
                                return (
                                    <div key={row.key}>
                                        <div className="grid grid-cols-[1fr_0.9fr_0.8fr_0.8fr_1fr_72px] items-center gap-4 px-5 py-4">
                                            <span className="font-semibold text-slate-950">{row.day.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}</span>
                                            <span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === "approved" ? "bg-emerald-50 text-emerald-700" : row.status === "submitted" || row.status === "closed" || row.status === "corrected" ? "bg-blue-50 text-blue-600" : row.status === "rejected" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{statusLabel[row.status] || statusLabel.missing}</span></span>
                                            <span className="text-sm font-medium text-slate-600">{row.totals.worked ? formatMinutes(row.totals.worked) : "-"}</span>
                                            <span className="text-sm font-medium text-slate-600">{row.totals.breaks ? formatMinutes(row.totals.breaks) : "-"}</span>
                                            <span className={`text-sm font-semibold ${row.balance >= 0 ? "text-emerald-600" : "text-amber-700"}`}>{row.balance >= 0 ? "+" : "-"}{formatMinutes(Math.abs(row.balance))}</span>
                                            <button type="button" onClick={() => setExpandedSummaryDate(expanded ? null : row.key)} disabled={!row.events.length} className="grid h-9 w-9 place-items-center rounded-2xl border border-blue-100 text-slate-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><Eye size={16} /></button>
                                        </div>
                                        {expanded && <div className="min-w-0 bg-blue-50/30 px-5 py-4">
                                            <div className="hidden max-w-full overflow-x-auto pb-2 lg:block"><TimelineList events={row.events} orientation="horizontal" /></div>
                                            <div className="max-h-80 overflow-y-auto pr-2 lg:hidden"><TimelineList events={row.events} /></div>
                                        </div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-blue-100 px-5 py-4 text-sm font-medium text-slate-500">
                    <span>Showing {summaryRows.length} elapsed {summaryPeriod === "month" ? "days" : "week days"}</span>
                    <button type="button" onClick={() => setActiveTab("overview")} className="font-semibold text-blue-600">Review selected day</button>
                </div>
            </section>}

            {activeTab === "team" && canViewTeam && <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5"><div className="flex items-center gap-2"><UsersRound size={18} className="text-blue-600" /><h2 className="text-lg font-black text-slate-950">{departmentLabel} presence</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(whoIsIn.data?.data || []).map((entry) => { const employee = employeeMap[entry.user_id]; return <div key={entry.id} className="rounded-3xl bg-slate-50 p-4"><p className="font-black text-slate-900">{employee ? `${employee.first_name} ${employee.last_name}` : entry.employee_code || "Employee"}</p><p className="mt-1 text-sm font-medium text-slate-500">{employee?.email || "Email unavailable"}</p><p className="mt-3 text-xs font-black text-blue-600">Since {formatClock(entry.check_in_at)}</p></div>; })}{!(whoIsIn.data?.data || []).length && <EmptyState title="No one checked in" text={`${branchLabel} shifts will appear here.`} />}</div></section>}

            {activeTab === "correction-request" && canApprove && <section className="space-y-5">
                <div className="overflow-x-auto border-b border-blue-100 bg-white/85">
                    <div className="flex min-w-max gap-7 px-1">
                        {[
                            ["pending", "Pending", correctionStats.pending],
                            ["approved", "Approved", correctionStats.approved],
                            ["rejected", "Rejected", correctionStats.rejected],
                            ["all", "All", correctionStats.all],
                        ].map(([key, label, count]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setCorrectionStatusFilter(key)}
                                className={`flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition ${correctionStatusFilter === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-blue-600"}`}
                            >
                                {label}
                                <span className={`rounded-full px-2 py-0.5 text-xs ${correctionStatusFilter === key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.75fr)_auto_auto]">
                    <label className="relative block">
                        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={correctionSearch}
                            onChange={(event) => setCorrectionSearch(event.target.value)}
                            placeholder="Search employee, type, reason..."
                            className="h-12 w-full rounded-xl border border-blue-100 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                    </label>
                    <label className="relative flex h-12 items-center rounded-xl border border-blue-100 bg-white px-4 text-sm font-medium text-slate-700 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                        <CalendarDays size={17} className="mr-3 shrink-0 text-slate-500" />
                        <input
                            type="date"
                            value={correctionDate}
                            onChange={(event) => setCorrectionDate(event.target.value)}
                            className="h-full min-w-0 flex-1 cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none [color-scheme:light]"
                            aria-label="Select correction request date"
                        />
                    </label>
                    <button type="button" onClick={() => setCorrectionDate(todayInputValue())} className="hidden h-12 items-center justify-center rounded-xl border border-blue-100 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-blue-50 md:flex">
                        Today
                    </button>
                    <button type="button" onClick={() => setCorrectionDate("")} disabled={!correctionDate} className="hidden h-12 items-center justify-center rounded-xl border border-blue-100 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 md:flex">
                        All dates
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-lg shadow-blue-500/5">
                    <div className="hidden overflow-x-auto pb-1 lg:block xl:overflow-visible">
                        <div className="min-w-[980px] space-y-3 p-3 xl:w-full xl:min-w-0">
                            <div className="grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500" style={{ gridTemplateColumns: correctionGridTemplate }}>
                                {correctionColumns.map((column, index) => (
                                    <span key={column.key} className="relative min-w-0 whitespace-nowrap pr-2 text-left">
                                        <span className="block truncate">{column.label}</span>
                                        {index < correctionColumns.length - 1 && (
                                            <button
                                                type="button"
                                                onMouseDown={(event) => correctionColumnSizing.startResize(event, column, correctionColumns[index + 1])}
                                                className="group absolute -right-1 top-1/2 flex h-7 w-3 -translate-y-1/2 cursor-col-resize items-center justify-center"
                                                title={`Resize ${column.label}`}
                                                aria-label={`Resize ${column.label}`}
                                            >
                                                <span className="h-5 w-px rounded-full bg-blue-200 transition group-hover:w-0.5 group-hover:bg-blue-500" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                            {correctionPageItems.map((item) => {
                                const employee = employeeMap[item.requested_by_user_id];
                                const timeZone = item.requester_timezone || timezoneForEmployee(employee);
                                return (
                                    <div key={item.id} className="overflow-visible rounded-2xl border border-blue-100 bg-white text-left shadow-sm shadow-blue-500/5">
                                        <div className="grid w-full gap-3 px-4 py-3 text-sm xl:items-center" style={{ gridTemplateColumns: correctionGridTemplate }}>
                                            <div className="flex min-w-0 items-center gap-3 text-left">
                                                <EmployeeAvatar employee={employee} />
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-950">{employeeName(employee, item.requested_by_user_id)}</p>
                                                    <p className="mt-1 truncate text-xs font-medium text-slate-500">{realValue(employee?.employee_code, item.employee_code)}</p>
                                                </div>
                                            </div>
                                            <div className="min-w-0 truncate text-left font-medium text-slate-700">{item.entry_date ? formatDate(item.entry_date) : "Attendance day"}</div>
                                            <div className="min-w-0 truncate text-left font-medium text-slate-700">{item.created_at ? `${formatDateForZone(item.created_at, timeZone)}, ${formatClockForZone(item.created_at, timeZone)}` : "Not available"}</div>
                                            <div className="min-w-0 text-left"><span className={`inline-flex max-w-full rounded-lg px-2.5 py-1 text-xs font-semibold ${correctionTypeClass(item)}`}><span className="truncate">{correctionTypeLabel(item)}</span></span></div>
                                            <div className="min-w-0 text-left"><span className={`inline-flex max-w-full rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${correctionStatusClass(item.status)}`}><span className="truncate">{item.status}</span></span></div>
                                            <div className="min-w-0 text-left"><button type="button" onClick={() => { setActiveCorrection(item); setCorrectionDecisionNote(""); }} className="h-9 rounded-lg border border-blue-100 px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50">Review</button></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-3 p-4 lg:hidden">
                        {correctionPageItems.map((item) => {
                            const employee = employeeMap[item.requested_by_user_id];
                            const timeZone = item.requester_timezone || timezoneForEmployee(employee);
                            return (
                                <div key={item.id} className="rounded-xl border border-blue-100 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <EmployeeAvatar employee={employee} />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-slate-950">{employeeName(employee, item.requested_by_user_id)}</p>
                                                <p className="mt-1 text-xs font-medium text-slate-500">{item.entry_date ? formatDate(item.entry_date) : "Attendance day"}</p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${correctionStatusClass(item.status)}`}>{item.status}</span>
                                    </div>
                                    <div className="mt-4 grid gap-2 text-sm">
                                        <div className="flex justify-between gap-3"><span className="text-slate-500">Requested</span><span className="text-right font-semibold text-slate-800">{item.created_at ? `${formatDateForZone(item.created_at, timeZone)}, ${formatClockForZone(item.created_at, timeZone)}` : "Not available"}</span></div>
                                        <div className="flex justify-between gap-3"><span className="text-slate-500">Type</span><span className={`rounded-lg px-2.5 py-1 text-right text-xs font-semibold ${correctionTypeClass(item)}`}>{correctionTypeLabel(item)}</span></div>
                                    </div>
                                    <button type="button" onClick={() => { setActiveCorrection(item); setCorrectionDecisionNote(""); }} className="mt-4 h-10 w-full rounded-lg border border-blue-100 text-sm font-semibold text-blue-600 hover:bg-blue-50">Review</button>
                                </div>
                            );
                        })}
                    </div>
                    {!filteredCorrectionItems.length && <div className="p-5"><EmptyState title="No correction requests" text="Requests matching this status will appear here." /></div>}
                </div>

                <div className="flex flex-col gap-3 text-sm font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>Showing {filteredCorrectionItems.length ? `${((correctionPage - 1) * correctionPageSize) + 1} to ${Math.min(correctionPage * correctionPageSize, filteredCorrectionItems.length)}` : "0"} of {filteredCorrectionItems.length} records</span>
                    <div className="flex gap-2">
                        <button type="button" disabled={correctionPage === 1} onClick={() => setCorrectionPage((page) => Math.max(page - 1, 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-blue-100 text-slate-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                        {Array.from({ length: correctionTotalPages }, (_, index) => index + 1).slice(Math.max(correctionPage - 2, 0), Math.max(correctionPage - 2, 0) + 4).map((page) => (
                            <button key={page} type="button" onClick={() => setCorrectionPage(page)} className={`h-11 min-w-11 rounded-xl px-4 font-semibold ${page === correctionPage ? "bg-blue-600 text-white" : "border border-blue-100 text-slate-600 hover:bg-blue-50"}`}>{page}</button>
                        ))}
                        <button type="button" disabled={correctionPage === correctionTotalPages} onClick={() => setCorrectionPage((page) => Math.min(page + 1, correctionTotalPages))} className="grid h-11 w-11 place-items-center rounded-xl border border-blue-100 text-slate-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </section>}

            <CorrectionReviewDrawer
                item={activeCorrection}
                employee={activeCorrectionEmployee}
                note={correctionDecisionNote}
                setNote={setCorrectionDecisionNote}
                onClose={() => setActiveCorrection(null)}
                onDecision={(status) => setPendingCorrectionDecision({ item: activeCorrection, status })}
                busy={reviewCorrection.isPending || bulkReviewCorrection.isPending}
            />
            {pendingCorrectionDecision && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${pendingCorrectionDecision.status === "approved" ? "text-emerald-600" : "text-rose-600"}`}>
                            Confirm {pendingCorrectionDecision.status === "approved" ? "approval" : "rejection"}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-950">
                            {pendingCorrectionDecision.status === "approved" ? "Approve this correction request?" : "Reject this correction request?"}
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                            This will update the request status for the selected record.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setPendingCorrectionDecision(null)} className="rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button
                                type="button"
                                disabled={reviewCorrection.isPending || bulkReviewCorrection.isPending}
                                onClick={() => decideCorrection(pendingCorrectionDecision.item, pendingCorrectionDecision.status)}
                                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${pendingCorrectionDecision.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                            >
                                {reviewCorrection.isPending || bulkReviewCorrection.isPending ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {manualAction && <ManualActionModal action={manualAction} value={manualActionTime} setValue={setManualActionTime} onClose={() => setManualAction(null)} onConfirm={recordManual} busy={checkIn.isPending || checkOut.isPending || startBreak.isPending || endBreak.isPending} />}
            {confirmBreakAction && <BreakConfirmModal action={confirmBreakAction} activeBreak={activeBreak} onClose={() => setConfirmBreakAction(null)} onConfirm={confirmBreakAction === "break-start" ? applyOptimisticBreakStart : applyOptimisticBreakEnd} busy={startBreak.isPending || endBreak.isPending} />}
            {confirmCheckout && <ConfirmCheckoutModal entry={activeEntry} now={now} expectedDay={expectedDay} onClose={() => setConfirmCheckout(false)} onConfirm={() => { setConfirmCheckout(false); runMutation(checkOut, buildActionPayload("check-out"), "Check out recorded"); }} busy={checkOut.isPending} />}
            {confirmReset && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600">Destructive action</p><h2 className="mt-1 text-lg font-black text-slate-950">Reset {formatDate(selectedDate)}?</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-500">This clears the selected day so it can be entered again. Existing check-in, break, checkout, and linked audit details for this date will be removed. Locked dates cannot be reset.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmReset(false)} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700">Cancel</button><button type="button" disabled={resetDate.isPending} onClick={() => resetDate.mutate({ target_date: selectedDate }, { onSuccess: () => { setConfirmReset(false); refreshAttendance(queryClient); toast.success("Date reset"); }, onError: (error) => toast.error(error.message || "Unable to reset date") })} className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{resetDate.isPending ? "Resetting..." : "Reset date"}</button></div></div></div>}
            {manualPreview && <TimesheetPreviewModal title="Submit manual time?" subtitle={formatDate(manualPreview.date)} events={manualPreview.events} rows={manualPreview.rows} note="Worked time is calculated as day span minus the break duration. Exact break start and end are shown only for live break records." onClose={() => setManualPreview(null)} onConfirm={confirmManualPreview} busy={createSelfEntry.isPending} confirmLabel="Submit time" />}
            {correctionPreview && <TimesheetPreviewModal title="Submit correction request?" subtitle={formatDate(correctionPreview.date)} events={correctionPreview.events} rows={correctionPreview.rows} note="The request will stay pending until a manager approves or rejects it. You cannot submit another correction for this day while it is pending." onClose={() => setCorrectionPreview(null)} onConfirm={confirmCorrectionPreview} busy={requestCorrection.isPending} confirmLabel="Submit request" />}
            {correctionDraft && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!canSubmitCorrection) return toast.error("Choose a correction type, change at least one value, and add a reason");
                            const requestedCheckIn = correctionDraft.check_in_time && correctionDraft.check_in_time !== correctionDraft.original_check_in_time ? correctionDraft.check_in_time : null;
                            const requestedCheckOut = correctionDraft.check_out_time && correctionDraft.check_out_time !== correctionDraft.original_check_out_time ? correctionDraft.check_out_time : null;
                            const effectiveCheckIn = correctionDraft.check_in_time || correctionDraft.original_check_in_time;
                            const effectiveCheckOut = correctionDraft.check_out_time || correctionDraft.original_check_out_time;
                            if (effectiveCheckIn && effectiveCheckOut && effectiveCheckOut <= effectiveCheckIn) return toast.error("Check-out time must be after check-in time");
                            const span = minutesBetweenTimes(effectiveCheckIn, effectiveCheckOut);
                            if (span > 0 && Number(correctionDraft.break_minutes || 0) >= span) return toast.error("Break time must be less than the total attendance span");
                            const payload = {
                                attendance_entry_id: correctionDraft.attendance_entry_id,
                                correction_type: correctionDraft.correction_type,
                                reason: correctionDraft.reason.trim(),
                                requested_check_in_at: combineDateTimeValue(correctionDraft.selected_date, requestedCheckIn),
                                requested_check_out_at: combineDateTimeValue(correctionDraft.selected_date, requestedCheckOut),
                                requested_break_minutes: Number(correctionDraft.break_minutes ?? correctionDraft.original_break_minutes) !== Number(correctionDraft.original_break_minutes) ? Number(correctionDraft.break_minutes || 0) : undefined,
                                requester_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            };
                            const oldSpan = minutesBetweenTimes(correctionDraft.original_check_in_time, correctionDraft.original_check_out_time);
                            const newBreak = Number(correctionDraft.break_minutes ?? correctionDraft.original_break_minutes);
                            setCorrectionPreview({
                                payload,
                                date: correctionDraft.selected_date,
                                events: previewEventsForTimes(correctionDraft.selected_date, effectiveCheckIn, effectiveCheckOut, newBreak),
                                rows: [
                                    { label: "Old worked", value: formatMinutes(oldSpan - Number(correctionDraft.original_break_minutes || 0)) },
                                    { label: "New worked", value: formatMinutes(span - newBreak) },
                                    { label: "Break", value: `${formatMinutes(correctionDraft.original_break_minutes || 0)} -> ${formatMinutes(newBreak)}` },
                                    { label: "Day span", value: formatMinutes(span) },
                                ],
                            });
                        }}
                        className="w-full max-w-2xl rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-blue-600">Timesheet correction</p>
                                <h2 className="mt-1 text-lg font-semibold text-slate-950">Request a time change</h2>
                                <p className="mt-1 text-sm font-medium text-slate-500">{formatDate(correctionDraft.selected_date)}</p>
                            </div>
                            <button type="button" onClick={() => setCorrectionDraft(null)} className="grid h-9 w-9 place-items-center rounded-2xl text-slate-500 hover:bg-slate-50"><X size={17} /></button>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <div className="md:col-span-3"><Field label="Correction type"><ThemedSelect searchable value={correctionDraft.correction_type || ""} onChange={(value) => setCorrectionDraft((v) => ({ ...v, correction_type: value }))} options={correctionTypeOptions} placeholder="Select correction type" /></Field></div>
                            <div className="rounded-3xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-950">Check in</p>
                                <div className="mt-3"><Field label="Time"><ThemedSelect value={correctionDraft.check_in_time || ""} onChange={(value) => setCorrectionDraft((v) => ({ ...v, check_in_time: value }))} options={[{ value: "", label: "No change" }, ...timeOptionItems]} /></Field></div>
                            </div>
                            <div className="rounded-3xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-950">Check out</p>
                                <div className="mt-3"><Field label="Time"><ThemedSelect value={correctionDraft.check_out_time || ""} onChange={(value) => setCorrectionDraft((v) => ({ ...v, check_out_time: value }))} options={[{ value: "", label: "No change" }, ...timeOptionItems]} /></Field></div>
                            </div>
                            <div className="rounded-3xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-950">Break</p>
                                <div className="mt-3"><Field label="Optional"><ThemedSelect value={correctionDraft.break_minutes ?? ""} onChange={(value) => setCorrectionDraft((v) => ({ ...v, break_minutes: value === "" ? undefined : Number(value) }))} options={[{ value: "", label: "No change" }, ...breakOptionItems]} /></Field></div>
                            </div>
                            <div className="md:col-span-3"><Field label="Reason"><input required value={correctionDraft.reason} onChange={(e) => setCorrectionDraft((v) => ({ ...v, reason: e.target.value }))} className={inputClassName} placeholder="Explain why this time needs correction" /></Field></div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setCorrectionDraft(null)} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button disabled={!canSubmitCorrection} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{requestCorrection.isPending ? "Submitting..." : "Submit request"}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
