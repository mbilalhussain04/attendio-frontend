import React, { useMemo, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { usePermissionsQuery, useSetUserPermissionOverridesMutation } from "../../hooks/useAuthService";
import { useEmployeesQuery } from "../../hooks/useEmployeeService";
import { getInitials } from "../../utils";

const employeeName = (employee) => [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || employee?.email || "Employee";
const employeeRole = (employee) => employee?.job_title || employee?.role_name || employee?.role_key || "Employee";
const employeeAvatar = (employee) => employee?.profile_picture || employee?.avatar_url || employee?.profile_picture_url;
const permissionNames = {
    "schedule.view_self": "View own schedule",
    "schedule.view_team": "View team schedules",
    "schedule.view_company": "View all company schedules",
    "schedule.manage": "Create, edit, and delete shifts",
    "meetings.view_self": "View own meetings",
    "meetings.view_team": "View team meetings",
    "meetings.view_company": "View all company meetings",
    "meetings.manage": "Create, edit, and delete meetings",
};
const permissionLabel = (key = "") => permissionNames[key] || key.split(".").map((part) => part.replaceAll("_", " ")).join(" / ");
const permissionGroup = (key = "") => key.split(".")[0] || "other";
const accessSections = [
    {
        title: "Scheduling access",
        description: "Control whether this employee can see only their shifts, team shifts, all shifts, or manage shifts.",
        keys: ["schedule.view_self", "schedule.view_team", "schedule.view_company", "schedule.manage"],
    },
    {
        title: "Meetings access",
        description: "Meetings are separate from shifts, with their own visibility and manage controls.",
        keys: ["meetings.view_self", "meetings.view_team", "meetings.view_company", "meetings.manage"],
    },
];
const quickAccessPermissionKeys = new Set(accessSections.flatMap((section) => section.keys));

function EmployeeChipPicker({ employees, selectedId, onSelect }) {
    const [query, setQuery] = useState("");
    const selected = employees.find((employee) => String(employee.id) === String(selectedId));
    const filtered = employees.filter((employee) => `${employeeName(employee)} ${employeeRole(employee)} ${employee.employee_code || ""} ${employee.email || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

    return (
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.2rem] border border-blue-100 bg-white p-4 shadow-lg shadow-blue-500/5">
            <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UsersRound size={19} /></div>
                <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Employee</p>
                    <h2 className="text-lg font-black text-slate-950">Select profile</h2>
                </div>
            </div>
            <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search employee"
                    className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                {filtered.map((employee) => {
                    const active = String(employee.id) === String(selectedId);
                    return (
                        <button
                            key={employee.id}
                            type="button"
                            onClick={() => onSelect(String(employee.id))}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${active ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-blue-100 bg-slate-50 hover:bg-blue-50"}`}
                        >
                            <Avatar className="h-11 w-11 shrink-0">
                                <AvatarImage src={employeeAvatar(employee)} alt={employeeName(employee)} />
                                <AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeName(employee))}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0">
                                <b className="block truncate text-sm">{employeeName(employee)}</b>
                                <span className={`block truncate text-xs font-bold ${active ? "text-blue-100" : "text-slate-500"}`}>{employeeRole(employee)}</span>
                                <span className={`block truncate text-xs font-black ${active ? "text-blue-100" : "text-slate-400"}`}>{employee.employee_code || employee.email}</span>
                            </span>
                        </button>
                    );
                })}
                {!filtered.length && <p className="rounded-2xl border border-dashed border-blue-100 p-5 text-center text-sm font-bold text-slate-500">No employee found.</p>}
            </div>
            {selected && (
                <div className="mt-4 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-700">
                    Editing access for {employeeName(selected)}. Role permissions stay role-based; switches below create employee-specific overrides.
                </div>
            )}
        </div>
    );
}

function Switch({ enabled, disabled, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-blue-600" : "bg-slate-200"}`}
        >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} />
        </button>
    );
}

