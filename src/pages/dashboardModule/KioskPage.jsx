import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Pencil, QrCode, RefreshCw, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context.jsx";
import { useSetKioskPinMutation } from "../../hooks/useAuthService.ts";
import { useDeleteKioskDeviceMutation, useCreateKioskDeviceMutation, useKioskDevicesQuery, useUpdateKioskDeviceMutation } from "../../hooks/useAttendanceService";
import { useEmployeesQuery } from "../../hooks/useEmployeeService.ts";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { getInitials } from "../../utils";
import { EmptyState, Field, PageHeading, hasPermission, inputClassName } from "./attendance-shared.jsx";

const initialDeviceForm = {
    name: "",
    unique_code: "",
    pin_required: true,
    qr_enabled: false,
    employee_number_enabled: true,
    restricted_mode: true,
    auto_logout_seconds: 30,
    status: "active",
};
const initialPinForm = { user_id: "", pin: "" };
const employeeName = (item) => [item?.first_name, item?.last_name].filter(Boolean).join(" ") || item?.email || "Employee";
const employeeRole = (item) => item?.job_title || item?.role_name || item?.role_key || item?.employee_code || "Employee";
const employeeAvatar = (item) => item?.profile_picture || item?.avatar_url || item?.profile_picture_url;
const generateDeviceCode = () => {
    const randomBytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(4));
    const suffix = randomBytes ? Array.from(randomBytes, (item) => item.toString(36).padStart(2, "0")).join("").slice(0, 7) : Math.random().toString(36).slice(2, 9);
    return `KIOSK-${suffix.toUpperCase()}`;
};
const kioskQrValue = (device, tenantSlug) => {
    const params = new URLSearchParams({ mode: "kiosk", device: device.unique_code });
    if (tenantSlug) params.set("tenant", tenantSlug);
    return `${window.location.origin}/sign-in?${params.toString()}`;
};

