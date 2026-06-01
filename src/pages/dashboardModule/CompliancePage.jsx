import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, ChevronDown, Clock3, MapPinned, Pencil, Search, ScrollText, ShieldCheck, Trash2, Umbrella, UserRoundCog, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context.jsx";
import {
    useAttendanceAuditLogsQuery,
    useAttendancePolicyQuery,
    useCreateGeofenceMutation,
    useCreateHolidayMutation,
    useDeleteGeofenceMutation,
    useDeleteHolidayMutation,
    useDeleteShiftMutation,
    useGeofencesQuery,
    useHolidaysQuery,
    useImportHolidaysMutation,
    useCreateShiftMutation,
    useShiftsQuery,
    useUpdateGeofenceMutation,
    useUpdateHolidayMutation,
    useUpdateShiftMutation,
    useUpdateAttendancePolicyMutation,
} from "../../hooks/useAttendanceService";
import {
    useCreateLeaveEntitlementGrantMutation,
    useCreateLeaveEntitlementPolicyMutation,
    useCreateLeaveTypeMutation,
    useDeleteLeaveEntitlementGrantMutation,
    useDeleteLeaveEntitlementPolicyMutation,
    useDeleteLeaveTypeMutation,
    useLeaveEntitlementGrantsQuery,
    useLeaveEntitlementPoliciesQuery,
    useLeavePolicyQuery,
    useLeaveTypesQuery,
    useUpdateLeaveEntitlementGrantMutation,
    useUpdateLeaveEntitlementPolicyMutation,
    useUpdateLeaveTypeMutation,
    useUpdateLeavePolicyMutation,
} from "../../hooks/useLeaveService.ts";
import { useEmployeesQuery, useUpdateEmployeeMutation } from "../../hooks/useEmployeeService.ts";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { getInitials } from "../../utils";
import {
    EmptyState,
    Field,
    PageHeading,
    formatDate,
    formatDateTime,
    hasPermission,
    inputClassName,
} from "./attendance-shared.jsx";
import { labelFor, moduleEnabled } from "../../config/workspaceProfiles.js";

const holidayInitial = { state_code: "", holiday_date: "", name: "", category: "public" };
const importInitial = { country_code: "DE", state_code: "", year: new Date().getFullYear() };
const geofenceInitial = { name: "", latitude: "", longitude: "", radius_meters: 200, is_active: true };
const leaveTypeInitial = { name: "", entitlement_days: "", paid: true, attachment_required: false, active: true };
const entitlementPolicyInitial = { leave_type_id: "", name: "", contract_type: "", employment_type: "", entitlement_days: "", priority: "100", active: true };
const entitlementGrantInitial = { user_id: "", leave_type_id: "", entitlement_days: "", note: "" };
const display = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const days = (value) => value === null || value === undefined ? "-" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })} d`;
const employeeLabel = (item) => [item?.first_name, item?.last_name].filter(Boolean).join(" ") || item?.email || "Employee";
const employeeRole = (item) => display(item?.job_title || item?.role_name || item?.role_key || "Employee");
const employeeAvatar = (item) => item?.profile_picture || item?.avatar_url || item?.profile_picture_url;
const shiftInitial = { name: "", start_at: "", end_at: "", break_minutes: 0 };
const dateTimeInput = (value) => value ? String(value).slice(0, 16) : "";

const tabs = [
    { key: "rules", label: "Working Rules", icon: Clock3 },
    { key: "leave", label: "Leave Rules", icon: Umbrella },
    { key: "holidays", label: "Holiday Calendars", icon: CalendarRange },
    { key: "locations", label: "Locations", icon: MapPinned },
    { key: "audit", label: "Audit Trail", icon: ScrollText },
];
const workingSections = [
    { key: "legal", label: "Legal Checks", icon: ShieldCheck },
    { key: "defaults", label: "Company Defaults", icon: Clock3 },
    { key: "overrides", label: "Employee and Shift Setup", icon: UserRoundCog },
];

function Surface({ children, className = "" }) {
    return <section className={`rounded-[1.4rem] border border-blue-100 bg-white/90 shadow-lg shadow-blue-500/5 ${className}`}>{children}</section>;
}

function Stat({ label, value, tone }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function ConfirmModal({ action, busy, onClose }) {
    if (!action) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${action.tone === "danger" ? "text-red-600" : "text-blue-600"}`}>Confirm action</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{action.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{action.body}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-60">Cancel</button>
                    <button type="button" onClick={action.onConfirm} disabled={busy} className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-60 ${action.tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>{busy ? "Saving..." : action.label || "Confirm"}</button>
                </div>
            </div>
        </div>
    );
}