export default function AuthApiConsole() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [permissionQuery, setPermissionQuery] = useState("");
    const employees = useEmployeesQuery({ limit: 200, offset: 0 });
    const permissions = usePermissionsQuery();
    const setOverrides = useSetUserPermissionOverridesMutation();
    const employeeRows = employees.data?.data || [];
    const permissionRows = permissions.data?.data || [];
    const selectedEmployee = employeeRows.find((employee) => String(employee.id) === String(selectedEmployeeId)) || employeeRows[0];
    const rolePermissions = useMemo(() => new Set(selectedEmployee?.role_permissions || []), [selectedEmployee]);
    const allowSet = useMemo(() => new Set(selectedEmployee?.permission_overrides?.allow || []), [selectedEmployee]);
    const denySet = useMemo(() => new Set(selectedEmployee?.permission_overrides?.deny || []), [selectedEmployee]);
    const effectiveSet = useMemo(() => new Set(selectedEmployee?.permissions || []), [selectedEmployee]);

    React.useEffect(() => {
        if (!selectedEmployeeId && employeeRows[0]?.id) setSelectedEmployeeId(String(employeeRows[0].id));
    }, [employeeRows, selectedEmployeeId]);

    const filteredPermissions = permissionRows.filter((permission) => {
        if (quickAccessPermissionKeys.has(permission.key)) return false;
        return `${permission.key || ""} ${permission.description || ""}`.toLowerCase().includes(permissionQuery.trim().toLowerCase());
    });
    const permissionsByKey = useMemo(() => new Map(permissionRows.map((permission) => [permission.key, permission])), [permissionRows]);
    const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
        const group = permissionGroup(permission.key);
        if (!groups[group]) groups[group] = [];
        groups[group].push(permission);
        return groups;
    }, {});

    const saveToggle = (permissionKey, nextEnabled) => {
        if (!selectedEmployee) return;
        const nextAllow = new Set(allowSet);
        const nextDeny = new Set(denySet);
        if (nextEnabled) {
            nextDeny.delete(permissionKey);
            if (!rolePermissions.has(permissionKey)) nextAllow.add(permissionKey);
        } else {
            nextAllow.delete(permissionKey);
            if (rolePermissions.has(permissionKey)) nextDeny.add(permissionKey);
        }
        setOverrides.mutate(
            { id: selectedEmployee.id, allow: [...nextAllow], deny: [...nextDeny] },
            {
                onSuccess: () => {
                    toast.success(nextEnabled ? "Permission enabled" : "Permission removed");
                    employees.refetch();
                },
                onError: (error) => toast.error(error.message || "Unable to update permission"),
            }
        );
    };

    return (
        <div className="h-[calc(100dvh-6rem)] min-h-0 min-w-0 overflow-hidden">
            <section className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(14rem,18rem)_minmax(0,1fr)] gap-4 overflow-hidden xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] xl:grid-rows-1">
                <EmployeeChipPicker employees={employeeRows} selectedId={selectedEmployee?.id} onSelect={setSelectedEmployeeId} />
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.2rem] border border-blue-100 bg-white p-4 text-left shadow-lg shadow-blue-500/5">
                    <div className="flex flex-col gap-3 border-b border-blue-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-14 w-14 shrink-0">
                                    <AvatarImage src={employeeAvatar(selectedEmployee)} alt={employeeName(selectedEmployee)} />
                                    <AvatarFallback className="bg-sky-500 text-sm font-black text-white">{getInitials(employeeName(selectedEmployee))}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h2 className="truncate text-xl font-black text-slate-950">{employeeName(selectedEmployee)}</h2>
                                    <p className="truncate text-sm font-bold text-slate-500">{employeeRole(selectedEmployee)} - {selectedEmployee?.employee_code || selectedEmployee?.email}</p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                                {effectiveSet.size} active permissions
                            </div>
                    </div>
                    <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={permissionQuery}
                                onChange={(event) => setPermissionQuery(event.target.value)}
                                placeholder="Search permissions"
                                className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                    </div>
                    <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-auto pr-1">
                            {accessSections.map((section) => {
                                const rows = section.keys.map((key) => permissionsByKey.get(key)).filter(Boolean);
                                if (!rows.length) return null;
                                return (
                                    <div key={section.title} className="rounded-2xl border border-blue-100 bg-blue-50/45 p-3">
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">{section.title}</p>
                                        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{section.description}</p>
                                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                                            {rows.map((permission) => {
                                                const key = permission.key;
                                                const enabled = effectiveSet.has(key) && !denySet.has(key);
                                                const fromRole = rolePermissions.has(key);
                                                const overridden = allowSet.has(key) || denySet.has(key);
                                                return (
                                                    <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-black text-slate-950">{permissionLabel(key)}</p>
                                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                                {fromRole && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">Role</span>}
                                                                {overridden && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Override</span>}
                                                            </div>
                                                        </div>
                                                        <Switch enabled={enabled} disabled={setOverrides.isPending || !selectedEmployee} onClick={() => saveToggle(key, !enabled)} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.entries(groupedPermissions).map(([group, rows]) => (
                                <div key={group} className="rounded-2xl border border-blue-100 bg-slate-50 p-3">
                                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-600">{group}</p>
                                    <div className="grid gap-2">
                                        {rows.map((permission) => {
                                            const key = permission.key;
                                            const enabled = effectiveSet.has(key) && !denySet.has(key);
                                            const fromRole = rolePermissions.has(key);
                                            const overridden = allowSet.has(key) || denySet.has(key);
                                            return (
                                                <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-slate-950">{permissionLabel(key)}</p>
                                                        <p className="truncate text-xs font-bold text-slate-500">{permission.description || key}</p>
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            {fromRole && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">Role</span>}
                                                            {overridden && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Override</span>}
                                                        </div>
                                                    </div>
                                                    <Switch enabled={enabled} disabled={setOverrides.isPending || !selectedEmployee} onClick={() => saveToggle(key, !enabled)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {!permissionRows.length && <p className="rounded-2xl border border-dashed border-blue-100 p-6 text-center text-sm font-bold text-slate-500">No permissions loaded.</p>}
                    </div>
                </div>
            </section>
        </div>
    );
}
