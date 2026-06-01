import React, { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { QRCodeSVG } from "qrcode.react";
import { Bell, Camera, Check, Download, Eye, EyeOff, History, KeyRound, Laptop, Mail, RefreshCw, Settings2, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { Button } from "../../components/form/Button.jsx";
import { useAuth } from "../../context/auth-context.jsx";
import { PhoneField, SearchableSelect, useGeoOptions } from "../../components/form/GeoFields.jsx";
import { useAccountExportMutation, useChangePasswordMutation, useClearMfaReminderHistoryMutation, useDisableMfaMutation, useMfaAdoptionQuery, useMfaReminderHistoryQuery, useMfaSetupMutation, useMfaVerifyMutation, useRegenerateRecoveryCodesMutation, useRevokeAllSessionsMutation, useRevokeSessionMutation, useSecurityPolicyQuery, useSendMfaRemindersMutation, useSendTestEmailMutation, useSessionsQuery, useUpdateProfileMutation, useUpdateSecurityPolicyMutation } from "../../hooks/useAuthService.ts";
import { useDeleteStoredFileMutation, useUploadFileMutation } from "../../hooks/useStorageService.ts";
import { useClearNotificationDeliveriesMutation, useNotificationDeliveriesQuery } from "../../hooks/useNotificationService.ts";
import { getInitials } from "../../utils";
import ISO6391 from "iso-639-1";
import { clearProfileActivity, deleteProfileActivity, readProfileActivity, recordProfileActivity } from "../../lib/profile-activity.js";
import { apiUrl } from "../../config/api.js";

function ConfirmRemove({ onClose, onConfirm, isLoading }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <h2 className="text-lg font-black text-slate-950">Remove profile photo?</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Your initials will be shown instead. SSO sign-ins will not restore the provider photo automatically.</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isLoading} className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">Remove</button>
                </div>
            </div>
        </div>
    );
}

function ActionModal({ title, body, confirmLabel, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-auto max-w-sm rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <h2 className="text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{body}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

function CropModal({ file, onClose, onConfirm }) {
    const [zoom, setZoom] = useState(1);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [cropError, setCropError] = useState("");
    useEffect(() => {
        const reader = new FileReader();
        reader.onload = () => setImageUrl(String(reader.result || ""));
        reader.readAsDataURL(file);
    }, [file]);
    const createCroppedFile = async () => {
        try {
            if (!croppedAreaPixels) return;
            const image = new Image();
            image.src = imageUrl;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 512;
            canvas.getContext("2d").drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 512, 512);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
            if (!blob) throw new Error("Unable to crop image");
            onConfirm(new File([blob], "profile-picture.jpg", { type: "image/jpeg" }));
        } catch {
            setCropError("Unable to read this image. Try another JPG, PNG, or WebP file.");
        }
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                <h2 className="text-lg font-black text-slate-950">Crop profile photo</h2>
                <div className="relative mx-auto mt-5 h-56 w-56 overflow-hidden rounded-full bg-slate-100">
                    {imageUrl ? <Cropper image={imageUrl} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)} /> : <div className="grid h-full place-items-center text-sm font-bold text-slate-400">Loading preview...</div>}
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, index) => <span key={index} className="border border-white/75" />)}
                    </div>
                </div>
                <label className="mt-5 block space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Zoom</span>
                    <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-blue-600" />
                </label>
                <p className="mt-4 text-center text-sm font-semibold text-slate-500">Drag inside the grid and zoom until the circle looks right.</p>
                {cropError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{cropError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-slate-700">Cancel</button>
                    <button type="button" onClick={createCroppedFile} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Use photo</button>
                </div>
            </div>
        </div>
    );
}

const formatDateTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
const browserName = (agent = "") => agent.includes("Firefox") ? "Firefox" : agent.includes("Edg") ? "Edge" : agent.includes("Chrome") ? "Chrome" : agent.includes("Safari") ? "Safari" : "Browser";
const languageOptions = ISO6391.getAllCodes().map((code) => ({
    value: code,
    label: ISO6391.getName(code),
    searchText: ISO6391.getNativeName(code),
}));
const defaultNotificationPreferences = { security: true, mfa_reminders: true, product: true, digest: false };
const notificationTypes = [
    { key: "security", label: "Security alerts", detail: "New sign-ins, password changes, MFA changes", channels: "In-app + email" },
    { key: "mfa_reminders", label: "MFA reminders", detail: "Company rollout reminders and MFA deadlines", channels: "In-app + email" },
    { key: "product", label: "Product updates", detail: "Important Attendio product announcements", channels: "In-app + email" },
    { key: "digest", label: "Weekly digest", detail: "A weekly summary of account activity", channels: "Email" },
];

