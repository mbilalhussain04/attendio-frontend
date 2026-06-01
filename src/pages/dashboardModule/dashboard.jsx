import React, { useEffect, useMemo, useState } from "react";
import {
    BriefcaseBusiness,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    FilePenLine,
    Search,
    Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { useAuth } from "../../context/auth-context.jsx";
import { useBranchesQuery, useProjectsQuery } from "../../hooks/useAuthService.ts";
import { useAttendanceDashboardQuery, useEmployeeTimesheetQuery, useMyTimesheetQuery, useWhoIsInQuery } from "../../hooks/useAttendanceService";
import { useEmployeesQuery } from "../../hooks/useEmployeeService";
import { useCompanyLeaveRequestsQuery, useMyLeaveRequestsQuery } from "../../hooks/useLeaveService";
import { useNotificationsQuery } from "../../hooks/useNotificationService";
import { useScheduleAssignmentsQuery } from "../../hooks/useSchedulingService";
import { formatMinutes, hasPermission, todayInputValue, weekStartValue } from "./attendance-shared.jsx";
import { labelFor, moduleEnabled } from "../../config/workspaceProfiles.js";
import { getInitials } from "../../utils";

const today = () => todayInputValue();
const rangeEndValue = () => {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    return date.toISOString().slice(0, 10);
};
const displayName = (user) => user?.fullName || user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "User";
const employeeName = (employee) => [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || employee?.email || "Employee";
const isActive = (item) => !["inactive", "terminated", "archived"].includes(String(item?.status || "").toLowerCase());
const matchesProject = (employee, projectId) => !projectId || (employee?.project_ids || []).map(String).includes(String(projectId));
const matchesBranch = (employee, branchId) => !branchId || String(employee?.branch_id || "") === String(branchId);
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(new Date(value)) : "";
const formatMonth = (value) => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));
const currentMonthValue = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
const monthOptions = () => Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: formatMonth(value) };
});
const avatarUrl = (employee) => employee?.profile_picture || employee?.avatar_url || employee?.profile_picture_url;
const ALL_EMPLOYEES = "__all";