function ConfirmModal({ action, busy, onClose }) {
    if (!action) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${action.danger ? "text-red-600" : "text-blue-600"}`}>Confirm action</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{action.title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{action.body}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" disabled={busy} onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-60">Cancel</button>
                    <button type="button" disabled={busy} onClick={action.onConfirm} className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-60 ${action.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>{busy ? "Saving..." : action.label}</button>
                </div>
            </div>
        </div>
    );
}

export default function KioskPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const canManage = hasPermission(user, "attendance.kiosk_manage");
    const canSetPin = hasPermission(user, "users.reset_pin") || hasPermission(user, "settings.kiosk");
    const kiosks = useKioskDevicesQuery(canManage);
    const employees = useEmployeesQuery(canSetPin);
    const createKiosk = useCreateKioskDeviceMutation();
    const updateKiosk = useUpdateKioskDeviceMutation();
    const deleteKiosk = useDeleteKioskDeviceMutation();
    const setKioskPin = useSetKioskPinMutation();
    const [activePanel, setActivePanel] = useState(() => canManage ? "devices" : "pins");
    const [deviceForm, setDeviceForm] = useState(initialDeviceForm);
    const [pinForm, setPinForm] = useState(initialPinForm);
    const [editingDeviceId, setEditingDeviceId] = useState("");
    const [employeeQuery, setEmployeeQuery] = useState("");
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const [showPin, setShowPin] = useState(false);

    const employeeRows = useMemo(() => employees.data?.data || [], [employees.data?.data]);
    const visibleEmployees = useMemo(() => employeeRows.filter((item) => `${employeeName(item)} ${employeeRole(item)} ${item.employee_code || ""} ${item.email || ""}`.toLowerCase().includes(employeeQuery.trim().toLowerCase())), [employeeQuery, employeeRows]);
    const selectedEmployee = employeeRows.find((item) => String(item.id) === String(pinForm.user_id));
    const busy = createKiosk.isPending || updateKiosk.isPending || deleteKiosk.isPending || setKioskPin.isPending;
    const refreshDevices = () => queryClient.invalidateQueries({ queryKey: ["attendance", "kiosk", "devices"] });
    const finish = (message, after) => {
        setPendingConfirm(null);
        after?.();
        toast.success(message);
    };
    const confirm = (action) => setPendingConfirm(action);
    const submitDevice = (event) => {
        event.preventDefault();
        const mutation = editingDeviceId ? updateKiosk : createKiosk;
        confirm({
            title: editingDeviceId ? "Update kiosk device?" : "Register kiosk device?",
            body: "This shared device configuration will be available for kiosk attendance operations.",
            label: editingDeviceId ? "Update device" : "Register device",
            onConfirm: () => mutation.mutate(editingDeviceId ? { id: editingDeviceId, data: deviceForm } : deviceForm, {
                onSuccess: () => finish(editingDeviceId ? "Kiosk device updated" : "Kiosk device created", () => {
                    refreshDevices();
                    setEditingDeviceId("");
                    setDeviceForm(initialDeviceForm);
                }),
                onError: (error) => toast.error(error.message || "Unable to save kiosk device"),
            }),
        });
    };
    const startEdit = (device) => {
        setActivePanel("devices");
        setEditingDeviceId(String(device.id));
        setDeviceForm({
            name: device.name || "",
            unique_code: device.unique_code || "",
            pin_required: Boolean(device.pin_required),
            qr_enabled: Boolean(device.qr_enabled),
            employee_number_enabled: Boolean(device.employee_number_enabled),
            restricted_mode: Boolean(device.restricted_mode),
            auto_logout_seconds: device.auto_logout_seconds || 30,
            status: device.status || "active",
        });
    };
    const submitPin = (event) => {
        event.preventDefault();
        confirm({
            title: "Set kiosk PIN?",
            body: `${employeeName(selectedEmployee)} will use this PIN with the employee code on the kiosk sign-in screen.`,
            label: "Set PIN",
            onConfirm: () => setKioskPin.mutate(pinForm, {
                onSuccess: () => finish("Kiosk PIN saved", () => {
                    setPinForm(initialPinForm);
                    setShowPin(false);
                }),
                onError: (error) => toast.error(error.message || "Unable to save kiosk PIN"),
            }),
        });
    };

    if (!canManage && !canSetPin) {
        return (
            <div className="space-y-5">
                <PageHeading eyebrow="Kiosk" title="Kiosk controls" text="Shared clock-in setup is limited to authorized administrators." />
                <EmptyState title="Access required" text="Employee kiosk sessions use the Attendance page for check-in and check-out." />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageHeading eyebrow="Kiosk" title="Kiosk PINs and devices" text="Manage employee PIN access and optional shared terminal registrations." />

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.3rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4"><p className="text-xs font-bold text-slate-500">Devices</p><p className="mt-1 text-3xl font-black text-slate-950">{kiosks.data?.data?.length || 0}</p></div>
                <div className="rounded-[1.3rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><p className="text-xs font-bold text-slate-500">Active</p><p className="mt-1 text-3xl font-black text-slate-950">{(kiosks.data?.data || []).filter((item) => item.status === "active").length}</p></div>
                <div className="rounded-[1.3rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4"><p className="text-xs font-bold text-slate-500">Employee PINs</p><p className="mt-1 flex items-center gap-2 text-xl font-black text-slate-950"><KeyRound size={20} className="text-cyan-700" />{canSetPin ? "Managed here" : "Restricted"}</p></div>
            </section>

            <div className="flex flex-wrap gap-2 rounded-[1.3rem] border border-blue-100 bg-white/85 p-2 shadow-lg shadow-blue-500/5">
                {[
                    { key: "devices", label: "Devices", icon: Smartphone, show: canManage },
                    { key: "pins", label: "Employee PINs", icon: KeyRound, show: canSetPin },
                ].filter((item) => item.show).map((item) => {
                    const Icon = item.icon;
                    return <button key={item.key} type="button" onClick={() => setActivePanel(item.key)} className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black ${activePanel === item.key ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"}`}><Icon size={16} />{item.label}</button>;
                })}
            </div>

            {activePanel === "devices" && canManage && (
                <section className="grid min-h-0 gap-5 xl:grid-cols-[minmax(20rem,.82fr)_minmax(0,1.18fr)]">
                    <form onSubmit={submitDevice} className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Smartphone size={20} /></div>
                            <div><h2 className="text-lg font-black text-slate-950">{editingDeviceId ? "Edit device" : "Add device"}</h2><p className="mt-1 text-sm font-medium text-slate-500">Register the shared terminal configuration.</p></div>
                        </div>
                        <div className="mt-4 space-y-4">
                            <Field label="Device name"><input required value={deviceForm.name} onChange={(event) => setDeviceForm((current) => ({ ...current, name: event.target.value }))} className={inputClassName} placeholder="Reception kiosk" /></Field>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Unique code">
                                    <div className="flex gap-2">
                                        <input required value={deviceForm.unique_code} onChange={(event) => setDeviceForm((current) => ({ ...current, unique_code: event.target.value.toUpperCase() }))} className={inputClassName} placeholder="BERLIN-01" />
                                        <button type="button" onClick={() => setDeviceForm((current) => ({ ...current, unique_code: generateDeviceCode() }))} title="Generate code" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 hover:bg-blue-50"><RefreshCw size={16} /></button>
                                    </div>
                                </Field>
                                <Field label="Auto logout seconds"><input type="number" min="10" max="600" value={deviceForm.auto_logout_seconds} onChange={(event) => setDeviceForm((current) => ({ ...current, auto_logout_seconds: Number(event.target.value) }))} className={inputClassName} /></Field>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">{[
                                ["pin_required", "PIN required"],
                                ["qr_enabled", "QR enabled"],
                                ["employee_number_enabled", "Employee code"],
                                ["restricted_mode", "Restricted mode"],
                            ].map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-2xl bg-blue-50/60 px-4 py-3 text-sm font-black text-slate-700"><input type="checkbox" checked={deviceForm[key]} onChange={(event) => setDeviceForm((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                <button disabled={busy} className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{editingDeviceId ? "Update device" : "Create kiosk"}</button>
                                {editingDeviceId && <button type="button" onClick={() => { setEditingDeviceId(""); setDeviceForm(initialDeviceForm); }} className="h-12 rounded-2xl border border-blue-100 px-4 text-sm font-black text-slate-600">Cancel</button>}
                            </div>
                        </div>
                    </form>

                    <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <h2 className="text-lg font-black text-slate-950">Registered devices</h2>
                        <div className="mt-4 grid max-h-[min(36rem,calc(100dvh-18rem))] gap-3 overflow-auto pr-1 lg:grid-cols-2">
                            {(kiosks.data?.data || []).length === 0 && <div className="lg:col-span-2"><EmptyState title="No kiosk devices" text="Create the first shared attendance device." /></div>}
                            {(kiosks.data?.data || []).map((device) => (
                                <div key={device.id} className="rounded-[1.2rem] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/55 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-600"><Smartphone size={18} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-black text-slate-950">{device.name}</p>
                                            <p className="truncate text-sm font-medium text-slate-500">{device.unique_code}</p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${device.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{device.status}</span>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-slate-500">{[
                                        device.pin_required && "PIN",
                                        device.qr_enabled && "QR",
                                        device.employee_number_enabled && "Employee code",
                                        device.restricted_mode && "Restricted",
                                        `${device.auto_logout_seconds}s logout`,
                                    ].filter(Boolean).map((label) => <span key={label} className="rounded-xl bg-white px-2.5 py-1.5">{label}</span>)}</div>
                                    {device.qr_enabled && (
                                        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3">
                                            <div className="rounded-xl bg-white p-1.5 shadow-sm shadow-blue-500/10">
                                                <QRCodeSVG value={kioskQrValue(device, user?.company?.slug)} size={72} fgColor="#0f172a" bgColor="#ffffff" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-blue-600"><QrCode size={13} /> Kiosk QR</p>
                                                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">Opens this device kiosk sign-in link.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-4 flex justify-end gap-1">
                                        <button type="button" onClick={() => startEdit(device)} title="Edit device" className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-white text-blue-600 hover:bg-blue-50"><Pencil size={15} /></button>
                                        <button type="button" onClick={() => confirm({ title: "Delete kiosk device?", body: `${device.name} will be removed from the kiosk device registry.`, label: "Delete device", danger: true, onConfirm: () => deleteKiosk.mutate(String(device.id), { onSuccess: () => finish("Kiosk device deleted", refreshDevices), onError: (error) => toast.error(error.message || "Unable to delete kiosk device") }) })} title="Delete device" className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {activePanel === "pins" && canSetPin && (
                <section className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.72fr)]">
                    <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><UserRound size={20} /></div>
                            <div><h2 className="text-lg font-black text-slate-950">Select employee</h2><p className="mt-1 text-sm font-medium text-slate-500">Set or rotate the employee kiosk PIN.</p></div>
                        </div>
                        <input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Search employee, code, or role" className={`${inputClassName} mt-4`} />
                        <div className="mt-3 grid max-h-[min(34rem,calc(100dvh-20rem))] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                            {visibleEmployees.map((employee) => <button key={employee.id} type="button" onClick={() => setPinForm((current) => ({ ...current, user_id: String(employee.id) }))} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${String(pinForm.user_id) === String(employee.id) ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border-blue-100 bg-slate-50 hover:bg-blue-50"}`}><Avatar className="h-11 w-11 shrink-0"><AvatarImage src={employeeAvatar(employee)} alt={employeeName(employee)} /><AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeName(employee))}</AvatarFallback></Avatar><span className="min-w-0"><b className="block truncate text-sm">{employeeName(employee)}</b><span className={`block truncate text-xs font-bold ${String(pinForm.user_id) === String(employee.id) ? "text-blue-100" : "text-slate-500"}`}>{employee.employee_code || "No code"} · {employeeRole(employee)}</span></span></button>)}
                            {!visibleEmployees.length && <div className="sm:col-span-2"><EmptyState title="No employee found" text="Try a different name, employee code, or role." /></div>}
                        </div>
                    </div>
                    <form onSubmit={submitPin} className="h-fit rounded-[1.4rem] border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-white p-5 shadow-lg shadow-blue-500/5">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-700"><KeyRound size={21} /></div>
                        <h2 className="mt-4 text-lg font-black text-slate-950">Kiosk PIN</h2>
                        {selectedEmployee ? <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3"><Avatar className="h-11 w-11"><AvatarImage src={employeeAvatar(selectedEmployee)} alt={employeeName(selectedEmployee)} /><AvatarFallback className="bg-sky-500 text-xs font-black text-white">{getInitials(employeeName(selectedEmployee))}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{employeeName(selectedEmployee)}</p><p className="truncate text-xs font-bold text-slate-500">{selectedEmployee.employee_code || "Employee code required"}</p></div></div> : <p className="mt-3 rounded-2xl bg-white/85 px-3 py-2 text-sm font-bold text-slate-500">Choose an employee first.</p>}
                        <Field label="4-6 digit PIN">
                            <div className="relative">
                                <input required name="new-kiosk-pin" autoComplete="new-password" pattern="\d{4,6}" inputMode="numeric" type={showPin ? "text" : "password"} value={pinForm.pin} onChange={(event) => setPinForm((current) => ({ ...current, pin: event.target.value.replace(/\D/g, "").slice(0, 6) }))} className={`${inputClassName} pr-12`} placeholder="Enter a new PIN" />
                                <button type="button" onClick={() => setShowPin((current) => !current)} title={showPin ? "Hide PIN" : "Show PIN"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-blue-600">
                                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </Field>
                        <button disabled={busy || !pinForm.user_id || !selectedEmployee?.employee_code} className="mt-4 h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-60"><ShieldCheck size={16} className="mr-2 inline" />Save PIN</button>
                    </form>
                </section>
            )}

            <ConfirmModal action={pendingConfirm} busy={busy} onClose={() => setPendingConfirm(null)} />
        </div>
    );
}