export default function CompliancePage() {
    const { user } = useAuth();
    const branchLabel = labelFor(user?.company, "branch", "Location");
    const departmentLabel = labelFor(user?.company, "department", "Department");
    const managerLabel = labelFor(user?.company, "manager", "Manager");
    const schedulingEnabled = moduleEnabled(user?.company, "scheduling");
    const queryClient = useQueryClient();
    const canConfigure = hasPermission(user, "attendance.configure");
    const canHoliday = hasPermission(user, "attendance.holiday_manage");
    const canGeofence = hasPermission(user, "attendance.geofence_manage");
    const canCompany = hasPermission(user, "attendance.view_company");
    const canShiftManage = hasPermission(user, "attendance.shift_manage");
    const canEmployeeManage = hasPermission(user, "users.invite");
    const canLeaveConfigure = hasPermission(user, "leave.configure");
    const policy = useAttendancePolicyQuery(canConfigure);
    const holidays = useHolidaysQuery(canHoliday);
    const geofences = useGeofencesQuery(canGeofence);
    const auditLogs = useAttendanceAuditLogsQuery(50, canCompany);
    const leaveTypes = useLeaveTypesQuery(true, canLeaveConfigure);
    const leavePolicy = useLeavePolicyQuery(canLeaveConfigure);
    const employees = useEmployeesQuery(canLeaveConfigure || canEmployeeManage || canShiftManage);
    const entitlementPolicies = useLeaveEntitlementPoliciesQuery(canLeaveConfigure);
    const entitlementGrants = useLeaveEntitlementGrantsQuery({ year: new Date().getFullYear() }, canLeaveConfigure);
    const updatePolicy = useUpdateAttendancePolicyMutation();
    const createHoliday = useCreateHolidayMutation();
    const updateHoliday = useUpdateHolidayMutation();
    const deleteHoliday = useDeleteHolidayMutation();
    const importHolidays = useImportHolidaysMutation();
    const createGeofence = useCreateGeofenceMutation();
    const updateGeofence = useUpdateGeofenceMutation();
    const deleteGeofence = useDeleteGeofenceMutation();
    const createLeaveType = useCreateLeaveTypeMutation();
    const updateLeaveType = useUpdateLeaveTypeMutation();
    const deleteLeaveType = useDeleteLeaveTypeMutation();
    const createEntitlementPolicy = useCreateLeaveEntitlementPolicyMutation();
    const updateEntitlementPolicy = useUpdateLeaveEntitlementPolicyMutation();
    const deleteEntitlementPolicy = useDeleteLeaveEntitlementPolicyMutation();
    const createEntitlementGrant = useCreateLeaveEntitlementGrantMutation();
    const updateEntitlementGrant = useUpdateLeaveEntitlementGrantMutation();
    const deleteEntitlementGrant = useDeleteLeaveEntitlementGrantMutation();
    const updateLeavePolicy = useUpdateLeavePolicyMutation();
    const updateEmployee = useUpdateEmployeeMutation();
    const createShift = useCreateShiftMutation();
    const updateShift = useUpdateShiftMutation();
    const deleteShift = useDeleteShiftMutation();
    const [tab, setTab] = useState("rules");
    const [workingSection, setWorkingSection] = useState("legal");
    const [policyDraft, setPolicyDraft] = useState(null);
    const [holidayForm, setHolidayForm] = useState(holidayInitial);
    const [importForm, setImportForm] = useState(importInitial);
    const [geofenceForm, setGeofenceForm] = useState(geofenceInitial);
    const [leaveTypeForm, setLeaveTypeForm] = useState(leaveTypeInitial);
    const [leavePolicyDraft, setLeavePolicyDraft] = useState(null);
    const [entitlementPolicyForm, setEntitlementPolicyForm] = useState(entitlementPolicyInitial);
    const [entitlementGrantForm, setEntitlementGrantForm] = useState(entitlementGrantInitial);
    const [ruleEmployeeId, setRuleEmployeeId] = useState(() => String(user?.id || ""));
    const [ruleEmployeeQuery, setRuleEmployeeQuery] = useState("");
    const [ruleEmployeePickerOpen, setRuleEmployeePickerOpen] = useState(false);
    const [employeeHoursForm, setEmployeeHoursForm] = useState(() => ({ expected_hours_period: user?.expected_hours_period || (user?.monthly_hours ? "monthly" : "weekly"), expected_hours: user?.expected_hours ?? user?.monthly_hours ?? user?.weekly_hours ?? "" }));
    const [shiftForm, setShiftForm] = useState(shiftInitial);
    const [editingShiftId, setEditingShiftId] = useState("");
    const [editingHolidayId, setEditingHolidayId] = useState("");
    const [editingGeofenceId, setEditingGeofenceId] = useState("");
    const [editingLeaveTypeId, setEditingLeaveTypeId] = useState("");
    const [editingEntitlementPolicyId, setEditingEntitlementPolicyId] = useState("");
    const [editingEntitlementGrantId, setEditingEntitlementGrantId] = useState("");
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const ruleEmployeePickerRef = useRef(null);

    const policyForm = policyDraft || policy.data?.data || null;
    const defaultStateCode = policyForm?.federal_state || "";
    const holidayRows = holidays.data?.data || [];
    const geofenceRows = geofences.data?.data || [];
    const auditRows = auditLogs.data?.data || [];
    const leaveTypeRows = leaveTypes.data?.data || [];
    const activeLeaveTypes = leaveTypeRows.filter((item) => item.active);
    const employeeRows = useMemo(() => employees.data?.data || [], [employees.data?.data]);
    const orderedEmployeeRows = useMemo(() => [...employeeRows].sort((left, right) => Number(String(right.id) === String(user?.id)) - Number(String(left.id) === String(user?.id))), [employeeRows, user?.id]);
    const entitlementPolicyRows = entitlementPolicies.data?.data || [];
    const entitlementGrantRows = entitlementGrants.data?.data || [];
    const leavePolicyForm = leavePolicyDraft || leavePolicy.data?.data || null;
    const grantEmployee = employeeRows.find((item) => String(item.id) === String(entitlementGrantForm.user_id));
    const contractValues = [...new Set(employeeRows.map((item) => item.contract_type).filter(Boolean))];
    const employmentValues = [...new Set(employeeRows.map((item) => item.employment_type).filter(Boolean))];
    const selectedRuleEmployee = orderedEmployeeRows.find((item) => String(item.id) === String(ruleEmployeeId));
    const shiftRows = useShiftsQuery({ user_id: ruleEmployeeId }, canShiftManage && Boolean(ruleEmployeeId));
    const visibleRuleEmployees = orderedEmployeeRows.filter((item) => `${employeeLabel(item)} ${employeeRole(item)} ${item.email || ""} ${item.department || ""}`.toLowerCase().includes(ruleEmployeeQuery.trim().toLowerCase()));
    const indicators = useMemo(() => [
        { label: "Policy loaded", value: policyForm ? "Ready" : "--", tone: "border-blue-100 bg-blue-50/70" },
        { label: "Holiday dates", value: holidayRows.length, tone: "border-emerald-100 bg-emerald-50/70" },
        { label: `${branchLabel} geofences`, value: geofenceRows.length, tone: "border-cyan-100 bg-cyan-50/70" },
        { label: "Audit events", value: auditRows.length, tone: "border-amber-100 bg-amber-50/70" },
    ], [auditRows.length, geofenceRows.length, holidayRows.length, policyForm]);
    const invalidate = (...keys) => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    const isConfirmBusy = [
        updatePolicy, updateEmployee, createShift, updateShift, deleteShift, createHoliday, updateHoliday, deleteHoliday,
        importHolidays, createGeofence, updateGeofence, deleteGeofence, createLeaveType, updateLeaveType, deleteLeaveType,
        updateLeavePolicy, createEntitlementPolicy, updateEntitlementPolicy, deleteEntitlementPolicy, createEntitlementGrant,
        updateEntitlementGrant, deleteEntitlementGrant,
    ].some((mutation) => mutation.isPending);
    const confirm = (action) => setPendingConfirm({ label: "Confirm", tone: "default", ...action });

    useEffect(() => {
        if (!ruleEmployeePickerOpen) return undefined;
        const closePicker = (event) => {
            if (ruleEmployeePickerRef.current && !ruleEmployeePickerRef.current.contains(event.target)) {
                setRuleEmployeePickerOpen(false);
                setRuleEmployeeQuery("");
            }
        };
        document.addEventListener("mousedown", closePicker);
        return () => document.removeEventListener("mousedown", closePicker);
    }, [ruleEmployeePickerOpen]);

    const chooseRuleEmployee = (item) => {
        setRuleEmployeeId(String(item.id));
        setEmployeeHoursForm({
            expected_hours_period: item.expected_hours_period || (item.monthly_hours ? "monthly" : "weekly"),
            expected_hours: item.expected_hours ?? item.monthly_hours ?? item.weekly_hours ?? "",
        });
        setRuleEmployeePickerOpen(false);
        setRuleEmployeeQuery("");
    };
    const finishConfirmed = (message, keys, after) => {
        setPendingConfirm(null);
        invalidate(...keys);
        after?.();
        toast.success(message);
    };
    const shiftPayload = () => ({
        user_id: selectedRuleEmployee.id,
        employee_code: selectedRuleEmployee.employee_code || null,
        name: shiftForm.name,
        start_at: shiftForm.start_at,
        end_at: shiftForm.end_at,
        break_minutes: Number(shiftForm.break_minutes || 0),
    });
    const startShiftEdit = (item) => {
        setEditingShiftId(String(item.id));
        setShiftForm({ name: item.name, start_at: dateTimeInput(item.start_at), end_at: dateTimeInput(item.end_at), break_minutes: item.break_minutes || 0 });
    };
    const startHolidayEdit = (item) => {
        setEditingHolidayId(String(item.id));
        setHolidayForm({ state_code: item.state_code || "", holiday_date: String(item.holiday_date || "").slice(0, 10), name: item.name || "", category: item.category || "public" });
    };
    const startGeofenceEdit = (item) => {
        setEditingGeofenceId(String(item.id));
        setGeofenceForm({ name: item.name || "", latitude: item.latitude ?? "", longitude: item.longitude ?? "", radius_meters: item.radius_meters || 200, is_active: Boolean(item.is_active) });
    };
    const startLeaveTypeEdit = (item) => {
        setEditingLeaveTypeId(String(item.id));
        setLeaveTypeForm({ name: item.name || "", entitlement_days: item.entitlement_days ?? "", paid: Boolean(item.paid), attachment_required: Boolean(item.attachment_required), active: Boolean(item.active) });
    };
    const startEntitlementPolicyEdit = (item) => {
        setEditingEntitlementPolicyId(String(item.id));
        setEntitlementPolicyForm({ leave_type_id: item.leave_type_id || item.leave_type?.id || "", name: item.name || "", contract_type: item.contract_type || "", employment_type: item.employment_type || "", entitlement_days: item.entitlement_days ?? "", priority: item.priority || "100", active: Boolean(item.active) });
    };
    const startEntitlementGrantEdit = (item) => {
        setEditingEntitlementGrantId(String(item.id));
        setEntitlementGrantForm({ user_id: item.user_id || "", leave_type_id: item.leave_type_id || item.leave_type?.id || "", entitlement_days: item.entitlement_days ?? "", note: item.note || "" });
    };

    return (
        <div className="space-y-5">
            <PageHeading
                eyebrow="Rules"
                title={schedulingEnabled ? "Work, scheduling and leave rules" : "Work and leave rules"}
                text={`Shared time checks, leave setup, public calendars, ${branchLabel.toLowerCase()} controls, ${departmentLabel.toLowerCase()} exceptions, and audit history.`}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {indicators.map((item) => <Stat key={item.label} {...item} />)}
            </div>

            <Surface className="overflow-hidden">
                <div className="flex flex-wrap gap-2 border-b border-blue-100 bg-slate-50/70 p-3">
                    {tabs.map((item) => {
                        const TabIcon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setTab(item.key)}
                                className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${tab === item.key ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
                            >
                                <TabIcon size={16} />
                                {item.key === "locations" ? `${branchLabel}s` : item.key === "rules" ? "Work Rules" : item.label}
                            </button>
                        );
                    })}
                </div>

                {tab === "rules" && (
                    <div className="grid gap-5 p-5">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Work rules</h2>
                            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">Start with the safety checks every attendance record should respect, then set company fallbacks, then manage employee contract hours{schedulingEnabled ? ` and ${branchLabel.toLowerCase()} scheduling rules.` : "."}</p>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                            {workingSections.map((item) => {
                                const SectionIcon = item.icon;
                                return (
                                    <button key={item.key} type="button" onClick={() => setWorkingSection(item.key)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${workingSection === item.key ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-blue-100 bg-slate-50/70 text-slate-700 hover:bg-blue-50"}`}>
                                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${workingSection === item.key ? "bg-white/18" : "bg-white text-blue-600"}`}><SectionIcon size={17} /></span>
                                        <span className="text-sm font-black">{item.key === "overrides" ? `Employee and ${branchLabel} Setup` : item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {!canConfigure && workingSection !== "overrides" && <EmptyState title="Access required" text="Only attendance administrators can edit working-rule policy." />}

                        {workingSection === "legal" && policyForm && (
                            <form
                                className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(19rem,.95fr)]"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    confirm({ title: "Save legal checks?", body: "These workday checks affect attendance flags across the company.", label: "Save checks", onConfirm: () => updatePolicy.mutate(policyForm, {
                                        onSuccess: () => finishConfirmed("Legal checks saved", [["attendance", "policy"]]),
                                        onError: (error) => toast.error(error.message || "Unable to save legal checks"),
                                    }) });
                                }}
                            >
                                <div className="grid content-start gap-4 rounded-[1.2rem] border border-blue-100 bg-white p-4 sm:grid-cols-2">
                                    {[
                                        ["max_daily_hours", "Max daily hours"],
                                        ["max_weekly_average_hours", "Max weekly average hours"],
                                        ["break_after_6h_minutes", "Break after 6h minutes"],
                                        ["break_after_9h_minutes", "Break after 9h minutes"],
                                        ["rest_period_hours", "Rest period hours"],
                                    ].map(([key, label]) => (
                                        <Field key={key} label={label}>
                                            <input disabled={!canConfigure} type="number" value={policyForm[key] ?? ""} onChange={(event) => setPolicyDraft((current) => ({ ...(current || policyForm), [key]: Number(event.target.value) }))} className={inputClassName} />
                                        </Field>
                                    ))}
                                    <label className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-blue-50/55 px-4 py-3 text-sm font-black text-slate-700 sm:col-span-2">
                                        <input disabled={!canConfigure} type="checkbox" checked={Boolean(policyForm.sunday_justification_required)} onChange={(event) => setPolicyDraft((current) => ({ ...(current || policyForm), sunday_justification_required: event.target.checked }))} />
                                        Sunday work needs justification
                                    </label>
                                    {canConfigure && <button disabled={updatePolicy.isPending} className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2">{updatePolicy.isPending ? "Saving..." : "Save legal checks"}</button>}
                                </div>
                                <div className="grid content-start gap-3 rounded-[1.2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-sm font-black text-slate-950">Applies broadly</p>
                                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">These checks protect the recorded workday. They are not the employee contract schedule.</p>
                                    </div>
                                    {[
                                        ["Break checks", "Flags can use the 6h and 9h thresholds."],
                                        ["Rest gap", "The next check-in can be reviewed after too little rest."],
                                        ["Daily limit", "Very long worked days can be flagged for follow-up."],
                                    ].map(([title, text]) => <div key={title} className="rounded-2xl bg-white/90 p-4"><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-1 text-sm font-medium leading-6 text-slate-500">{text}</p></div>)}
                                </div>
                            </form>
                        )}

                        {workingSection === "defaults" && policyForm && (
                            <form
                                className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(19rem,.95fr)]"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    confirm({ title: "Save company defaults?", body: "Fallback attendance targets and grace settings will be updated.", label: "Save defaults", onConfirm: () => updatePolicy.mutate(policyForm, {
                                        onSuccess: () => finishConfirmed("Company defaults saved", [["attendance", "policy"]]),
                                        onError: (error) => toast.error(error.message || "Unable to save company defaults"),
                                    }) });
                                }}
                            >
                                <div className="grid content-start gap-4 rounded-[1.2rem] border border-blue-100 bg-white p-4 sm:grid-cols-2">
                                    {[
                                        ["daily_target_hours", "Fallback daily target hours"],
                                        ["weekly_hours", "Fallback weekly target hours"],
                                        ["late_grace_minutes", "Late grace minutes"],
                                        ["daily_grace_early_departure_minutes", "Early leave grace minutes"],
                                        ["lock_after_days", "Lock records after days"],
                                        ["payroll_round_to_minutes", "Time rounding minutes"],
                                    ].map(([key, label]) => (
                                        <Field key={key} label={label}>
                                            <input disabled={!canConfigure} type="number" value={policyForm[key] ?? ""} onChange={(event) => setPolicyDraft((current) => ({ ...(current || policyForm), [key]: Number(event.target.value) }))} className={inputClassName} />
                                        </Field>
                                    ))}
                                    {[
                                        ["auto_insert_breaks", "Auto insert breaks"],
                                        ["require_geofence_on_mobile", "Require geofence on mobile"],
                                    ].map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-blue-50/55 px-4 py-3 text-sm font-black text-slate-700">
                                            <input disabled={!canConfigure} type="checkbox" checked={Boolean(policyForm[key])} onChange={(event) => setPolicyDraft((current) => ({ ...(current || policyForm), [key]: event.target.checked }))} />
                                            {label}
                                        </label>
                                    ))}
                                    {canConfigure && <button disabled={updatePolicy.isPending} className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-2">{updatePolicy.isPending ? "Saving..." : "Save company defaults"}</button>}
                                </div>
                                <div className="grid content-start gap-3 rounded-[1.2rem] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/75 p-4">
                                    <div className="rounded-2xl bg-white p-4">
                                        <p className="text-sm font-black text-slate-950">Fallback means fallback</p>
                                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">Use these when no employee contract-hours value gives the attendance view a better target.</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/90 p-4">
                                        <p className="text-sm font-black text-slate-950">Good default use</p>
                                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">Grace windows, lock timing, and mobile location enforcement belong here because they are company behavior.</p>
                                    </div>
                                </div>
                            </form>
                        )}

                        {workingSection === "overrides" && (
                            <div className="grid gap-5">
                                <div ref={ruleEmployeePickerRef} className="relative rounded-[1.2rem] border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <h3 className="font-black text-slate-950">Choose employee</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Use the same employee first flow as the leave calendar, then set contract hours and dated {branchLabel.toLowerCase()} shifts for {managerLabel.toLowerCase()} review.</p>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {orderedEmployeeRows.slice(0, 3).map((item) => (
                                                    <button key={item.id} type="button" onClick={() => chooseRuleEmployee(item)} title={employeeLabel(item)} className={`rounded-full border-2 bg-white p-0.5 shadow-sm ${String(item.id) === String(ruleEmployeeId) ? "z-10 border-blue-500" : "border-white"}`}>
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={employeeAvatar(item)} alt={employeeLabel(item)} />
                                                            <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeLabel(item))}</AvatarFallback>
                                                        </Avatar>
                                                    </button>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setRuleEmployeePickerOpen((current) => !current)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-600 hover:bg-blue-50">
                                                <UsersRound size={16} />
                                                {selectedRuleEmployee ? employeeLabel(selectedRuleEmployee) : "Select employee"}
                                                <ChevronDown size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    {ruleEmployeePickerOpen && (
                                        <div className="absolute right-4 top-full z-40 mt-1 w-[min(31rem,calc(100vw-2rem))] rounded-[1.3rem] border border-blue-100 bg-white p-3 shadow-2xl shadow-blue-500/20">
                                            <label className="relative block">
                                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input value={ruleEmployeeQuery} onChange={(event) => setRuleEmployeeQuery(event.target.value)} placeholder="Search employee" className={`${inputClassName} pl-10`} />
                                            </label>
                                            <div className="mt-2 max-h-80 space-y-1 overflow-auto">
                                                {visibleRuleEmployees.map((item) => (
                                                    <button key={item.id} type="button" onClick={() => chooseRuleEmployee(item)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${String(item.id) === String(ruleEmployeeId) ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}>
                                                        <Avatar className="h-11 w-11 shrink-0">
                                                            <AvatarImage src={employeeAvatar(item)} alt={employeeLabel(item)} />
                                                            <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeLabel(item))}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="min-w-0">
                                                            <b className="block truncate text-sm">{employeeLabel(item)}</b>
                                                            <span className={`block truncate text-xs font-bold ${String(item.id) === String(ruleEmployeeId) ? "text-blue-100" : "text-slate-500"}`}>{employeeRole(item)}{item.department ? ` · ${item.department}` : ""}</span>
                                                        </span>
                                                    </button>
                                                ))}
                                                {!visibleRuleEmployees.length && <EmptyState title="No employee found" text="Try a different name, role, or department." />}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!selectedRuleEmployee && <EmptyState title="Select an employee" text="Contract hours and shifts open after an employee is selected." />}
                                {selectedRuleEmployee && (
                                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                confirm({ title: "Save employee contract hours?", body: `Attendance targets for ${employeeLabel(selectedRuleEmployee)} will use these expected hours when no dated shift is assigned.`, label: "Save hours", onConfirm: () => updateEmployee.mutate({
                                                    id: selectedRuleEmployee.id,
                                                    data: {
                                                        expected_hours_period: employeeHoursForm.expected_hours_period,
                                                        expected_hours: Number(employeeHoursForm.expected_hours),
                                                        weekly_hours: employeeHoursForm.expected_hours_period === "weekly" ? Number(employeeHoursForm.expected_hours) : undefined,
                                                        monthly_hours: employeeHoursForm.expected_hours_period === "monthly" ? Number(employeeHoursForm.expected_hours) : undefined,
                                                    },
                                                }, {
                                                    onSuccess: () => {
                                                        finishConfirmed("Employee hours saved", [["auth", "employees"]]);
                                                    },
                                                    onError: (error) => toast.error(error.message || "Unable to save employee hours"),
                                                }) });
                                            }}
                                            className="grid content-start gap-3 rounded-[1.2rem] border border-blue-100 bg-white p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UserRoundCog size={20} /></div>
                                                <div>
                                                    <h3 className="font-black text-slate-950">Contract hours</h3>
                                                    <p className="mt-1 text-sm font-medium text-slate-500">{display(selectedRuleEmployee.contract_type) || "Contract not set"} · {display(selectedRuleEmployee.employment_type) || "Arrangement not set"}</p>
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Field label="Expected hours basis">
                                                    <select disabled={!canEmployeeManage} value={employeeHoursForm.expected_hours_period} onChange={(event) => setEmployeeHoursForm((current) => ({ ...current, expected_hours_period: event.target.value }))} className={inputClassName}>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                    </select>
                                                </Field>
                                                <Field label="Expected hours">
                                                    <input disabled={!canEmployeeManage} required type="number" min="0.5" max={employeeHoursForm.expected_hours_period === "monthly" ? 220 : 48} step="0.5" value={employeeHoursForm.expected_hours} onChange={(event) => setEmployeeHoursForm((current) => ({ ...current, expected_hours: event.target.value }))} className={inputClassName} />
                                                </Field>
                                            </div>
                                            <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-500">This target is used before attendance falls back to the company daily target.</p>
                                            {canEmployeeManage ? <button disabled={updateEmployee.isPending || !employeeHoursForm.expected_hours} className="h-11 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-60">{updateEmployee.isPending ? "Saving..." : "Save contract hours"}</button> : <EmptyState title="Edit permission required" text="Employee create/manage permission is required to save contract hours." />}
                                        </form>

                                        <div className="grid content-start gap-3 rounded-[1.2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-cyan-700"><Clock3 size={20} /></div>
                                                <div>
                                                    <h3 className="font-black text-slate-950">Dated shift</h3>
                                                    <p className="mt-1 text-sm font-medium text-slate-500">Plan a date-specific expected start, end, and break.</p>
                                                </div>
                                            </div>
                                            {canShiftManage ? (
                                                <form
                                                    className="grid gap-3"
                                                    onSubmit={(event) => {
                                                        event.preventDefault();
                                                        const mutation = editingShiftId ? updateShift : createShift;
                                                        confirm({ title: editingShiftId ? "Update dated shift?" : "Assign dated shift?", body: `The schedule for ${employeeLabel(selectedRuleEmployee)} will be used by attendance on that date.`, label: editingShiftId ? "Update shift" : "Assign shift", onConfirm: () => mutation.mutate(editingShiftId ? { id: editingShiftId, data: shiftPayload() } : shiftPayload(), {
                                                            onSuccess: () => {
                                                                finishConfirmed(editingShiftId ? "Shift updated" : "Shift assigned", [["attendance", "shifts"]], () => {
                                                                    setShiftForm(shiftInitial);
                                                                    setEditingShiftId("");
                                                                });
                                                            },
                                                            onError: (error) => toast.error(error.message || "Unable to save shift"),
                                                        }) });
                                                    }}
                                                >
                                                    <input required placeholder="Shift name e.g. Morning" value={shiftForm.name} onChange={(event) => setShiftForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <Field label="Start"><input required type="datetime-local" value={shiftForm.start_at} onChange={(event) => setShiftForm((current) => ({ ...current, start_at: event.target.value }))} className={inputClassName} /></Field>
                                                        <Field label="End"><input required type="datetime-local" value={shiftForm.end_at} onChange={(event) => setShiftForm((current) => ({ ...current, end_at: event.target.value }))} className={inputClassName} /></Field>
                                                    </div>
                                                    <Field label="Planned break minutes"><input type="number" min="0" max="600" value={shiftForm.break_minutes} onChange={(event) => setShiftForm((current) => ({ ...current, break_minutes: event.target.value }))} className={inputClassName} /></Field>
                                                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                                        <button disabled={createShift.isPending || updateShift.isPending} className="h-11 rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-60">{editingShiftId ? "Update shift" : "Assign shift"}</button>
                                                        {editingShiftId && <button type="button" onClick={() => { setEditingShiftId(""); setShiftForm(shiftInitial); }} className="h-11 rounded-xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                                    </div>
                                                </form>
                                            ) : <EmptyState title="Shift permission required" text="Attendance shift permission is required to assign a dated shift." />}
                                            <div className="max-h-56 space-y-2 overflow-auto">
                                                {(shiftRows.data?.data || []).map((item) => (
                                                    <div key={item.id} className="flex gap-2 rounded-2xl bg-white px-3 py-2 text-sm">
                                                        <div className="min-w-0 flex-1">
                                                            <b className="block text-slate-950">{item.name}</b>
                                                            <span className="font-bold text-slate-500">{formatDateTime(item.start_at)} - {formatDateTime(item.end_at)} · {item.break_minutes || 0}m break</span>
                                                        </div>
                                                        <div className="flex shrink-0 items-start gap-1">
                                                            <button type="button" title="Edit shift" onClick={() => startShiftEdit(item)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                                                            <button type="button" title="Delete shift" onClick={() => confirm({ title: "Delete dated shift?", body: `${item.name} will no longer define the attendance schedule for this date.`, label: "Delete shift", tone: "danger", onConfirm: () => deleteShift.mutate(String(item.id), { onSuccess: () => finishConfirmed("Shift deleted", [["attendance", "shifts"]]), onError: (error) => toast.error(error.message || "Unable to delete shift") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {!shiftRows.isLoading && !(shiftRows.data?.data || []).length && <p className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-bold text-slate-500">No dated shifts assigned yet.</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === "leave" && (
                    <div className="grid gap-5 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Leave rules</h2>
                                <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">Set request behavior, leave types, contract entitlements, and employee exceptions from one rules area.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm font-black text-slate-600">
                                <span className="rounded-xl bg-blue-50 px-3 py-2">{leaveTypeRows.length} types</span>
                                <span className="rounded-xl bg-emerald-50 px-3 py-2">{entitlementPolicyRows.length} policies</span>
                                <span className="rounded-xl bg-amber-50 px-3 py-2">{entitlementGrantRows.length} grants</span>
                            </div>
                        </div>

                        {!canLeaveConfigure && <EmptyState title="Access required" text="Leave configuration needs leave policy permission." />}
                        {canLeaveConfigure && (
                            <>
                                <div className="grid gap-5 xl:grid-cols-2">
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            const payload = { ...leaveTypeForm, entitlement_days: leaveTypeForm.entitlement_days === "" ? null : Number(leaveTypeForm.entitlement_days) };
                                            const mutation = editingLeaveTypeId ? updateLeaveType : createLeaveType;
                                            confirm({ title: editingLeaveTypeId ? "Update leave type?" : "Add leave type?", body: "Employees will see active leave types in the leave request flow.", label: editingLeaveTypeId ? "Update type" : "Add type", onConfirm: () => mutation.mutate(editingLeaveTypeId ? { id: editingLeaveTypeId, data: payload } : payload, {
                                                onSuccess: () => {
                                                    finishConfirmed("Leave type saved", [["leave"]], () => {
                                                        setLeaveTypeForm(leaveTypeInitial);
                                                        setEditingLeaveTypeId("");
                                                    });
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to save leave type"),
                                            }) });
                                        }}
                                        className="grid content-start gap-3 rounded-[1.2rem] border border-blue-100 bg-slate-50/75 p-4"
                                    >
                                        <div>
                                            <h3 className="font-black text-slate-950">Leave types</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Define what an employee can request.</p>
                                        </div>
                                        <input required placeholder="Name e.g. Vacation Leave" value={leaveTypeForm.name} onChange={(event) => setLeaveTypeForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                                        <input type="number" min="0" step="0.5" placeholder="Fallback entitlement, blank for unlimited" value={leaveTypeForm.entitlement_days} onChange={(event) => setLeaveTypeForm((current) => ({ ...current, entitlement_days: event.target.value }))} className={inputClassName} />
                                        {[
                                            ["paid", "Paid"],
                                            ["attachment_required", "Evidence recommended"],
                                            ["active", "Active"],
                                        ].map(([key, label]) => (
                                            <label key={key} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <input type="checkbox" checked={Boolean(leaveTypeForm[key])} onChange={(event) => setLeaveTypeForm((current) => ({ ...current, [key]: event.target.checked }))} />
                                                {label}
                                            </label>
                                        ))}
                                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                            <button disabled={createLeaveType.isPending || updateLeaveType.isPending} className="h-11 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-60">{editingLeaveTypeId ? "Update type" : "Save type"}</button>
                                            {editingLeaveTypeId && <button type="button" onClick={() => { setEditingLeaveTypeId(""); setLeaveTypeForm(leaveTypeInitial); }} className="h-11 rounded-xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                        </div>
                                        <div className="max-h-52 space-y-2 overflow-auto">
                                            {leaveTypeRows.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700"><span className="min-w-0 flex-1">{item.name} · {days(item.entitlement_days)} {item.active ? "" : "· Inactive"}</span><button type="button" title="Edit leave type" onClick={() => startLeaveTypeEdit(item)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button><button type="button" title="Archive leave type" onClick={() => confirm({ title: "Archive leave type?", body: `${item.name} will stop appearing for new leave requests. Existing records stay available.`, label: "Archive type", tone: "danger", onConfirm: () => deleteLeaveType.mutate(String(item.id), { onSuccess: () => finishConfirmed("Leave type archived", [["leave"]]), onError: (error) => toast.error(error.message || "Unable to archive leave type") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></div>)}
                                        </div>
                                    </form>

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            confirm({ title: "Save leave request policy?", body: "Leave counting and review behavior will update for new leave requests.", label: "Save policy", onConfirm: () => updateLeavePolicy.mutate(leavePolicyForm, {
                                                onSuccess: () => {
                                                    finishConfirmed("Leave policy saved", [["leave", "policy"]], () => setLeavePolicyDraft(null));
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to save leave policy"),
                                            }) });
                                        }}
                                        className="grid h-fit gap-3 rounded-[1.2rem] border border-blue-100 bg-white p-4"
                                    >
                                        <div>
                                            <h3 className="font-black text-slate-950">Request policy</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Controls how leave days are counted and how many review levels are used.</p>
                                        </div>
                                        {leavePolicyForm && (
                                            <>
                                                <Field label="Approval levels">
                                                    <input type="number" min="1" max="4" value={leavePolicyForm.approval_levels ?? ""} onChange={(event) => setLeavePolicyDraft((current) => ({ ...(current || leavePolicyForm), approval_levels: Number(event.target.value) }))} className={inputClassName} />
                                                </Field>
                                                {[
                                                    ["count_weekends", "Count Saturday/Sunday as leave days"],
                                                    ["allow_negative_balance", "Allow negative balance"],
                                                    ["half_day_enabled", "Allow half-day"],
                                                ].map(([key, label]) => (
                                                    <label key={key} className="inline-flex items-center gap-2 rounded-2xl bg-blue-50/55 px-3 py-2 text-sm font-bold text-slate-700">
                                                        <input type="checkbox" checked={Boolean(leavePolicyForm[key])} onChange={(event) => setLeavePolicyDraft((current) => ({ ...(current || leavePolicyForm), [key]: event.target.checked }))} />
                                                        {label}
                                                    </label>
                                                ))}
                                                <button disabled={updateLeavePolicy.isPending} className="h-11 rounded-xl border border-blue-100 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:opacity-60">Save request policy</button>
                                            </>
                                        )}
                                    </form>
                                </div>

                                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)]">
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            const payload = {
                                                ...entitlementPolicyForm,
                                                contract_type: entitlementPolicyForm.contract_type.trim() || null,
                                                employment_type: entitlementPolicyForm.employment_type.trim() || null,
                                                entitlement_days: Number(entitlementPolicyForm.entitlement_days),
                                                priority: Number(entitlementPolicyForm.priority),
                                            };
                                            const mutation = editingEntitlementPolicyId ? updateEntitlementPolicy : createEntitlementPolicy;
                                            confirm({ title: editingEntitlementPolicyId ? "Update entitlement policy?" : "Add entitlement policy?", body: "Contract matching can create leave grants for employees when their balance is resolved.", label: editingEntitlementPolicyId ? "Update policy" : "Add policy", onConfirm: () => mutation.mutate(editingEntitlementPolicyId ? { id: editingEntitlementPolicyId, data: payload } : payload, {
                                                onSuccess: () => {
                                                    finishConfirmed("Entitlement policy saved", [["leave"]], () => {
                                                        setEntitlementPolicyForm(entitlementPolicyInitial);
                                                        setEditingEntitlementPolicyId("");
                                                    });
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to save entitlement policy"),
                                            }) });
                                        }}
                                        className="grid content-start gap-3 rounded-[1.2rem] border border-blue-100 bg-white p-4"
                                    >
                                        <div>
                                            <h3 className="font-black text-slate-950">Entitlement policies</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Use contract and work arrangement matches for interns, temporary staff, part-time, and full-time employees.</p>
                                        </div>
                                        <Field label="Leave type">
                                            <select required value={entitlementPolicyForm.leave_type_id} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, leave_type_id: event.target.value }))} className={inputClassName}>
                                                <option value="">Select leave type</option>
                                                {activeLeaveTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                            </select>
                                        </Field>
                                        <input required placeholder="Policy name e.g. Full-time vacation" value={entitlementPolicyForm.name} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Contract match">
                                                <>
                                                    <input list="rules-contract-values" placeholder="Any contract" value={entitlementPolicyForm.contract_type} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, contract_type: event.target.value }))} className={inputClassName} />
                                                    <datalist id="rules-contract-values">{contractValues.map((item) => <option key={item} value={item}>{display(item)}</option>)}</datalist>
                                                </>
                                            </Field>
                                            <Field label="Work arrangement">
                                                <>
                                                    <input list="rules-employment-values" placeholder="Any arrangement" value={entitlementPolicyForm.employment_type} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, employment_type: event.target.value }))} className={inputClassName} />
                                                    <datalist id="rules-employment-values">{employmentValues.map((item) => <option key={item} value={item}>{display(item)}</option>)}</datalist>
                                                </>
                                            </Field>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Field label="Entitlement days"><input required type="number" min="0" step="0.5" value={entitlementPolicyForm.entitlement_days} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, entitlement_days: event.target.value }))} className={inputClassName} /></Field>
                                            <Field label="Priority"><input required type="number" min="1" max="1000" value={entitlementPolicyForm.priority} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, priority: event.target.value }))} className={inputClassName} /></Field>
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={entitlementPolicyForm.active} onChange={(event) => setEntitlementPolicyForm((current) => ({ ...current, active: event.target.checked }))} />Active</label>
                                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                            <button disabled={!entitlementPolicyForm.leave_type_id || createEntitlementPolicy.isPending || updateEntitlementPolicy.isPending} className="h-11 rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-60">{editingEntitlementPolicyId ? "Update entitlement policy" : "Save entitlement policy"}</button>
                                            {editingEntitlementPolicyId && <button type="button" onClick={() => { setEditingEntitlementPolicyId(""); setEntitlementPolicyForm(entitlementPolicyInitial); }} className="h-11 rounded-xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-auto">
                                            {entitlementPolicyRows.map((item) => <div key={item.id} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="grid min-w-0 flex-1 gap-1"><b>{item.name}</b><span className="font-bold text-slate-500">{item.leave_type.name} · {days(item.entitlement_days)} · {item.contract_type ? display(item.contract_type) : "Any contract"} · {item.employment_type ? display(item.employment_type) : "Any arrangement"}</span></div><div className="flex gap-1"><button type="button" title="Edit entitlement policy" onClick={() => startEntitlementPolicyEdit(item)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button><button type="button" title="Archive entitlement policy" onClick={() => confirm({ title: "Archive entitlement policy?", body: `${item.name} will stop generating future policy-based leave grants.`, label: "Archive policy", tone: "danger", onConfirm: () => deleteEntitlementPolicy.mutate(String(item.id), { onSuccess: () => finishConfirmed("Entitlement policy archived", [["leave"]]), onError: (error) => toast.error(error.message || "Unable to archive entitlement policy") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></div></div>)}
                                        </div>
                                    </form>

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            const year = new Date().getFullYear();
                                            const payload = {
                                                ...entitlementGrantForm,
                                                year,
                                                entitlement_days: Number(entitlementGrantForm.entitlement_days),
                                                note: entitlementGrantForm.note.trim() || null,
                                                employee_snapshot: grantEmployee && {
                                                    first_name: grantEmployee.first_name,
                                                    last_name: grantEmployee.last_name,
                                                    email: grantEmployee.email,
                                                    employee_code: grantEmployee.employee_code,
                                                    contract_type: grantEmployee.contract_type,
                                                    employment_type: grantEmployee.employment_type,
                                                },
                                            };
                                            const mutation = editingEntitlementGrantId ? updateEntitlementGrant : createEntitlementGrant;
                                            confirm({ title: editingEntitlementGrantId ? "Update employee grant?" : "Save employee grant?", body: "This employee-specific entitlement overrides matching policy entitlement for the leave type and year.", label: editingEntitlementGrantId ? "Update grant" : "Save grant", onConfirm: () => mutation.mutate(editingEntitlementGrantId ? { id: editingEntitlementGrantId, data: payload } : payload, {
                                                onSuccess: () => {
                                                    finishConfirmed("Employee entitlement saved", [["leave"]], () => {
                                                        setEntitlementGrantForm(entitlementGrantInitial);
                                                        setEditingEntitlementGrantId("");
                                                    });
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to save employee entitlement"),
                                            }) });
                                        }}
                                        className="grid content-start gap-3 rounded-[1.2rem] border border-blue-100 bg-blue-50/60 p-4"
                                    >
                                        <div>
                                            <h3 className="font-black text-slate-950">Employee override or grant</h3>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Use this when a policy does not fit one employee.</p>
                                        </div>
                                        <Field label="Employee">
                                            <select required value={entitlementGrantForm.user_id} onChange={(event) => setEntitlementGrantForm((current) => ({ ...current, user_id: event.target.value }))} className={inputClassName}>
                                                <option value="">Select employee</option>
                                                {employeeRows.map((item) => <option key={item.id} value={item.id}>{employeeLabel(item)}</option>)}
                                            </select>
                                        </Field>
                                        {grantEmployee && <p className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-500">{display(grantEmployee.contract_type) || "No contract"} · {display(grantEmployee.employment_type) || "No arrangement"}</p>}
                                        <Field label="Leave type">
                                            <select required value={entitlementGrantForm.leave_type_id} onChange={(event) => setEntitlementGrantForm((current) => ({ ...current, leave_type_id: event.target.value }))} className={inputClassName}>
                                                <option value="">Select leave type</option>
                                                {activeLeaveTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label={`Entitlement days for ${new Date().getFullYear()}`}><input required type="number" min="0" step="0.5" value={entitlementGrantForm.entitlement_days} onChange={(event) => setEntitlementGrantForm((current) => ({ ...current, entitlement_days: event.target.value }))} className={inputClassName} /></Field>
                                        <Field label="Admin note"><textarea rows={2} value={entitlementGrantForm.note} onChange={(event) => setEntitlementGrantForm((current) => ({ ...current, note: event.target.value }))} className={`${inputClassName} h-auto py-3`} /></Field>
                                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                            <button disabled={!entitlementGrantForm.user_id || !entitlementGrantForm.leave_type_id || createEntitlementGrant.isPending || updateEntitlementGrant.isPending} className="h-11 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-60">{editingEntitlementGrantId ? "Update employee grant" : "Save employee grant"}</button>
                                            {editingEntitlementGrantId && <button type="button" onClick={() => { setEditingEntitlementGrantId(""); setEntitlementGrantForm(entitlementGrantInitial); }} className="h-11 rounded-xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                        </div>
                                        <div className="max-h-64 space-y-2 overflow-auto">
                                            {entitlementGrantRows.slice(0, 8).map((item) => <div key={item.id} className="flex gap-2 rounded-xl bg-white px-3 py-2 text-sm"><div className="grid min-w-0 flex-1 gap-1"><b>{employeeLabel(item.employee_snapshot)} · {item.leave_type.name}</b><span className="font-bold text-slate-500">{days(item.entitlement_days)} · {display(item.source)} · {item.year}</span></div><div className="flex gap-1"><button type="button" title="Edit employee grant" onClick={() => startEntitlementGrantEdit(item)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button><button type="button" title="Delete employee grant" onClick={() => confirm({ title: "Delete employee grant?", body: "The employee entitlement override will be removed for this leave type and year.", label: "Delete grant", tone: "danger", onConfirm: () => deleteEntitlementGrant.mutate(String(item.id), { onSuccess: () => finishConfirmed("Employee grant deleted", [["leave"]]), onError: (error) => toast.error(error.message || "Unable to delete employee grant") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button></div></div>)}
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === "holidays" && (
                    <div className="grid gap-5 p-5 xl:grid-cols-[minmax(20rem,.95fr)_minmax(0,1.05fr)]">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Holiday calendar setup</h2>
                            <p className="mt-1 text-sm font-medium text-slate-500">Import by country, federal state, and year. Add company-specific dates beside public holidays.</p>
                            {!canHoliday && <div className="mt-4"><EmptyState title="Access required" text="Holiday calendar management needs attendance holiday permission." /></div>}
                            {canHoliday && (
                                <div className="mt-4 space-y-4">
                                    <form
                                        className="grid gap-3 sm:grid-cols-[.65fr_1fr_.8fr] xl:grid-cols-1 2xl:grid-cols-[.65fr_1fr_.8fr]"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            confirm({ title: "Import public holidays?", body: "Configured dates will be upserted for the selected country, federal state, and year.", label: "Import holidays", onConfirm: () => importHolidays.mutate({ ...importForm, state_code: importForm.state_code || defaultStateCode, year: Number(importForm.year) }, {
                                                onSuccess: (response) => {
                                                    finishConfirmed(response.message || "Holidays imported", [["attendance", "holidays"]]);
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to import holidays"),
                                            }) });
                                        }}
                                    >
                                        <input required placeholder="Country e.g. DE" value={importForm.country_code} onChange={(event) => setImportForm((current) => ({ ...current, country_code: event.target.value.toUpperCase() }))} className={inputClassName} />
                                        <input required placeholder="Federal state e.g. DE-BE" value={importForm.state_code || defaultStateCode} onChange={(event) => setImportForm((current) => ({ ...current, state_code: event.target.value.toUpperCase() }))} className={inputClassName} />
                                        <input required type="number" min="1970" max="2100" value={importForm.year} onChange={(event) => setImportForm((current) => ({ ...current, year: event.target.value }))} className={inputClassName} />
                                        <button disabled={importHolidays.isPending} className="h-12 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 sm:col-span-3 xl:col-span-1 2xl:col-span-3">{importHolidays.isPending ? "Importing..." : "Import public holidays"}</button>
                                    </form>
                                    <form
                                        className="grid gap-3 sm:grid-cols-2"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            const payload = { ...holidayForm, state_code: holidayForm.state_code || defaultStateCode };
                                            const mutation = editingHolidayId ? updateHoliday : createHoliday;
                                            confirm({ title: editingHolidayId ? "Update holiday?" : "Add manual holiday?", body: "This date will be available to calendars and leave day calculations.", label: editingHolidayId ? "Update holiday" : "Add holiday", onConfirm: () => mutation.mutate(editingHolidayId ? { id: editingHolidayId, data: payload } : payload, {
                                                onSuccess: () => {
                                                    finishConfirmed("Holiday saved", [["attendance", "holidays"]], () => {
                                                        setHolidayForm({ ...holidayInitial, state_code: importForm.state_code || defaultStateCode });
                                                        setEditingHolidayId("");
                                                    });
                                                },
                                                onError: (error) => toast.error(error.message || "Unable to save holiday"),
                                            }) });
                                        }}
                                    >
                                        <input required placeholder="Holiday name" value={holidayForm.name} onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                                        <input required type="date" value={holidayForm.holiday_date} onChange={(event) => setHolidayForm((current) => ({ ...current, holiday_date: event.target.value }))} className={inputClassName} />
                                        <input required placeholder="Federal state e.g. DE-BE" value={holidayForm.state_code || defaultStateCode} onChange={(event) => setHolidayForm((current) => ({ ...current, state_code: event.target.value.toUpperCase() }))} className={inputClassName} />
                                        <select value={holidayForm.category} onChange={(event) => setHolidayForm((current) => ({ ...current, category: event.target.value }))} className={inputClassName}>
                                            <option value="public">Public holiday</option>
                                            <option value="company">Company holiday</option>
                                        </select>
                                        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_auto]">
                                            <button disabled={createHoliday.isPending || updateHoliday.isPending} className="h-12 rounded-2xl border border-blue-100 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:opacity-60">{editingHolidayId ? "Update holiday" : "Add manual holiday"}</button>
                                            {editingHolidayId && <button type="button" onClick={() => { setEditingHolidayId(""); setHolidayForm({ ...holidayInitial, state_code: importForm.state_code || defaultStateCode }); }} className="h-12 rounded-2xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                        <div className="overflow-hidden rounded-[1.2rem] border border-blue-100 bg-slate-50/70">
                            <div className="border-b border-blue-100 px-4 py-3">
                                <h3 className="font-black text-slate-950">Configured dates</h3>
                            </div>
                            <div className="max-h-[34rem] space-y-2 overflow-auto p-3">
                                {holidayRows.map((holiday) => (
                                    <div key={holiday.id} className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <span className="text-sm font-black text-slate-900">{holiday.name}</span>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">{holiday.state_code} · {holiday.category}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-500">{formatDate(holiday.holiday_date)}</span>
                                            {canHoliday && <button type="button" title="Edit holiday" onClick={() => startHolidayEdit(holiday)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>}
                                            {canHoliday && <button type="button" title="Delete holiday" onClick={() => confirm({ title: "Delete holiday?", body: `${holiday.name} will be removed from the configured calendar.`, label: "Delete holiday", tone: "danger", onConfirm: () => deleteHoliday.mutate(String(holiday.id), { onSuccess: () => finishConfirmed("Holiday deleted", [["attendance", "holidays"]]), onError: (error) => toast.error(error.message || "Unable to delete holiday") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                ))}
                                {!holidayRows.length && <EmptyState title="No holidays" text="Configured public and company holidays appear here." />}
                            </div>
                        </div>
                    </div>
                )}

                {tab === "locations" && (
                    <div className="grid gap-5 p-5 xl:grid-cols-[minmax(20rem,.85fr)_minmax(0,1.15fr)]">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Mobile {branchLabel.toLowerCase()} controls</h2>
                            <p className="mt-1 text-sm font-medium text-slate-500">Define {branchLabel.toLowerCase()} circles used when the policy requires mobile clock-ins near an approved location.</p>
                            {!canGeofence && <div className="mt-4"><EmptyState title="Access required" text="Geofence management needs attendance geofence permission." /></div>}
                            {canGeofence && (
                                <form
                                    className="mt-4 grid gap-3 sm:grid-cols-2"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        const payload = {
                                            ...geofenceForm,
                                            latitude: Number(geofenceForm.latitude),
                                            longitude: Number(geofenceForm.longitude),
                                        };
                                        const mutation = editingGeofenceId ? updateGeofence : createGeofence;
                                        confirm({ title: editingGeofenceId ? "Update geofence?" : "Add geofence?", body: `Mobile location checks can use this ${branchLabel.toLowerCase()} radius when geofence enforcement is enabled.`, label: editingGeofenceId ? "Update geofence" : "Add geofence", onConfirm: () => mutation.mutate(editingGeofenceId ? { id: editingGeofenceId, data: payload } : payload, {
                                            onSuccess: () => {
                                                finishConfirmed(editingGeofenceId ? "Geofence updated" : "Geofence created", [["attendance", "geofences"]], () => {
                                                    setGeofenceForm(geofenceInitial);
                                                    setEditingGeofenceId("");
                                                });
                                            },
                                            onError: (error) => toast.error(error.message || "Unable to save geofence"),
                                        }) });
                                    }}
                                >
                                    <input required placeholder={`${branchLabel} name`} value={geofenceForm.name} onChange={(event) => setGeofenceForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} />
                                    <input type="number" min="25" value={geofenceForm.radius_meters} onChange={(event) => setGeofenceForm((current) => ({ ...current, radius_meters: Number(event.target.value) }))} className={inputClassName} />
                                    <input required placeholder="Latitude" value={geofenceForm.latitude} onChange={(event) => setGeofenceForm((current) => ({ ...current, latitude: event.target.value }))} className={inputClassName} />
                                    <input required placeholder="Longitude" value={geofenceForm.longitude} onChange={(event) => setGeofenceForm((current) => ({ ...current, longitude: event.target.value }))} className={inputClassName} />
                                    <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_auto]">
                                        <button disabled={createGeofence.isPending || updateGeofence.isPending} className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{editingGeofenceId ? "Update geofence" : "Add geofence"}</button>
                                        {editingGeofenceId && <button type="button" onClick={() => { setEditingGeofenceId(""); setGeofenceForm(geofenceInitial); }} className="h-12 rounded-2xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                                    </div>
                                </form>
                            )}
                        </div>
                        <div className="grid content-start gap-3 md:grid-cols-2">
                            {geofenceRows.map((item) => (
                                <div key={item.id} className="rounded-[1.2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-cyan-700"><MapPinned size={18} /></div>
                                        <div>
                                            <p className="text-sm font-black text-slate-950">{item.name}</p>
                                            <p className="text-xs font-bold text-slate-500">{item.radius_meters} m radius</p>
                                        </div>
                                        <div className="ml-auto flex gap-1">
                                            <button type="button" title="Edit geofence" onClick={() => startGeofenceEdit(item)} className="grid h-8 w-8 place-items-center rounded-xl border border-blue-100 bg-white text-blue-600 hover:bg-blue-50"><Pencil size={14} /></button>
                                            <button type="button" title="Delete geofence" onClick={() => confirm({ title: "Delete geofence?", body: `${item.name} will stop being available for mobile ${branchLabel.toLowerCase()} checks.`, label: "Delete geofence", tone: "danger", onConfirm: () => deleteGeofence.mutate(String(item.id), { onSuccess: () => finishConfirmed("Geofence deleted", [["attendance", "geofences"]]), onError: (error) => toast.error(error.message || "Unable to delete geofence") }) })} className="grid h-8 w-8 place-items-center rounded-xl border border-red-100 bg-white text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!geofenceRows.length && <div className="md:col-span-2"><EmptyState title="No geofences" text={`${branchLabel} geofence rules appear here.`} /></div>}
                        </div>
                    </div>
                )}

                {tab === "audit" && (
                    <div className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ScrollText size={20} /></div>
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Audit trail</h2>
                                <p className="mt-1 text-sm font-medium text-slate-500">Recent company attendance changes and policy activity.</p>
                            </div>
                        </div>
                        {!canCompany && <div className="mt-4"><EmptyState title="Access required" text="Company attendance permission is required to read audit history." /></div>}
                        {canCompany && (
                            <div className="mt-5 max-h-[38rem] divide-y divide-blue-100 overflow-auto rounded-[1.2rem] border border-blue-100 bg-slate-50/55 px-4">
                                {auditRows.map((item) => (
                                    <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                        <p className="text-sm font-black text-slate-900">{item.action || item.event_type || "Attendance event"}</p>
                                        <p className="text-sm font-medium text-slate-500">{formatDateTime(item.created_at)}</p>
                                    </div>
                                ))}
                                {!auditRows.length && <EmptyState title="No audit entries" text="Policy and attendance activity will be logged here." />}
                            </div>
                        )}
                    </div>
                )}
            </Surface>
            <ConfirmModal action={pendingConfirm} busy={isConfirmBusy} onClose={() => setPendingConfirm(null)} />
        </div>
    );
}