function SelectControl({ icon: Icon, value, onChange, options, label }) {
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => String(option.value) === String(value)) || options[0];
    return (
        <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                className="flex h-11 w-full min-w-0 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 text-left text-sm font-black text-slate-800 shadow-sm shadow-blue-500/5 outline-none transition hover:bg-blue-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                aria-label={label}
            >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-blue-600" />}
                <span className="min-w-0 flex-1 truncate">{selected?.label || label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-blue-600 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 max-h-72 w-full min-w-[14rem] overflow-auto rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-blue-500/15">
                    {options.map((option) => {
                        const active = String(option.value) === String(value);
                        return (
                            <button
                                key={option.value || "all"}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => { onChange(option.value); setOpen(false); }}
                                className={`block w-full rounded-xl px-3 py-2 text-left text-sm font-black ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, text, icon: Icon, tone = "blue", trend = [] }) {
    const colors = {
        blue: { icon: "bg-blue-50 text-blue-600", wash: "from-blue-50/90" },
        green: { icon: "bg-emerald-50 text-emerald-600", wash: "from-emerald-50/90" },
        orange: { icon: "bg-orange-50 text-orange-600", wash: "from-orange-50/90" },
        violet: { icon: "bg-violet-50 text-violet-600", wash: "from-violet-50/90" },
        sky: { icon: "bg-sky-50 text-sky-600", wash: "from-sky-50/90" },
    };
    const palette = colors[tone] || colors.blue;
    return (
        <div className={`min-w-0 rounded-[1rem] border border-blue-100 bg-gradient-to-br ${palette.wash} to-white p-4 shadow-sm shadow-blue-500/5`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-600">{title}</p>
                    <p className="mt-2 truncate text-3xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">{text}</p>
                </div>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${palette.icon}`}>
                    <Icon size={22} />
                </div>
            </div>
            <MiniTrend values={trend} tone={tone} />
        </div>
    );
}

function EmployeeDashboardSelector({ employees = [], value = "", onChange, canSelect = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const selected = employees.find((employee) => String(employee.id) === String(value));
    const activeAll = value === ALL_EMPLOYEES;
    const visibleLimit = 2;
    const firstVisible = employees.slice(0, visibleLimit);
    const selectedIsVisible = selected && firstVisible.some((employee) => String(employee.id) === String(selected.id));
    const visible = selected && !activeAll && !selectedIsVisible && firstVisible.length
        ? [firstVisible[0], selected]
        : firstVisible;
    const visibleIds = new Set(visible.map((employee) => String(employee.id)));
    const overflow = Math.max(0, employees.filter((employee) => !visibleIds.has(String(employee.id))).length);
    const accessibleCount = employees.length;
    const showCountChip = canSelect && accessibleCount > 1;
    if (!employees.length) return null;
    const filtered = employees.filter((employee) => `${employeeName(employee)} ${employee.employee_code || ""} ${employee.job_title || ""} ${employee.email || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
    return (
        <div
            className="relative flex min-w-0 items-center gap-3"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <div className="flex shrink-0 items-center -space-x-2">
            {visible.map((employee) => (
                <button key={employee.id} type="button" onClick={() => canSelect && onChange(String(employee.id))} disabled={!canSelect} title={employeeName(employee)} className={`group relative rounded-full ${String(value) === String(employee.id) ? "z-20 ring-2 ring-blue-500 ring-offset-2" : "z-0"}`}>
                    <Avatar className="h-12 w-12 border-[3px] border-white shadow-md">
                        <AvatarImage src={avatarUrl(employee)} alt={employeeName(employee)} />
                        <AvatarFallback className="bg-sky-500 text-sm font-black text-white">{getInitials(employeeName(employee))}</AvatarFallback>
                    </Avatar>
                    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.55rem)] z-50 hidden max-w-56 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow-xl group-hover:block">
                        {employeeName(employee)}
                    </span>
                </button>
            ))}
            {showCountChip && (
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    className="relative z-10 grid h-12 min-w-12 place-items-center rounded-full border-[3px] border-white bg-slate-950 px-2 text-sm font-black text-white shadow-md"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    title={overflow > 0 ? "Show more employees" : "Open team selector"}
                >
                    +{accessibleCount}
                </button>
            )}
            </div>
            {canSelect && (
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    className="flex h-12 min-w-[9.5rem] items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-600 shadow-sm shadow-blue-500/5 outline-none transition hover:bg-blue-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <Users className="h-5 w-5" />
                    My Team
                    <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                </button>
            )}
            {open && (
                <div className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-[min(28rem,calc(100vw-2rem))] rounded-[1.3rem] border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/15">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search employee"
                            className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(ALL_EMPLOYEES); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${activeAll ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">All</span>
                            <span className="min-w-0">
                                <b className="block truncate text-sm">All employees</b>
                                <span className="block truncate text-xs font-bold opacity-75">Company dashboard scope</span>
                            </span>
                        </button>
                        {filtered.map((employee) => (
                            <button key={employee.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(String(employee.id)); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${String(value) === String(employee.id) ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={avatarUrl(employee)} alt={employeeName(employee)} />
                                    <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeName(employee))}</AvatarFallback>
                                </Avatar>
                                <span className="min-w-0">
                                    <b className="block truncate text-sm">{employeeName(employee)}</b>
                                    <span className="block truncate text-xs font-bold opacity-75">{employee.job_title || employee.role_name || "Employee"}</span>
                                    <span className="block truncate text-xs font-black opacity-70">{employee.employee_code || employee.email}</span>
                                </span>
                            </button>
                        ))}
                        {!filtered.length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No employee found.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniTrend({ values = [], tone = "blue" }) {
    const points = values.slice(-8).map((item) => Number(item || 0));
    if (points.length < 2) return <MiniTrend values={[0, points[0] || 0]} tone={tone} />;
    const max = Math.max(...points, 1);
    const color = { blue: "#2563eb", green: "#16a34a", orange: "#f97316", violet: "#7c3aed", sky: "#0284c7" }[tone] || "#2563eb";
    return (
        <svg viewBox="0 0 100 28" className="mt-4 h-8 w-full overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points.map((value, index) => `${(index / (points.length - 1)) * 100},${26 - (value / max) * 22}`).join(" ")}
            />
            {points.map((value, index) => <circle key={`${value}-${index}`} cx={(index / (points.length - 1)) * 100} cy={26 - (value / max) * 22} r="2.3" fill={color} />)}
        </svg>
    );
}

function RingChart({ rows }) {
    const total = rows.reduce((sum, item) => sum + item.value, 0);
    let offset = 25;
    return (
        <div className="grid gap-5 sm:grid-cols-[minmax(13rem,0.85fr)_minmax(0,1.15fr)] sm:items-center">
            <div className="relative mx-auto h-56 w-56 xl:h-60 xl:w-60">
                <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#eaf2ff" strokeWidth="7" />
                    {rows.filter((item) => item.value > 0).map((item) => {
                        const stroke = `${(item.value / Math.max(total, 1)) * 100} ${100 - (item.value / Math.max(total, 1)) * 100}`;
                        const segment = <circle key={item.label} cx="21" cy="21" r="15.915" fill="transparent" stroke={item.color} strokeWidth="7" strokeDasharray={stroke} strokeDashoffset={offset} />;
                        offset -= (item.value / Math.max(total, 1)) * 100;
                        return segment;
                    })}
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="text-xs font-black text-slate-500">Total</p>
                        <p className="text-2xl font-black text-slate-950">{total}</p>
                    </div>
                </div>
            </div>
            <div className="min-w-0 space-y-3">
                {rows.map((item) => (
                    <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-base font-bold">
                        <span className="flex min-w-0 items-center gap-3 text-slate-600"><i className="h-4 w-4 shrink-0 rounded-full" style={{ background: item.color }} /> <span className="truncate">{item.label}</span></span>
                        <span className="shrink-0 text-xl font-black text-slate-950">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AttendanceOverviewPanel({ rows, workedMinutes, openCount, lateCount }) {
    return (
        <div className="flex min-h-[24rem] flex-col justify-between gap-5">
            <RingChart rows={rows} />
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-base font-black text-blue-700">{formatMinutes(workedMinutes)} worked</div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-base font-black text-emerald-700">{openCount} open check-ins</div>
                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-base font-black text-orange-700">{lateCount} late signals</div>
            </div>
        </div>
    );
}

function BarChart({ rows }) {
    const max = Math.max(...rows.flatMap((row) => [row.approved, row.pending, row.rejected]), 1);
    return (
        <div className="mt-4 min-w-0 overflow-hidden rounded-2xl bg-slate-50 p-3">
            <div className="flex h-48 items-end gap-3 overflow-x-auto pb-2">
                {rows.map((row) => (
                    <div key={row.label} className="flex min-w-16 flex-1 flex-col items-center gap-2">
                        <div className="flex h-36 items-end gap-1.5">
                            {[
                                ["approved", "#22c55e"],
                                ["pending", "#f97316"],
                                ["rejected", "#ef4444"],
                            ].map(([key, color]) => (
                                <span
                                    key={key}
                                    className="w-3 rounded-t-md shadow-sm"
                                    style={{ height: `${Math.max(8, (Number(row[key] || 0) / max) * 128)}px`, backgroundColor: color }}
                                    title={`${row.label} ${key}: ${row[key] || 0}`}
                                />
                            ))}
                        </div>
                        <span className="text-[11px] font-black text-slate-500">{row.label}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] font-black text-slate-500">
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Approved</span>
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />Pending</span>
                <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Rejected</span>
            </div>
        </div>
    );
}

function Panel({ title, action, children }) {
    return (
        <section className="flex min-w-0 flex-col rounded-[1rem] border border-blue-100 bg-white p-4 shadow-sm shadow-blue-500/5 sm:p-5">
            <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <h2 className="truncate text-base font-black text-slate-950">{title}</h2>
                {action}
            </div>
            <div className="min-h-0">{children}</div>
        </section>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [branchId, setBranchId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [month, setMonth] = useState(currentMonthValue());
    const employeeScopeSelected = Boolean(employeeId && employeeId !== ALL_EMPLOYEES);
    const canViewCompany = hasPermission(user, "reports.company") || hasPermission(user, "attendance.view_company") || hasPermission(user, "settings.tenant");
    const canViewTeam = canViewCompany || hasPermission(user, "attendance.view_team");
    const canSeeLeaveCompany = hasPermission(user, "leave.view_company") || hasPermission(user, "leave.review") || hasPermission(user, "settings.tenant") || hasPermission(user, "reports.company");
    const canSeeSchedule = ["schedule.view_self", "schedule.view_team", "schedule.view_company", "schedule.manage", "settings.tenant", "reports.company"].some((permission) => hasPermission(user, permission));
    const canSeeEmployees = hasPermission(user, "users.invite") || hasPermission(user, "reports.company") || hasPermission(user, "settings.tenant");
    const branchLabel = labelFor(user?.company, "branch", "Branch");
    const projectLabel = labelFor(user?.company, "project", "Project");
    const weekRange = useMemo(() => ({ from: weekStartValue(), to: rangeEndValue() }), []);
    const monthRange = useMemo(() => {
        const start = `${month}-01`;
        const [year, monthNumber] = month.split("-").map(Number);
        return { from: start, to: new Date(year, monthNumber, 0).toISOString().slice(0, 10) };
    }, [month]);

    const branches = useBranchesQuery(canViewTeam);
    const projects = useProjectsQuery(canViewTeam, { limit: 200, offset: 0 });
    const employees = useEmployeesQuery(canSeeEmployees, { limit: 200, offset: 0, branch_id: branchId, project_id: projectId });
    const attendanceDashboard = useAttendanceDashboardQuery({ date: today(), branch_id: branchId }, canViewCompany);
    const whoIsIn = useWhoIsInQuery({ branch_id: branchId }, canViewTeam);
    const myTimesheet = useMyTimesheetQuery(monthRange, !canViewCompany);
    const employeeTimesheet = useEmployeeTimesheetQuery(employeeScopeSelected ? employeeId : undefined, monthRange, employeeScopeSelected && canViewTeam);
    const companyLeaves = useCompanyLeaveRequestsQuery({ year: month.slice(0, 4) }, canSeeLeaveCompany);
    const myLeaves = useMyLeaveRequestsQuery({ year: month.slice(0, 4) }, !canSeeLeaveCompany);
    const schedules = useScheduleAssignmentsQuery({ date_from: weekRange.from, date_to: weekRange.to }, canSeeSchedule);
    const notifications = useNotificationsQuery(true);

    const branchOptions = useMemo(() => [
        { value: "", label: `All ${branchLabel.toLowerCase()}s` },
        ...(branches.data?.data || []).filter(isActive).map((branch) => ({ value: String(branch.id), label: [branch.name, branch.city].filter(Boolean).join(" - ") || branch.name })),
    ], [branches.data, branchLabel]);
    const projectOptions = useMemo(() => [
        { value: "", label: `All ${projectLabel.toLowerCase()}s` },
        ...(projects.data?.data || []).filter(isActive).filter((project) => !branchId || String(project.branch_id || "") === String(branchId)).map((project) => ({ value: String(project.id), label: [project.name, project.code].filter(Boolean).join(" - ") || project.name })),
    ], [projects.data, projectLabel, branchId]);

    const employeeRows = employees.data?.data || [];
    const filteredEmployees = employeeRows.filter((employee) => matchesBranch(employee, branchId) && matchesProject(employee, projectId));
    const currentUserEmployee = {
        id: user?.id,
        first_name: user?.first_name,
        last_name: user?.last_name,
        email: user?.email,
        employee_code: user?.employee_code,
        job_title: user?.job_title || user?.role_name,
        profile_picture: user?.profile_picture || user?.profile_picture_url,
        avatar_url: user?.avatar_url,
    };
    const teamAvatars = canSeeEmployees ? (filteredEmployees.length ? filteredEmployees : [currentUserEmployee]) : [currentUserEmployee];
    const defaultEmployeeId = String(currentUserEmployee.id || "");
    useEffect(() => {
        if (!employeeId && defaultEmployeeId) setEmployeeId(defaultEmployeeId);
    }, [employeeId, defaultEmployeeId]);
    const scopedEmployees = employeeId && employeeId !== ALL_EMPLOYEES ? filteredEmployees.filter((employee) => String(employee.id) === String(employeeId)) : filteredEmployees;
    const filteredEmployeeIds = new Set(scopedEmployees.map((employee) => String(employee.id)));
    const summary = attendanceDashboard.data?.data?.summary || {};
    const timesheetRows = (employeeScopeSelected ? employeeTimesheet.data?.data : myTimesheet.data?.data) || [];
    const leaveRows = (canSeeLeaveCompany ? companyLeaves.data?.data : myLeaves.data?.data) || [];
    const visibleLeaves = leaveRows.filter((leave) => {
        const id = String(leave.user_id || leave.employee_id || leave.employee?.id || leave.employee_snapshot?.id || "");
        if (employeeId && employeeId !== ALL_EMPLOYEES) return id === String(employeeId);
        return !filteredEmployeeIds.size || filteredEmployeeIds.has(id);
    });
    const scheduleRows = (schedules.data?.data || []).filter((item) => {
        const id = String(item.user_id || item.employee_id || item.employee?.id || "");
        const employeeOk = employeeId && employeeId !== ALL_EMPLOYEES ? id === String(employeeId) : (!filteredEmployeeIds.size || filteredEmployeeIds.has(id));
        const branchOk = !branchId || String(item.branch_id || item.employee?.branch_id || "") === String(branchId);
        const projectOk = !projectId || String(item.project_id || "") === String(projectId);
        return employeeOk && branchOk && projectOk;
    });

    const pendingLeaves = visibleLeaves.filter((item) => item.status === "pending").length;
    const approvedLeaves = visibleLeaves.filter((item) => item.status === "approved").length;
    const rejectedLeaves = visibleLeaves.filter((item) => item.status === "rejected").length;
    const activeProjects = (projects.data?.data || []).filter(isActive).filter((project) => !branchId || String(project.branch_id || "") === String(branchId)).length;
    const selectedEmployee = teamAvatars.find((employee) => String(employee.id) === String(employeeId));
    const isPersonalScope = employeeScopeSelected;
    const totalEmployees = isPersonalScope ? 1 : canSeeEmployees ? scopedEmployees.length : 1;
    const useTimesheetScope = isPersonalScope || !canViewCompany;
    const workedMinutes = useTimesheetScope ? timesheetRows.reduce((total, row) => total + Number(row.worked_minutes || 0), 0) : Number(summary.workedMinutes || 0);
    const lateCount = useTimesheetScope ? timesheetRows.filter((row) => Number(row.late_minutes || 0) > 0).length : Number(summary.late || 0);
    const totalEntries = useTimesheetScope ? timesheetRows.length : Number(summary.totalEntries || 0);
    const openCount = useTimesheetScope ? timesheetRows.filter((row) => !row.check_out_at && row.check_in_at).length : canViewTeam ? (whoIsIn.data?.data || []).length : Number(summary.open || 0);
    const notificationRows = notifications.data?.data || [];
    const attendanceTrend = (useTimesheetScope ? timesheetRows.map((row) => row.worked_minutes) : [summary.totalEntries, summary.open, summary.late, summary.workedMinutes]).map(Number);
    const leaveTrend = visibleLeaves.length ? visibleLeaves.slice(-8).map((_, index) => index + 1) : [0, approvedLeaves];
    const leaveBarRows = useMemo(() => {
        const months = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(`${month}-01T00:00:00`);
            date.setMonth(date.getMonth() - (5 - index));
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            return { key, label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date), approved: 0, pending: 0, rejected: 0 };
        });
        visibleLeaves.forEach((item) => {
            const key = String(item.from_date || item.created_at || "").slice(0, 7);
            const row = months.find((entry) => entry.key === key);
            if (!row) return;
            if (item.status === "approved") row.approved += 1;
            else if (item.status === "rejected") row.rejected += 1;
            else row.pending += 1;
        });
        return months;
    }, [visibleLeaves, month]);

    const stats = [
        { title: "Total Employees", value: totalEmployees, text: canSeeEmployees ? "visible in current scope" : "your profile", icon: Users, tone: "blue", trend: [0, totalEmployees] },
        { title: "On Leave", value: approvedLeaves, text: "approved this year", icon: CalendarDays, tone: "green", trend: leaveTrend },
        { title: "Pending Requests", value: pendingLeaves + Number(attendanceDashboard.data?.data?.pendingCorrections || 0), text: `${pendingLeaves} leave - ${Number(attendanceDashboard.data?.data?.pendingCorrections || 0)} attendance`, icon: FilePenLine, tone: "orange", trend: [pendingLeaves, attendanceDashboard.data?.data?.pendingCorrections || 0] },
        { title: "Late Arrivals", value: lateCount, text: "selected date/range", icon: Clock3, tone: "violet", trend: attendanceTrend.length ? attendanceTrend : [0, lateCount] },
        { title: "Active Projects", value: activeProjects, text: "in current branch filter", icon: BriefcaseBusiness, tone: "sky", trend: [activeProjects, projectOptions.length - 1] },
    ];
    const attendanceRing = [
        { label: "Attendance records", value: totalEntries, color: "#2563eb" },
        { label: "Active check-ins", value: openCount, color: "#22c55e" },
        { label: "Late arrivals", value: lateCount, color: "#f97316" },
    ];

    return (
        <div className="min-w-0 space-y-4">
            <section className="min-w-0 space-y-3">
                <div className="min-w-0 text-left">
                    <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Dashboard</h1>
                    <p className="mt-1 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                        {isPersonalScope && selectedEmployee ? `Viewing ${employeeName(selectedEmployee)}'s dashboard with your admin access.` : employeeId === ALL_EMPLOYEES ? "Company-wide live dashboard based on your role access." : `Welcome back, ${displayName(user)}. This is your personal dashboard.`}
                    </p>
                </div>
                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,auto)_minmax(34rem,1fr)] xl:items-center">
                    <EmployeeDashboardSelector employees={teamAvatars} value={employeeId || defaultEmployeeId} onChange={setEmployeeId} canSelect={canSeeEmployees} />
                    <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                        <SelectControl icon={CalendarDays} label="Month" value={month} onChange={setMonth} options={monthOptions()} />
                        <SelectControl icon={Search} label={branchLabel} value={branchId} onChange={(value) => { setBranchId(value); setProjectId(""); setEmployeeId(defaultEmployeeId); }} options={branchOptions} />
                        <SelectControl icon={BriefcaseBusiness} label={projectLabel} value={projectId} onChange={(value) => { setProjectId(value); setEmployeeId(defaultEmployeeId); }} options={projectOptions} />
                    </div>
                </div>
            </section>

            <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((item) => <StatCard key={item.title} {...item} />)}
            </section>

            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Panel title="Attendance Overview">
                    <AttendanceOverviewPanel rows={attendanceRing} workedMinutes={workedMinutes} openCount={openCount} lateCount={lateCount} />
                </Panel>

                <Panel title={`Leave Summary (${formatMonth(month)})`}>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            ["Approved", approvedLeaves, "bg-emerald-50 text-emerald-700"],
                            ["Pending", pendingLeaves, "bg-orange-50 text-orange-700"],
                            ["Rejected", rejectedLeaves, "bg-rose-50 text-rose-700"],
                        ].map(([label, value, tone]) => (
                            <div key={label} className={`rounded-2xl px-3 py-2 ${tone}`}>
                                <p className="text-[11px] font-black uppercase">{label}</p>
                                <p className="text-2xl font-black">{value}</p>
                            </div>
                        ))}
                    </div>
                    <BarChart rows={leaveBarRows} />
                </Panel>
            </section>

            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,0.75fr)]">
                <Panel title="This Week Schedule" action={<a href="/scheduling" className="text-xs font-black text-blue-600 hover:text-blue-700">Open calendar</a>}>
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                        {scheduleRows.slice(0, 8).map((item) => (
                            <div key={item.id || `${item.employee_id}-${item.date}`} className="rounded-2xl border border-blue-100 bg-slate-50 p-3 text-left">
                                <p className="truncate text-sm font-black text-slate-950">{item.shift?.name || item.shift_name || item.title || "Schedule"}</p>
                                <p className="mt-1 truncate text-xs font-bold text-slate-500">{formatDate(item.date || item.start_at)} - {item.start_time || item.starts_at || item.start || ""} {item.end_time || item.ends_at || item.end ? `- ${item.end_time || item.ends_at || item.end}` : ""}</p>
                                <p className="mt-1 truncate text-xs font-black text-blue-600">{item.employee?.name || item.employee_name || item.employee_snapshot?.name || "Employee"}</p>
                            </div>
                        ))}
                        {!scheduleRows.length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No schedule entries in this range.</p>}
                    </div>
                </Panel>

                <Panel title="Recent Requests">
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                        {visibleLeaves.slice(0, 8).map((item) => (
                            <div key={item.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-3 text-left">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{employeeName(item.employee || item.employee_snapshot)}</p>
                                    <p className="truncate text-xs font-bold text-slate-500">{item.leave_type?.name || item.type || "Leave"} - {formatDate(item.from_date)} - {formatDate(item.to_date)}</p>
                                </div>
                                <span className={`h-fit rounded-full px-2 py-1 text-[11px] font-black capitalize ${item.status === "approved" ? "bg-emerald-50 text-emerald-700" : item.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-orange-700"}`}>{item.status}</span>
                            </div>
                        ))}
                        {!visibleLeaves.length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No leave requests in this scope.</p>}
                    </div>
                </Panel>

                <Panel title="Announcements">
                    <div className="max-h-80 space-y-2 overflow-auto pr-1">
                        {notificationRows.slice(0, 6).map((item) => (
                            <div key={item.id} className="rounded-2xl border border-blue-100 bg-slate-50 p-3 text-left">
                                <p className="truncate text-sm font-black text-slate-950">{item.title || item.subject || "Notification"}</p>
                                <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{item.message || item.body || item.content || "No details provided."}</p>
                            </div>
                        ))}
                        {!notificationRows.length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No announcements yet.</p>}
                    </div>
                </Panel>
            </section>

            <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel title="Live Activity">
                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                        {(whoIsIn.data?.data || []).slice(0, 8).map((entry) => (
                            <div key={entry.id} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-blue-50 p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{entry.employee_name || entry.employee_code || "Employee"}</p>
                                    <p className="truncate text-xs font-bold text-slate-500">Checked in {entry.check_in_at ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.check_in_at)) : ""}</p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            </div>
                        ))}
                        {!(whoIsIn.data?.data || []).length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No active check-ins now.</p>}
                    </div>
                </Panel>

                <Panel title="Quick Actions">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                            ["Leave", "/leaves", CalendarDays, moduleEnabled(user?.company, "leaves") && hasPermission(user, "leave.request")],
                            ["Timesheet", "/timesheets", CheckCircle2, moduleEnabled(user?.company, "timesheets") && hasPermission(user, "attendance.view_self")],
                            ["Schedule", "/scheduling", CalendarClock, moduleEnabled(user?.company, "scheduling") && canSeeSchedule],
                            ["Employees", "/employees", Users, moduleEnabled(user?.company, "employees") && canSeeEmployees],
                        ].filter((item) => item[3]).map(([label, href, Icon]) => (
                            <a key={label} href={href} className="grid min-h-24 place-items-center rounded-2xl border border-blue-100 bg-slate-50 p-3 text-center text-xs font-black text-slate-700 hover:bg-blue-50 hover:text-blue-600">
                                <Icon className="mb-2 h-6 w-6 text-blue-600" />
                                {label}
                            </a>
                        ))}
                    </div>
                </Panel>
            </section>
        </div>
    );
}