export default function ProfilePage() {
    const fileInputRef = useRef(null);
    const { user, updateUser } = useAuth();
    const updateProfile = useUpdateProfileMutation();
    const changePassword = useChangePasswordMutation();
    const uploadFile = useUploadFileMutation();
    const deleteStoredFile = useDeleteStoredFileMutation();
    const sessions = useSessionsQuery();
    const canManagePolicy = user?.permissions?.includes("settings.tenant");
    const securityPolicy = useSecurityPolicyQuery(canManagePolicy);
    const [mfaSearch, setMfaSearch] = useState("");
    const [mfaPage, setMfaPage] = useState(0);
    const [selectedMfaUsers, setSelectedMfaUsers] = useState([]);
    const [pendingReminderSend, setPendingReminderSend] = useState(false);
    const mfaAdoption = useMfaAdoptionQuery(canManagePolicy, { q: mfaSearch, limit: 10, offset: mfaPage * 10 });
    const mfaReminderHistory = useMfaReminderHistoryQuery(canManagePolicy);
    const clearMfaReminderHistory = useClearMfaReminderHistoryMutation();
    const updateSecurityPolicy = useUpdateSecurityPolicyMutation();
    const sendMfaReminders = useSendMfaRemindersMutation();
    const mfaSetup = useMfaSetupMutation();
    const mfaVerify = useMfaVerifyMutation();
    const disableMfa = useDisableMfaMutation();
    const regenerateRecoveryCodes = useRegenerateRecoveryCodesMutation();
    const accountExport = useAccountExportMutation();
    const sendTestEmail = useSendTestEmailMutation();
    const revokeSession = useRevokeSessionMutation();
    const revokeAllSessions = useRevokeAllSessionsMutation();
    const currentPicture = user?.profile_picture || user?.avatar_url || "";
    const [firstName, setFirstName] = useState(user?.first_name || "");
    const [lastName, setLastName] = useState(user?.last_name || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [country, setCountry] = useState(user?.country || "");
    const [city, setCity] = useState(user?.city || "");
    const [language, setLanguage] = useState(user?.language || "en");
    const [notifications, setNotifications] = useState({ ...defaultNotificationPreferences, ...(user?.notification_preferences || {}) });
    const [mfaSetupData, setMfaSetupData] = useState(null);
    const [mfaToken, setMfaToken] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState([]);
    const [disableMfaForm, setDisableMfaForm] = useState({ current_password: "", token: "" });
    const [recoveryToken, setRecoveryToken] = useState("");
    const [tab, setTab] = useState("general");
    const notificationDeliveries = useNotificationDeliveriesQuery(tab === "notifications", canManagePolicy ? "company" : "self");
    const clearNotificationDeliveries = useClearNotificationDeliveriesMutation();
    const [passwordForm, setPasswordForm] = useState({ old_password: "", new_password: "", confirm_password: "", revoke_other_sessions: true });
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [previewUrl, setPreviewUrl] = useState(currentPicture);
    const [pendingRemove, setPendingRemove] = useState(false);
    const [pendingDiscardTab, setPendingDiscardTab] = useState(null);
    const [pendingCropFile, setPendingCropFile] = useState(null);
    const [pendingRevokeAll, setPendingRevokeAll] = useState(false);
    const [savedProfile, setSavedProfile] = useState(null);
    const [screenActivity, setScreenActivity] = useState([]);
    const [policyDraft, setPolicyDraft] = useState({ password_min_length: 12, require_mfa: false, session_ttl_days: 7, mfa_grace_period_days: 14 });
    const [savedPolicy, setSavedPolicy] = useState(null);
    const [isPolicyOpen, setIsPolicyOpen] = useState(false);
    const name = [firstName, lastName].filter(Boolean).join(" ") || user?.email || "User";
    const { countryOptions, detectedCountry, cityOptionsFor, isCityLoading } = useGeoOptions(country);
    const passwordRules = [
        { label: `${policyDraft.password_min_length || 12} or more characters`, valid: passwordForm.new_password.length >= (policyDraft.password_min_length || 12) },
        { label: "Uppercase letter", valid: /[A-Z]/.test(passwordForm.new_password) },
        { label: "Lowercase letter", valid: /[a-z]/.test(passwordForm.new_password) },
        { label: "Number", valid: /\d/.test(passwordForm.new_password) },
        { label: "Special character", valid: /[^A-Za-z0-9]/.test(passwordForm.new_password) },
    ];
    const hasUnsavedPasswordChanges = Boolean(passwordForm.old_password || passwordForm.new_password || passwordForm.confirm_password);

    useEffect(() => {
        if (!country && detectedCountry) setCountry(detectedCountry);
    }, [country, detectedCountry]);

    useEffect(() => {
        if (!user) return;
        const nextProfile = {
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            phone: user.phone || "",
            country: user.country || "",
            city: user.city || "",
            language: user.language || "en",
            notifications: { ...defaultNotificationPreferences, ...(user.notification_preferences || {}) },
        };
        setFirstName(nextProfile.firstName);
        setLastName(nextProfile.lastName);
        setPhone(nextProfile.phone);
        setCountry(nextProfile.country);
        setCity(nextProfile.city);
        setLanguage(nextProfile.language);
        setNotifications(nextProfile.notifications);
        setSavedProfile(nextProfile);
        setPreviewUrl(user.profile_picture || user.avatar_url || "");
        setScreenActivity(readProfileActivity(user.id));
    }, [user?.id]);

    useEffect(() => {
        if (securityPolicy.data?.data) {
            setPolicyDraft(securityPolicy.data.data);
            setSavedPolicy(securityPolicy.data.data);
        }
    }, [securityPolicy.data]);

    const currentProfile = { firstName, lastName, phone, country, city, language };
    const savedBasics = savedProfile && { firstName: savedProfile.firstName, lastName: savedProfile.lastName, phone: savedProfile.phone, country: savedProfile.country, city: savedProfile.city, language: savedProfile.language };
    const hasUnsavedChanges = savedProfile && JSON.stringify(savedBasics) !== JSON.stringify(currentProfile);
    const hasUnsavedNotificationChanges = savedProfile && JSON.stringify(savedProfile.notifications) !== JSON.stringify(notifications);
    const hasUnsavedPolicyChanges = savedPolicy && JSON.stringify(savedPolicy) !== JSON.stringify(policyDraft);

    useEffect(() => {
        if (!hasUnsavedChanges) return undefined;
        const warnBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [hasUnsavedChanges]);

    const applyProfileResponse = (response, message) => {
        const updatedUser = response?.data?.user || {};
        const nextUser = {
            ...updatedUser,
            profile_picture: updatedUser.profile_picture ?? updatedUser.avatar_url ?? user?.profile_picture ?? user?.avatar_url ?? "",
            avatar_url: updatedUser.avatar_url ?? updatedUser.profile_picture ?? user?.avatar_url ?? user?.profile_picture ?? "",
        };
        updateUser(nextUser);
        setPreviewUrl(nextUser.profile_picture || nextUser.avatar_url || "");
        setSavedProfile({
            firstName: nextUser.first_name || "",
            lastName: nextUser.last_name || "",
            phone: nextUser.phone || "",
            country: nextUser.country || "",
            city: nextUser.city || "",
            language: nextUser.language || "en",
            notifications: { ...defaultNotificationPreferences, ...(nextUser.notification_preferences || {}) },
        });
        toast.success(message);
    };
    const addScreenActivity = (action, detail) => setScreenActivity(recordProfileActivity(user?.id, action, detail));

    const saveBasics = () => {
        if (!firstName.trim() || !lastName.trim()) {
            toast.error("First and last name are required");
            return;
        }
        updateProfile.mutate(
            { first_name: firstName, last_name: lastName, phone, country, city, language, notification_preferences: notifications },
            {
                onSuccess: (response) => {
                    applyProfileResponse(response, "Profile updated");
                    addScreenActivity(
                        tab === "language" ? "Language updated" : tab === "preferences" ? "Preferences updated" : "Profile updated",
                        tab === "language" ? `Language set to ${language}` : tab === "preferences" ? "Notification preferences saved" : "Personal details saved"
                    );
                },
                onError: (error) => toast.error(error.message || "Unable to update profile"),
            }
        );
    };

    const uploadPhoto = (file) => {
        if (!file) return;
        const instantPreview = URL.createObjectURL(file);
        setPreviewUrl(instantPreview);
        uploadFile.mutate(
            { file, module: "auth", category: "profile-pictures" },
            {
                onSuccess: (uploadResponse) => {
                    const url = uploadResponse?.data?.url;
                    if (!url) {
                        toast.error("Upload completed without a file URL");
                        return;
                    }
                    updateProfile.mutate(
                        { profile_picture_url: url },
                        {
                            onSuccess: (response) => {
                                applyProfileResponse(response, "Profile photo updated");
                                URL.revokeObjectURL(instantPreview);
                                addScreenActivity("Profile photo updated", "Changed account avatar");
                                const oldKey = currentPicture.includes("/api/v1/storage/files/")
                                    ? currentPicture.split("/api/v1/storage/files/")[1]
                                    : "";
                                if (oldKey) deleteStoredFile.mutate(oldKey);
                            },
                            onError: (error) => {
                                URL.revokeObjectURL(instantPreview);
                                setPreviewUrl(currentPicture);
                                toast.error(error.message || "Unable to save profile photo");
                            },
                        }
                    );
                },
                onError: (error) => {
                    URL.revokeObjectURL(instantPreview);
                    setPreviewUrl(currentPicture);
                    toast.error(error.message === "Failed to fetch" ? "Storage service is unavailable" : error.message || "Unable to upload photo");
                },
            }
        );
    };

    const removePhoto = () => {
        updateProfile.mutate(
            { profile_picture_url: null },
            {
                onSuccess: (response) => {
                    applyProfileResponse(response, "Profile photo removed");
                    addScreenActivity("Profile photo removed", "Switched back to initials");
                    const oldKey = currentPicture.includes("/api/v1/storage/files/")
                        ? currentPicture.split("/api/v1/storage/files/")[1]
                        : "";
                    if (oldKey) deleteStoredFile.mutate(oldKey);
                    setPendingRemove(false);
                },
                onError: (error) => toast.error(error.message || "Unable to remove profile photo"),
            }
        );
    };

    const savePassword = () => {
        if (!passwordForm.old_password) {
            toast.error("Current password is required");
            return;
        }
        if (!passwordRules.every((rule) => rule.valid)) {
            toast.error("New password does not meet all requirements");
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error("New password and confirmation do not match");
            return;
        }
        changePassword.mutate(
            { old_password: passwordForm.old_password, new_password: passwordForm.new_password, revoke_other_sessions: passwordForm.revoke_other_sessions },
            {
                onSuccess: () => {
                    setPasswordForm({ old_password: "", new_password: "", confirm_password: "", revoke_other_sessions: true });
                    toast.success("Password changed");
                    addScreenActivity("Password changed", passwordForm.revoke_other_sessions ? "Other sessions were revoked" : "Current password updated");
                },
                onError: (error) => toast.error(error.message || "Unable to change password"),
            }
        );
    };
    const activeSessions = (sessions.data?.data || []).filter((session) => !session.revoked_at);
    const activeDevices = Object.values(activeSessions.reduce((items, session) => {
        const key = session.device_id || `${session.user_agent || "unknown"}::${session.ip_address || "unknown"}::${session.location || ""}`;
        const current = items[key] || { ...session, session_ids: [], session_count: 0, is_current: false };
        current.session_ids.push(session.id);
        current.session_count += 1;
        current.is_current = current.is_current || session.is_current;
        if (new Date(session.last_used_at || session.created_at) > new Date(current.last_used_at || current.created_at)) Object.assign(current, session, { session_ids: current.session_ids, session_count: current.session_count, is_current: current.is_current });
        items[key] = current;
        return items;
    }, {}));
    const acceptPhoto = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Use an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Profile photo must be 5 MB or smaller");
            return;
        }
        setPendingCropFile(file);
    };
    const isPhotoBusy = uploadFile.isPending || updateProfile.isPending;
    const requestTabChange = (nextTab) => {
        if ((["general", "language"].includes(tab) && hasUnsavedChanges) || (tab === "notifications" && hasUnsavedNotificationChanges) || (tab === "preferences" && hasUnsavedPolicyChanges) || (tab === "password" && hasUnsavedPasswordChanges)) {
            setPendingDiscardTab(nextTab);
            return;
        }
        setTab(nextTab);
    };

    return (
        <div className="space-y-5">
            {/* <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-4 text-left shadow-lg shadow-blue-500/5"> */}
            {/* <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Account</p> */}
            {/* <h3 className="text-2xl font-black text-blue-600 sm:text-3xl">Profile</h3>
                <div className="mt-1">
                    <p className="mt-4 text-xs font-bold text-slate-400">Last updated {formatDateTime(user?.updated_at)}</p>
                </div> */}
            {/* <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Manage your identity, avatar, and personal account details.</p> */}
            {/* </section> */}
            {user?.security_policy?.require_mfa && !user?.mfa_enabled && (
                <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4 text-left shadow-lg shadow-amber-500/5">
                    <p className="text-sm font-black text-amber-950">MFA enrollment required by your company</p>
                    <p className="mt-1 text-sm font-medium text-amber-800">Set up MFA before {formatDateTime(user.security_policy.mfa_enforcement_at)} to avoid sign-in interruption.</p>
                </section>
            )}

            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="rounded-[1.4rem] border border-blue-100 bg-white/90 p-5 shadow-lg shadow-blue-500/5">
                    <div className="relative mx-auto w-fit" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptPhoto(event.dataTransfer.files?.[0]); }}>
                        <Avatar className="h-28 w-28 border-0 shadow-lg shadow-blue-500/15">
                            <AvatarImage src={previewUrl || null} alt={name} className="h-full w-full object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-sky-400 text-3xl font-black text-white">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:bg-slate-800" title="Upload photo">
                            <Camera size={16} />
                        </button>
                        {isPhotoBusy && <div className="absolute inset-0 grid place-items-center rounded-full bg-slate-950/55 text-xs font-black text-white">Saving...</div>}
                    </div>
                    <h2 className="mt-4 break-words text-center text-lg font-black text-slate-950">{name}</h2>
                    <p className="mt-1 break-all text-center text-sm font-semibold text-slate-500">{user?.email}</p>
                    <nav className="mt-5 space-y-2">
                        <button type="button" onClick={() => requestTabChange("general")} className={tab === "general" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <UserRound size={17} />
                            General
                        </button>
                        <button type="button" onClick={() => requestTabChange("password")} className={tab === "password" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <KeyRound size={17} />
                            Change password
                        </button>
                        <button type="button" onClick={() => requestTabChange("language")} className={tab === "language" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <span className="grid h-4 w-4 place-items-center text-xs font-black">A</span>
                            Language
                        </button>
                        <button type="button" onClick={() => requestTabChange("security")} className={tab === "security" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <ShieldCheck size={17} />
                            Security
                        </button>
                        <button type="button" onClick={() => requestTabChange("activity")} className={tab === "activity" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <History size={17} />
                            Activity
                        </button>
                        <button type="button" onClick={() => requestTabChange("preferences")} className={tab === "preferences" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <Settings2 size={17} />
                            Preferences
                        </button>
                        <button type="button" onClick={() => requestTabChange("notifications")} className={tab === "notifications" ? "flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-500/20" : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"}>
                            <Bell size={17} />
                            Notifications
                        </button>
                    </nav>
                    <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-black uppercase tracking-[0.12em]">Account photo</span>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">Your Attendio photo takes priority over SSO provider photos.</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => { acceptPhoto(event.target.files?.[0]); event.target.value = ""; }} className="hidden" />
                </aside>

                <section className="rounded-[1.4rem] border border-blue-100 bg-white/90 p-5 text-left shadow-lg shadow-blue-500/5 sm:p-6">
                    {tab === "general" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><UserRound size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Personal details</h2>
                                    <p className="text-xs font-bold text-slate-500">Used across your account and directory profile.</p>
                                </div>
                                {hasUnsavedChanges && <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Unsaved</span>}
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">First name</span>
                                    <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Last name</span>
                                    <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                                </label>
                                <label className="space-y-2 sm:col-span-2">
                                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Email</span>
                                    <input value={user?.email || ""} disabled className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-100 px-3 text-sm font-medium text-slate-500" />
                                </label>
                                <PhoneField value={phone} onChange={setPhone} countryOptions={countryOptions} preferredCountry={country} />
                                <SearchableSelect label="Country" value={country} onChange={(value) => { setCountry(value); setCity(""); }} options={countryOptions} placeholder="Select country" />
                                <div>
                                    <SearchableSelect label="City" value={city} onChange={setCity} options={cityOptionsFor(country)} placeholder={country ? "Select city" : "Select country first"} allowCustom loading={isCityLoading} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="mt-4 text-xs font-bold text-slate-400">Last updated {formatDateTime(user?.updated_at)}</p>
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                                <button type="button" onClick={() => setPendingRemove(true)} disabled={!currentPicture || updateProfile.isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                    <Trash2 size={16} />
                                    Remove photo
                                </button>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    {hasUnsavedChanges && (
                                        <button type="button" onClick={() => {
                                            setFirstName(savedProfile.firstName);
                                            setLastName(savedProfile.lastName);
                                            setPhone(savedProfile.phone);
                                            setCountry(savedProfile.country);
                                            setCity(savedProfile.city);
                                            setLanguage(savedProfile.language);
                                            setNotifications(savedProfile.notifications);
                                        }} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">Discard</button>
                                    )}
                                    <Button type="button" onClick={saveBasics} disabled={!hasUnsavedChanges} isLoading={updateProfile.isPending} className="w-auto px-6">Save changes</Button>
                                </div>
                            </div>
                        </>
                    ) : tab === "language" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-lg font-black text-blue-600">A</div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Language preference</h2>
                                    <p className="text-xs font-bold text-slate-500">Choose the language you want Attendio to use for your account.</p>
                                </div>
                                {hasUnsavedChanges && <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Unsaved</span>}
                            </div>
                            <div className="mt-5 max-w-xl">
                                <SearchableSelect label="Language" value={language} onChange={setLanguage} options={languageOptions} placeholder="Select language" />
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                {hasUnsavedChanges && <button type="button" onClick={() => setLanguage(savedProfile.language)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Discard</button>}
                                <Button type="button" onClick={saveBasics} disabled={!hasUnsavedChanges} isLoading={updateProfile.isPending} className="w-auto px-6">Save language</Button>
                            </div>
                        </>
                    ) : tab === "password" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><KeyRound size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Change password</h2>
                                    <p className="text-xs font-bold text-slate-500">Use your current local password to set a new one.</p>
                                </div>
                            </div>
                            <div className="mt-5 grid max-w-xl gap-4" autoComplete="off">
                                <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
                                <input type="password" name="password" autoComplete="current-password" className="hidden" tabIndex={-1} aria-hidden="true" />
                                {[
                                    ["old_password", "Current password"],
                                    ["new_password", "New password"],
                                    ["confirm_password", "Confirm password"],
                                ].map(([key, label]) => (
                                    <label key={key} className="space-y-2">
                                        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
                                        <div className="relative">
                                            <input
                                                type={visiblePasswords[key] ? "text" : "password"}
                                                name={`field_${key}_${user?.id || "account"}`}
                                                autoComplete="one-time-code"
                                                readOnly
                                                onFocus={(event) => event.currentTarget.removeAttribute("readonly")}
                                                value={passwordForm[key]}
                                                onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))}
                                                className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 pr-11 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                            />
                                            <button type="button" onClick={() => setVisiblePasswords((current) => ({ ...current, [key]: !current[key] }))} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title={visiblePasswords[key] ? "Hide password" : "Show password"}>
                                                {visiblePasswords[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-4 max-w-xl rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Strong password</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {passwordRules.map((rule) => (
                                        <div key={rule.label} className="flex items-center gap-2 text-sm font-semibold">
                                            <span className={rule.valid ? "grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white" : "grid h-5 w-5 place-items-center rounded-full bg-white text-slate-400"}>
                                                {rule.valid ? <Check size={13} /> : <X size={13} />}
                                            </span>
                                            <span className={rule.valid ? "text-emerald-700" : "text-slate-500"}>{rule.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <label className="mt-4 flex max-w-xl items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4">
                                <input type="checkbox" checked={passwordForm.revoke_other_sessions} onChange={(event) => setPasswordForm((current) => ({ ...current, revoke_other_sessions: event.target.checked }))} className="mt-1 h-4 w-4 accent-blue-600" />
                                <span>
                                    <span className="block text-sm font-black text-slate-900">Sign out other sessions</span>
                                    <span className="mt-1 block text-sm font-medium leading-6 text-slate-500">Keep this device active and revoke other browser sessions after the password changes.</span>
                                </span>
                            </label>
                            <div className="mt-6 flex justify-end">
                                <Button type="button" onClick={savePassword} isLoading={changePassword.isPending} className="w-auto px-6">Update password</Button>
                            </div>
                        </>
                    ) : tab === "security" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Active sessions</h2>
                                    <p className="text-xs font-bold text-slate-500">Review where your account is currently signed in.</p>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3">
                                <div className="flex flex-wrap justify-end gap-2">
                                    <button type="button" onClick={() => sessions.refetch()} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50"><RefreshCw size={15} className={sessions.isFetching ? "animate-spin" : ""} />{sessions.isFetching ? "Refreshing" : "Refresh"}</button>
                                    {activeDevices.length > 0 && <button type="button" onClick={() => setPendingRevokeAll(true)} className="rounded-2xl border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50">Sign out all devices</button>}
                                </div>
                                {sessions.isLoading && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">Loading sessions...</p>}
                                {sessions.isError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">Unable to load sessions right now.</p>}
                                <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                                    {activeDevices.map((session) => (
                                        <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600"><Laptop size={18} /></div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{browserName(session.user_agent)}</p>
                                                    {session.is_current && <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700">Current session</span>}
                                                    <p className="mt-1 text-sm font-medium text-slate-500">{session.ip_address || "Unknown IP"}</p>
                                                    <p className="mt-1 text-sm font-medium text-slate-500">{session.location || "Location unavailable"}</p>
                                                    <p className="mt-1 text-xs font-bold text-slate-400">Last used {formatDateTime(session.last_used_at || session.created_at)}</p>
                                                    {session.session_count > 1 && <p className="mt-1 text-xs font-bold text-slate-400">{session.session_count} sessions on this device</p>}
                                                </div>
                                            </div>
                                            {!session.is_current && <button type="button" onClick={async () => {
                                                try {
                                                    await Promise.all(session.session_ids.map((session_id) => revokeSession.mutateAsync({ session_id })));
                                                    sessions.refetch();
                                                    toast.success("Device signed out");
                                                } catch (error) {
                                                    toast.error(error.message || "Unable to sign out device");
                                                }
                                            }} className="rounded-2xl border border-red-100 px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50">Sign out device</button>}
                                        </div>
                                    ))}
                                </div>
                                {!sessions.isLoading && !sessions.isError && activeDevices.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">No active devices found.</p>}
                            </div>
                        </>
                    ) : tab === "activity" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><History size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Account activity</h2>
                                    <p className="text-xs font-bold text-slate-500">Recent security and profile events for your account.</p>
                                </div>
                                {screenActivity.length > 0 && <button type="button" onClick={() => setScreenActivity(clearProfileActivity(user?.id))} className="ml-auto rounded-2xl border border-red-100 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50">Clear history</button>}
                            </div>
                            <div className="mt-5 max-h-[460px] space-y-3 overflow-auto pr-1">
                                {screenActivity.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{item.action}</p>
                                                {item.detail && <p className="mt-1 text-sm font-medium text-slate-500">{item.detail}</p>}
                                            </div>
                                            <button type="button" onClick={() => setScreenActivity(deleteProfileActivity(user?.id, item.id))} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-red-600" title="Delete activity"><Trash2 size={15} /></button>
                                        </div>
                                        <p className="mt-1 text-xs font-bold text-slate-400">{formatDateTime(item.created_at)}</p>
                                    </div>
                                ))}
                                {screenActivity.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">No screen activity yet.</p>}
                            </div>
                        </>
                    ) : tab === "notifications" ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Bell size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Notifications</h2>
                                    <p className="text-xs font-bold text-slate-500">Only enabled notification channels will be delivered.</p>
                                </div>
                                {hasUnsavedNotificationChanges && <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Unsaved</span>}
                            </div>
                            <div className="mt-5 grid gap-3">
                                <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-4">
                                    <span>
                                        <span className="block text-sm font-black text-slate-900">Account emails</span>
                                        <span className="mt-1 block text-sm font-medium text-slate-500">Email verification and password reset links</span>
                                        <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-blue-600">Required email</span>
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700">Always on</span>
                                </div>
                                {notificationTypes.map(({ key, label, detail, channels }) => (
                                    <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                        <span>
                                            <span className="block text-sm font-black text-slate-900">{label}</span>
                                            <span className="mt-1 block text-sm font-medium text-slate-500">{detail}</span>
                                            <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-blue-600">{channels}</span>
                                        </span>
                                        <input type="checkbox" checked={Boolean(notifications[key])} onChange={(event) => setNotifications((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-blue-600" />
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                {hasUnsavedNotificationChanges && <button type="button" onClick={() => setNotifications(savedProfile.notifications)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Discard</button>}
                                <Button type="button" onClick={saveBasics} disabled={!hasUnsavedNotificationChanges} isLoading={updateProfile.isPending} className="w-auto px-6">Save preferences</Button>
                            </div>
                            <div className="mt-6 rounded-2xl border border-blue-100 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">{canManagePolicy ? "Recent company delivery status" : "Recent delivery status"}</p>
                                        <p className="mt-1 text-sm font-medium text-slate-500">{canManagePolicy ? "Recent notification deliveries across your company, including employee reminder campaigns." : "Useful when an email is queued, retried, or blocked by transport configuration."}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {(notificationDeliveries.data?.data || []).length > 0 && <button type="button" disabled={clearNotificationDeliveries.isPending} onClick={() => clearNotificationDeliveries.mutate(undefined, { onSuccess: () => { notificationDeliveries.refetch(); toast.success("Delivery history cleared"); }, onError: (error) => toast.error(error.message || "Unable to clear delivery history") })} className="rounded-xl border border-red-100 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-60">{clearNotificationDeliveries.isPending ? "Clearing..." : "Clear history"}</button>}
                                        <button type="button" onClick={() => notificationDeliveries.refetch()} className="rounded-xl border border-blue-100 px-3 py-1.5 text-xs font-black text-blue-600 hover:bg-blue-50">Refresh</button>
                                    </div>
                                </div>
                                <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                                    {(notificationDeliveries.data?.data || []).slice(0, 10).map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                                            <span className="font-black capitalize text-slate-900">{item.channel}</span>
                                            <span className={item.status === "delivered" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700" : item.status === "failed" ? "rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-red-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-amber-700"}>{item.status}</span>
                                            <span className="text-xs font-bold text-slate-400">{item.retry_count} retries</span>
                                        </div>
                                    ))}
                                    {!notificationDeliveries.isLoading && (notificationDeliveries.data?.data || []).length === 0 && <p className="text-sm font-medium text-slate-500">No deliveries yet.</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Settings2 size={19} /></div>
                                <div>
                                    <h2 className="text-base font-black text-slate-950">Preferences and privacy</h2>
                                    <p className="text-xs font-bold text-slate-500">Control notifications, MFA, and your account export.</p>
                                </div>
                            </div>
                            <div className="mt-5 rounded-2xl border border-blue-100 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Multi-factor authentication</p>
                                        <p className="mt-1 text-sm font-medium text-slate-500">{user?.mfa_enabled ? "Enabled" : "Add a one-time-code app for stronger sign-in protection."}</p>
                                    </div>
                                    {!user?.mfa_enabled && <button type="button" disabled={mfaSetup.isPending} onClick={() => mfaSetup.mutate(undefined, { onSuccess: (response) => setMfaSetupData(response.data), onError: (error) => toast.error(error.message || "Unable to start MFA") })} className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:opacity-60">{mfaSetup.isPending ? "Preparing..." : "Set up MFA"}</button>}
                                </div>
                                {mfaSetupData && !user?.mfa_enabled && (
                                    <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                                        <div className="mb-3 flex justify-end">
                                            <button type="button" onClick={() => { setMfaSetupData(null); setMfaToken(""); }} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" title="Close MFA setup"><X size={16} /></button>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-[148px_1fr] sm:items-center">
                                            <div className="rounded-2xl bg-white p-3">
                                                <QRCodeSVG value={mfaSetupData.provisioning_uri} size={124} className="mx-auto" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600">Scan this QR in Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app. It generates a fresh 6-digit code; no email is sent for each login.</p>
                                                <code className="mt-2 block break-all rounded-xl bg-white p-3 text-sm font-bold text-slate-900">{mfaSetupData.secret}</code>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                            <input value={mfaToken} onChange={(event) => setMfaToken(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className="h-11 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-medium outline-none focus:border-blue-400" />
                                            <button type="button" disabled={mfaVerify.isPending || mfaToken.length !== 6} onClick={() => mfaVerify.mutate({ token: mfaToken }, { onSuccess: (response) => { updateUser({ ...user, mfa_enabled: true }); setMfaSetupData(null); setMfaToken(""); setRecoveryCodes(response?.data?.recovery_codes || []); addScreenActivity("MFA enabled", "Authenticator app enrolled"); toast.success("MFA enabled"); }, onError: (error) => toast.error(error.message || "Invalid MFA code") })} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{mfaVerify.isPending ? "Verifying..." : "Verify"}</button>
                                        </div>
                                    </div>
                                )}
                                {recoveryCodes.length > 0 && (
                                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                        <p className="text-sm font-black text-amber-900">Save these recovery codes now</p>
                                        <p className="mt-1 text-sm font-medium text-amber-800">Each code works once if you lose your authenticator app.</p>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            {recoveryCodes.map((code) => <code key={code} className="justify-center bg-white font-black">{code}</code>)}
                                        </div>
                                        <button type="button" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => toast.success("Recovery codes copied"))} className="mt-3 rounded-2xl border border-amber-200 px-4 py-2 text-sm font-black text-amber-900 hover:bg-white">Copy codes</button>
                                    </div>
                                )}
                                {user?.mfa_enabled && (
                                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-sm font-black text-slate-900">Regenerate recovery codes</p>
                                            <p className="mt-1 text-sm font-medium text-slate-500">Old unused codes stop working after regeneration.</p>
                                            <div className="mt-3 flex gap-2">
                                                <input value={recoveryToken} onChange={(event) => setRecoveryToken(event.target.value)} placeholder="Current MFA code" className="h-11 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-medium" />
                                                <button type="button" disabled={regenerateRecoveryCodes.isPending} onClick={() => regenerateRecoveryCodes.mutate({ token: recoveryToken }, { onSuccess: (response) => { setRecoveryCodes(response?.data?.recovery_codes || []); setRecoveryToken(""); toast.success("Recovery codes regenerated"); }, onError: (error) => toast.error(error.message || "Unable to regenerate codes") })} className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-white disabled:opacity-60">{regenerateRecoveryCodes.isPending ? "Working..." : "Regenerate"}</button>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-red-50 p-4">
                                            <p className="text-sm font-black text-red-900">Disable MFA</p>
                                            <p className="mt-1 text-sm font-medium text-red-700">Requires your current password and a valid MFA or recovery code.</p>
                                            <div className="mt-3 grid gap-2">
                                                <input type="password" value={disableMfaForm.current_password} onChange={(event) => setDisableMfaForm((current) => ({ ...current, current_password: event.target.value }))} placeholder="Current password" className="h-11 rounded-2xl border border-red-100 bg-white px-3 text-sm font-medium" />
                                                <input value={disableMfaForm.token} onChange={(event) => setDisableMfaForm((current) => ({ ...current, token: event.target.value }))} placeholder="MFA or recovery code" className="h-11 rounded-2xl border border-red-100 bg-white px-3 text-sm font-medium" />
                                                <button type="button" disabled={disableMfa.isPending} onClick={() => disableMfa.mutate(disableMfaForm, { onSuccess: () => { updateUser({ ...user, mfa_enabled: false }); setDisableMfaForm({ current_password: "", token: "" }); setRecoveryCodes([]); addScreenActivity("MFA disabled", "Authenticator requirement removed"); toast.success("MFA disabled"); }, onError: (error) => toast.error(error.message || "Unable to disable MFA") })} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">{disableMfa.isPending ? "Disabling..." : "Disable MFA"}</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-5 rounded-2xl border border-blue-100 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Email delivery test</p>
                                        <p className="mt-1 text-sm font-medium text-slate-500">Send one test email to {user?.email} to verify SMTP delivery.</p>
                                    </div>
                                    <button type="button" disabled={sendTestEmail.isPending} onClick={() => sendTestEmail.mutate(undefined, { onSuccess: () => { addScreenActivity("Test email sent", "SMTP delivery check requested"); toast.success("Test email sent"); }, onError: (error) => toast.error(error.message || "Unable to send test email") })} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:opacity-60"><Mail size={16} />{sendTestEmail.isPending ? "Sending..." : "Send test email"}</button>
                                </div>
                            </div>
                            {canManagePolicy && (
                                <div className="mt-5 rounded-2xl border border-blue-100 p-4">
                                    <button type="button" onClick={() => setIsPolicyOpen((current) => !current)} className="flex w-full items-center justify-between text-left">
                                        <span>
                                            <span className="block text-sm font-black text-slate-900">Admin security policy</span>
                                            <span className="mt-1 block text-sm font-medium text-slate-500">Set tenant-wide password minimums, sessions, and MFA rollout.</span>
                                        </span>
                                        <span className="text-sm font-black text-blue-600">{isPolicyOpen ? "Close" : "Open"}</span>
                                    </button>
                                    {hasUnsavedPolicyChanges && <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Unsaved</span>}
                                    {isPolicyOpen && <>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <label className="space-y-2">
                                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Min password length</span>
                                                <input type="number" min="12" max="64" value={policyDraft.password_min_length} onChange={(event) => setPolicyDraft((current) => ({ ...current, password_min_length: Number(event.target.value) }))} className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium" />
                                            </label>
                                            <label className="space-y-2">
                                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Session TTL days</span>
                                                <input type="number" min="1" max="90" value={policyDraft.session_ttl_days} onChange={(event) => setPolicyDraft((current) => ({ ...current, session_ttl_days: Number(event.target.value) }))} className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium" />
                                            </label>
                                            <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-slate-50 px-4">
                                                <input type="checkbox" checked={policyDraft.require_mfa} onChange={(event) => setPolicyDraft((current) => ({ ...current, require_mfa: event.target.checked }))} className="h-4 w-4 accent-blue-600" />
                                                <span className="text-sm font-black text-slate-900">Require MFA</span>
                                            </label>
                                            {policyDraft.require_mfa && <label className="space-y-2">
                                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">MFA grace days</span>
                                                <input type="number" min="0" max="90" value={policyDraft.mfa_grace_period_days} onChange={(event) => setPolicyDraft((current) => ({ ...current, mfa_grace_period_days: Number(event.target.value) }))} className="h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium" />
                                            </label>}
                                        </div>
                                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">MFA adoption</p>
                                                    <p className="mt-1 text-sm font-medium text-slate-500">{mfaAdoption.data?.data?.missing_count || 0} active users still missing MFA.</p>
                                                    {mfaAdoption.data?.data?.mfa_enforcement_at && <p className="mt-1 text-xs font-bold text-amber-700">Enforcement starts {formatDateTime(mfaAdoption.data.data.mfa_enforcement_at)}</p>}
                                                </div>
                                                <button type="button" onClick={() => mfaAdoption.refetch()} className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-white">Refresh report</button>
                                            </div>
                                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                <input value={mfaSearch} onChange={(event) => { setMfaSearch(event.target.value); setMfaPage(0); }} placeholder="Search name or email" className="h-11 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-3 text-sm font-medium" />
                                                <button type="button" disabled={sendMfaReminders.isPending || (!selectedMfaUsers.length && !mfaAdoption.data?.data?.missing_count)} onClick={() => setPendingReminderSend(true)} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Send email</button>
                                                <button type="button" onClick={() => window.open(apiUrl("/auth/security-policy/mfa-compliance.csv"), "_blank")} className="rounded-2xl border border-blue-100 px-4 py-2 text-sm font-black text-blue-600 hover:bg-white">Export CSV</button>
                                            </div>
                                            {(mfaAdoption.data?.data?.users || []).length > 0 && (
                                                <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                                                    <label className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-900">
                                                        <input type="checkbox" checked={(mfaAdoption.data?.data?.users || []).length > 0 && (mfaAdoption.data?.data?.users || []).every((item) => selectedMfaUsers.includes(item.id))} onChange={(event) => setSelectedMfaUsers(event.target.checked ? (mfaAdoption.data?.data?.users || []).map((item) => item.id) : [])} className="h-4 w-4 accent-blue-600" />
                                                        Select all on this page
                                                    </label>
                                                    {mfaAdoption.data.data.users.map((item) => (
                                                        <label key={item.id} className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                                                            <span className="flex items-center gap-3 font-black text-slate-900">
                                                                <input type="checkbox" checked={selectedMfaUsers.includes(item.id)} onChange={(event) => setSelectedMfaUsers((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="h-4 w-4 accent-blue-600" />
                                                                {item.name}
                                                            </span>
                                                            <span className="truncate font-medium text-slate-500">{item.email}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-3 flex items-center justify-between text-sm font-bold text-slate-500">
                                                <span>Page {mfaPage + 1}</span>
                                                <div className="flex gap-2">
                                                    <button type="button" disabled={mfaPage === 0} onClick={() => setMfaPage((current) => Math.max(0, current - 1))} className="rounded-xl border border-blue-100 px-3 py-1.5 disabled:opacity-40">Previous</button>
                                                    <button type="button" disabled={(mfaPage + 1) * 10 >= (mfaAdoption.data?.data?.missing_count || 0)} onClick={() => setMfaPage((current) => current + 1)} className="rounded-xl border border-blue-100 px-3 py-1.5 disabled:opacity-40">Next</button>
                                                </div>
                                            </div>
                                            <div className="mt-4 border-t border-blue-100 pt-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-black text-slate-900">Reminder history</p>
                                                    <div className="flex gap-2">
                                                        {(mfaReminderHistory.data?.data || []).length > 0 && (
                                                            <button type="button" disabled={clearMfaReminderHistory.isPending} onClick={() => clearMfaReminderHistory.mutate(undefined, { onSuccess: () => { mfaReminderHistory.refetch(); toast.success("Reminder history cleared"); }, onError: (error) => toast.error(error.message || "Unable to clear reminder history") })} className="rounded-xl border border-red-100 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-white disabled:opacity-60">{clearMfaReminderHistory.isPending ? "Clearing..." : "Clear history"}</button>
                                                        )}
                                                        <button type="button" onClick={() => mfaReminderHistory.refetch()} className="rounded-xl border border-blue-100 px-3 py-1.5 text-xs font-black text-blue-600 hover:bg-white">Refresh</button>
                                                    </div>
                                                </div>
                                                <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
                                                    {(mfaReminderHistory.data?.data || []).map((item) => (
                                                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                                                            <span className="font-medium text-slate-600">{formatDateTime(item.created_at)}</span>
                                                            <span className="font-black text-slate-900">{item.sent_count} sent</span>
                                                            <span className="font-bold text-slate-400">{item.failed_count} failed</span>
                                                        </div>
                                                    ))}
                                                    {!mfaReminderHistory.isLoading && (mfaReminderHistory.data?.data || []).length === 0 && <p className="text-sm font-medium text-slate-500">No reminders to show.</p>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <div className="flex gap-2">
                                                {hasUnsavedPolicyChanges && <button type="button" onClick={() => setPolicyDraft(savedPolicy)} className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50">Discard</button>}
                                                <Button type="button" onClick={() => updateSecurityPolicy.mutate(policyDraft, { onSuccess: (response) => { setSavedPolicy(response.data); addScreenActivity("Security policy updated", "Admin policy saved"); toast.success("Security policy updated"); }, onError: (error) => toast.error(error.message || "Unable to update policy") })} disabled={!hasUnsavedPolicyChanges} isLoading={updateSecurityPolicy.isPending} className="w-auto px-5">Save policy</Button>
                                            </div>
                                        </div>
                                    </>}
                                </div>
                            )}
                            <div className="mt-5 flex flex-wrap justify-between gap-2">
                                <button type="button" disabled={accountExport.isPending} onClick={() => accountExport.mutate(undefined, {
                                    onSuccess: (response) => {
                                        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = "attendio-account-export.json";
                                        link.click();
                                        URL.revokeObjectURL(url);
                                        addScreenActivity("Account export downloaded", "JSON privacy export");
                                    }, onError: (error) => toast.error(error.message || "Unable to export account")
                                })} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-black text-blue-600 hover:bg-blue-50"><Download size={16} />Export my data</button>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {pendingRemove && <ConfirmRemove onClose={() => setPendingRemove(false)} onConfirm={removePhoto} isLoading={updateProfile.isPending} />}
            {pendingDiscardTab && <ActionModal title="Discard unsaved changes?" body={tab === "password" ? "Your password changes have not been saved yet." : "Your changes have not been saved yet."} confirmLabel="Discard" onClose={() => setPendingDiscardTab(null)} onConfirm={() => {
                if (tab === "password") {
                    setPasswordForm({ old_password: "", new_password: "", confirm_password: "", revoke_other_sessions: true });
                } else if (tab === "notifications") {
                    setNotifications(savedProfile.notifications);
                } else if (tab === "preferences") {
                    setPolicyDraft(savedPolicy);
                } else {
                    setFirstName(savedProfile.firstName);
                    setLastName(savedProfile.lastName);
                    setPhone(savedProfile.phone);
                    setCountry(savedProfile.country);
                    setCity(savedProfile.city);
                    setLanguage(savedProfile.language);
                    setNotifications(savedProfile.notifications);
                }
                setTab(pendingDiscardTab);
                setPendingDiscardTab(null);
            }} />}
            {pendingCropFile && <CropModal file={pendingCropFile} onClose={() => setPendingCropFile(null)} onConfirm={(file) => { setPendingCropFile(null); uploadPhoto(file); }} />}
            {pendingRevokeAll && <ActionModal title="Sign out all sessions?" body="This will end every active session, including this browser. You will need to sign in again." confirmLabel="Sign out all" onClose={() => setPendingRevokeAll(false)} onConfirm={() => revokeAllSessions.mutate(undefined, {
                onSuccess: () => {
                    setPendingRevokeAll(false);
                    window.dispatchEvent(new Event("force-logout"));
                },
                onError: (error) => toast.error(error.message || "Unable to sign out sessions"),
            })} />}
            {pendingReminderSend && <ActionModal title="Send MFA reminder emails?" body={selectedMfaUsers.length > 0 ? `Send individual reminder emails to ${selectedMfaUsers.length} selected employee(s).` : `Send individual reminder emails to all ${mfaAdoption.data?.data?.missing_count || 0} employees missing MFA.`} confirmLabel="Send emails" onClose={() => setPendingReminderSend(false)} onConfirm={() => sendMfaReminders.mutate(selectedMfaUsers.length > 0 ? { user_ids: selectedMfaUsers } : { send_to_all_missing: true }, { onSuccess: (response) => { toast.success(`${response.data.sent_count} reminder emails sent`); setSelectedMfaUsers([]); setPendingReminderSend(false); mfaReminderHistory.refetch(); }, onError: (error) => toast.error(error.message || "Unable to send reminders") })} />}
        </div>
    );
}
