import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, BriefcaseBusiness, Camera, CalendarDays, CheckCircle2, Clock3, CreditCard, Edit3, Eye, GitBranch, Globe2, Layers3, MapPin, Plus, ReceiptText, Search, Settings, ShieldCheck, Smartphone, Trash2, UserRound, Users, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context.jsx";
import { SearchableSelect, useGeoOptions } from "../../components/form/GeoFields.jsx";
import { useBranchesQuery, useCompanySettingsQuery, useDeleteBranchMutation, useDeleteProjectMutation, useIntegrationConfigStatusQuery, useProjectsQuery, useSaveBranchMutation, useSaveProjectMutation, useUpdateCompanySettingsMutation } from "../../hooks/useAuthService.ts";
import { useBillingAttachPaymentMethodMutation, useBillingCheckoutMutation, useBillingInvoicesQuery, useBillingStatusQuery } from "../../hooks/useBillingService.ts";
import { useEmployeesQuery, useOrganizationQuery } from "../../hooks/useEmployeeService.ts";
import { useUploadFileMutation } from "../../hooks/useStorageService.ts";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/form/avatar.jsx";
import { apiUrl } from "../../config/api.js";
import { getInitials } from "../../utils";
import { hasPermission, inputClassName } from "./attendance-shared.jsx";
import { industryCatalog, industryOptions, labelFor, resolveWorkspaceProfile } from "../../config/workspaceProfiles.js";

const pageMeta = {
    "/attendance": { title: "Attendance", text: "Track clock-ins, shifts, and daily attendance activity.", icon: Clock3 },
    "/employees": { title: "Employees", text: "Manage employee records, roles, and onboarding.", icon: Users },
    "/leaves": { title: "Leaves", text: "Review leave requests, balances, and approvals.", icon: CalendarDays },
    "/timesheets": { title: "Timesheets", text: "Inspect recorded hours and timesheet exceptions.", icon: CheckCircle2 },
    "/kiosk": { title: "Kiosk", text: "Configure kiosk access and employee PIN workflows.", icon: Smartphone },
    "/compliance": { title: "Rules", text: "Manage shared time rules, leave policies, and audit-ready records.", icon: ShieldCheck },
    "/settings": { title: "Settings", text: "Company, branch, project, and organization controls.", icon: Settings },
    "/organization": { title: "Organization", text: "View reporting lines, managers, and team structure.", icon: Layers3 },
    "/security": { title: "Security", text: "Review sign-in methods, sessions, and security settings.", icon: ShieldCheck },
    "/profilePage": { title: "Profile", text: "View and manage your personal account profile.", icon: UserRound },
};

const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const emptyBranch = { id: "", name: "", city: "", country: "", timezone: browserTimeZone(), status: "active" };
const emptyProject = { id: "", name: "", code: "", client: "", branch_id: "", status: "active", start_date: "", end_date: "" };
const emptyCardForm = { holder_name: "", number: "", exp_month: "", exp_year: "", cvc: "", billing_email: "" };
const companySizeOptions = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1000+", label: "1000+ employees" },
];
const knownIndustries = industryCatalog.map((item) => item.value);
const tabs = [
    { key: "company", label: "Company", icon: Building2 },
    { key: "branches", label: "Branches", icon: MapPin },
    { key: "projects", label: "Projects", icon: BriefcaseBusiness },
    { key: "organization", label: "Organization", icon: Layers3 },
    { key: "connect", label: "Connect", icon: Globe2 },
    { key: "billing", label: "Billing", icon: CreditCard },
];
const integrationProviders = [
    { key: "microsoft_teams", name: "Microsoft Teams", scheduleLabel: "Teams meetings", description: "Connect through Microsoft OAuth for calendar and online meeting scheduling." },
    { key: "google_meet", name: "Google Meet", scheduleLabel: "Google Meet", description: "Connect through Google OAuth for Calendar event scheduling with Meet links." },
];

function TextField({ label, value, onChange, placeholder, type = "text", required = false, children }) {
    return (
        <label className="space-y-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
            {children || <input required={required} type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClassName} />}
        </label>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/35 px-3 py-5 backdrop-blur-sm sm:px-4">
            <div className="w-full max-w-2xl rounded-[1.2rem] border border-blue-100 bg-white shadow-2xl shadow-blue-500/20">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-50 bg-white px-5 py-4">
                    <h2 className="text-lg font-black text-slate-950">{title}</h2>
                    <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

const normalizeCardNumber = (value) => String(value || "").replace(/\D/g, "");
const detectCardBrand = (digits) => {
    if (/^4/.test(digits)) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
    if (/^3(?:0[0-5]|[68])/.test(digits)) return "diners";
    if (/^35/.test(digits)) return "jcb";
    return "card";
};
const cardLengthValid = (digits, brand) => {
    const lengthsByBrand = {
        amex: [15],
        diners: [14],
        visa: [13, 16, 19],
        mastercard: [16],
        discover: [16, 19],
        jcb: [16, 19],
        card: [16],
    };
    return (lengthsByBrand[brand] || lengthsByBrand.card).includes(digits.length);
};
const passesLuhn = (digits) => {
    if (!digits || digits.length < 12) return false;
    let sum = 0;
    let doubleDigit = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index]);
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
};
const cardExpiryValid = (month, year) => {
    if (!/^\d{2}$/.test(String(month || "")) || !/^\d{4}$/.test(String(year || ""))) return false;
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12 || !parsedYear) return false;
    const fullYear = parsedYear;
    if (fullYear > new Date().getFullYear() + 20) return false;
    const now = new Date();
    const expiry = new Date(fullYear, parsedMonth, 0, 23, 59, 59);
    return expiry >= new Date(now.getFullYear(), now.getMonth(), 1);
};

const orgRingColors = ["border-yellow-400", "border-orange-500", "border-cyan-500", "border-emerald-500", "border-blue-500", "border-violet-500"];

function OrgTreeNode({ employee, childrenByManager, depth = 0, visited = new Set() }) {
    const name = [employee.first_name, employee.last_name].filter(Boolean).join(" ") || employee.email || "Employee";
    const employeeId = String(employee.id);
    const nextVisited = new Set(visited);
    nextVisited.add(employeeId);
    const directReports = (childrenByManager.get(employeeId) || []).filter((report) => !nextVisited.has(String(report.id)));
    const ringClass = orgRingColors[depth % orgRingColors.length];
    return (
        <div className="inline-flex flex-col items-center">
            <div className="flex w-32 flex-col items-center text-center">
                <div className={`grid h-20 w-20 place-items-center rounded-full border-[6px] bg-white p-1 shadow-lg shadow-slate-200 ${employee.__contextOnly ? "border-slate-300 opacity-80" : ringClass}`}>
                    <Avatar className="h-full w-full">
                        <AvatarImage src={employee.profile_picture || employee.avatar_url} alt={name} />
                        <AvatarFallback className="bg-slate-100 text-base font-black text-slate-700">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                </div>
                <p className="mt-2 w-full truncate text-xs font-black uppercase text-slate-700">{name}</p>
                <p className="w-full truncate text-[10px] font-bold uppercase text-slate-400">{employee.job_title || employee.role_name || employee.role_key || "Employee"}</p>
                {employee.__contextOnly && <p className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Manager context</p>}
            </div>
            {directReports.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className="h-8 w-px bg-slate-300" />
                    <div className="relative flex items-start gap-8 pt-8">
                        {directReports.length > 1 && <div className="absolute left-16 right-16 top-0 h-px bg-slate-300" />}
                        {directReports.map((report) => (
                            <div key={report.id} className="relative flex flex-col items-center">
                                <div className="absolute -top-8 left-1/2 h-8 w-px -translate-x-1/2 bg-slate-300" />
                                <OrgTreeNode employee={report} childrenByManager={childrenByManager} depth={depth + 1} visited={nextVisited} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WorkspacePage() {
    const { user, updateUser } = useAuth();
    const location = useLocation();
    const queryClient = useQueryClient();
    const page = pageMeta[location.pathname] || pageMeta["/settings"];
    const Icon = page.icon;
    const canManage = hasPermission(user, "settings.tenant");
    const canManageBilling = ["settings.tenant", "billing.manage", "reports.company"].some((permission) => hasPermission(user, permission));
    const canViewCompanyOrg = ["org.view_company", "settings.tenant", "reports.company"].some((permission) => hasPermission(user, permission));
    const branchLabel = labelFor(user?.company, "branch", "Branch");
    const projectLabel = labelFor(user?.company, "project", "Project");
    const managerLabel = labelFor(user?.company, "manager", "Manager");
    const isOrganization = location.pathname === "/organization";
    const isSettings = location.pathname === "/settings";
    const branches = useBranchesQuery(isSettings || isOrganization);
    const projects = useProjectsQuery(isSettings || isOrganization, { limit: 200, offset: 0 });
    const employees = useEmployeesQuery(isSettings);
    const organization = useOrganizationQuery(isOrganization);
    const company = useCompanySettingsQuery(isSettings);
    const integrationConfig = useIntegrationConfigStatusQuery(isSettings);
    const billingStatus = useBillingStatusQuery(isSettings && canManageBilling);
    const billingCheckout = useBillingCheckoutMutation();
    const billingAttachPaymentMethod = useBillingAttachPaymentMethodMutation();
    const saveCompany = useUpdateCompanySettingsMutation();
    const saveBranch = useSaveBranchMutation();
    const deleteBranch = useDeleteBranchMutation();
    const saveProject = useSaveProjectMutation();
    const deleteProject = useDeleteProjectMutation();
    const uploadFile = useUploadFileMutation();
    const logoInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState(isOrganization ? "organization" : "company");
    const [activeBillingTab, setActiveBillingTab] = useState("overview");
    const [highlightStandardPlan, setHighlightStandardPlan] = useState(false);
    const [cardModalOpen, setCardModalOpen] = useState(false);
    const [cardForm, setCardForm] = useState(emptyCardForm);
    const billingInvoices = useBillingInvoicesQuery(isSettings && canManageBilling && activeTab === "billing");
    const [companyForm, setCompanyForm] = useState({ name: "", legal_name: "", logo_url: "", company_size: "", industry: "", registration_number: "", vat_id: "", address_line: "", country: "", city: "", timezone: browserTimeZone(), website: "" });
    const [branchForm, setBranchForm] = useState(emptyBranch);
    const [projectForm, setProjectForm] = useState(emptyProject);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [customIndustry, setCustomIndustry] = useState("");
    const [branchQuery, setBranchQuery] = useState("");
    const [projectQuery, setProjectQuery] = useState("");
    const [projectPage, setProjectPage] = useState(1);
    const [orgQuery, setOrgQuery] = useState("");
    const [companyIntegrations, setCompanyIntegrations] = useState({});
    const [connectingProvider, setConnectingProvider] = useState("");
    const [disconnectConfirm, setDisconnectConfirm] = useState(null);
    const [projectCodeNonce, setProjectCodeNonce] = useState(0);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const { countryOptions, detectedCountry, detectedTimeZone, cityOptionsFor, isCityLoading } = useGeoOptions(branchModalOpen ? branchForm.country : companyForm.country);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const integration = params.get("integration");
        if (integration) {
            const provider = integrationProviders.find((item) => item.key === integration);
            setActiveTab("connect");
            const reason = params.get("reason");
            if (params.get("status") === "connected") toast.success(`${provider?.name || "Integration"} connected`);
            if (params.get("status") === "not_configured") toast.error(`${provider?.name || "Integration"} is missing OAuth credentials`);
            if (params.get("status") === "error") toast.error(reason || `${provider?.name || "Integration"} connection failed`);
        }
        if (params.get("tab")) setActiveTab(params.get("tab"));
    }, [location.search]);

    useEffect(() => {
        if (isOrganization) setActiveTab("organization");
    }, [isOrganization]);

    useEffect(() => {
        const data = company.data?.data;
        if (data) {
            const industry = data.industry || "";
            setCompanyForm({ name: data.name || "", legal_name: data.legal_name || data.name || "", logo_url: data.logo_url || "", company_size: data.company_size || "", industry: industry && !knownIndustries.includes(industry) ? "Other" : industry, registration_number: data.registration_number || "", vat_id: data.vat_id || "", address_line: data.address_line || "", country: data.country || detectedCountry || "", city: data.city || "", timezone: data.timezone || detectedTimeZone, website: data.website || "" });
            setCustomIndustry(industry && !knownIndustries.includes(industry) ? industry : "");
            setCompanyIntegrations(data.integrations || {});
        }
    }, [company.data, detectedCountry, detectedTimeZone]);

    useEffect(() => {
        setCompanyForm((current) => ({
            ...current,
            country: current.country || detectedCountry || "",
            timezone: current.timezone || detectedTimeZone,
        }));
        setBranchForm((current) => ({ ...current, country: current.country || detectedCountry || "", timezone: current.timezone || detectedTimeZone }));
    }, [detectedCountry, detectedTimeZone]);

    const branchRows = branches.data?.data || [];
    const projectPageSize = 12;
    const projectList = useProjectsQuery(isSettings, { limit: projectPageSize, offset: (projectPage - 1) * projectPageSize, q: projectQuery.trim() });
    const projectRows = projects.data?.data || [];
    const projectListRows = projectList.data?.data || [];
    const projectTotal = Number(projectList.data?.meta?.total ?? projectListRows.length);
    const projectTotalPages = Math.max(1, Math.ceil(projectTotal / projectPageSize));
    const previewIndustry = companyForm.industry === "Other" ? customIndustry.trim() : companyForm.industry;
    const previewProfile = resolveWorkspaceProfile({ industry: previewIndustry });
    useEffect(() => {
        if (projectPage > projectTotalPages) setProjectPage(projectTotalPages);
    }, [projectPage, projectTotalPages]);
    const employeeRows = isOrganization ? (organization.data?.data || []) : (employees.data?.data || []);
    const currentEmployee = useMemo(() => employeeRows.find((employee) => String(employee.id) === String(user?.id)) || null, [employeeRows, user?.id]);
    const currentManager = useMemo(() => currentEmployee?.manager_id ? employeeRows.find((employee) => String(employee.id) === String(currentEmployee.manager_id)) : null, [currentEmployee, employeeRows]);
    const currentProjectRows = useMemo(() => {
        const ids = new Set((currentEmployee?.project_ids || []).map(String));
        return projectRows.filter((project) => ids.has(String(project.id)));
    }, [currentEmployee, projectRows]);
    const currentBranchTeam = useMemo(() => currentEmployee?.branch_id ? employeeRows.filter((employee) => String(employee.branch_id || "") === String(currentEmployee.branch_id)) : [], [currentEmployee, employeeRows]);
    const activeBranchOptions = useMemo(() => branchRows.filter((branch) => branch.status !== "inactive").map((branch) => ({ value: branch.id, label: [branch.name, branch.city].filter(Boolean).join(" · ") })), [branchRows]);
    const filteredBranches = useMemo(() => {
        const query = branchQuery.trim().toLowerCase();
        return query ? branchRows.filter((branch) => `${branch.name || ""} ${branch.city || ""} ${branch.country || ""} ${branch.status || ""}`.toLowerCase().includes(query)) : branchRows;
    }, [branchQuery, branchRows]);
    const filteredProjects = projectListRows;
    const selectedProject = projectRows.find((project) => String(project.id) === String(selectedProjectId)) || currentProjectRows[0] || projectRows[0] || null;
    const teamForProject = useMemo(() => selectedProject ? employeeRows.filter((employee) => (employee.project_ids || []).map(String).includes(String(selectedProject.id))) : [], [employeeRows, selectedProject]);
    const orgNodes = useMemo(() => {
        const baseSource = selectedProject ? teamForProject : employeeRows;
        const query = orgQuery.trim().toLowerCase();
        const matched = query ? baseSource.filter((employee) => `${employee.first_name || ""} ${employee.last_name || ""} ${employee.email || ""} ${employee.employee_code || ""} ${employee.job_title || ""} ${employee.department || ""}`.toLowerCase().includes(query)) : baseSource;
        const visibleMap = new Map(matched.map((employee) => [String(employee.id), employee]));
        if (selectedProject) {
            const allById = new Map(employeeRows.map((employee) => [String(employee.id), employee]));
            matched.forEach((employee) => {
                let managerId = String(employee.manager_id || "");
                const guard = new Set([String(employee.id)]);
                while (managerId && allById.has(managerId) && !guard.has(managerId)) {
                    const manager = allById.get(managerId);
                    if (!visibleMap.has(managerId)) visibleMap.set(managerId, { ...manager, __contextOnly: true });
                    guard.add(managerId);
                    managerId = String(manager.manager_id || "");
                }
            });
        }
        const visible = [...visibleMap.values()];
        const visibleIds = new Set(visible.map((employee) => String(employee.id)));
        const children = new Map();
        visible.forEach((employee) => {
            const managerId = String(employee.manager_id || "");
            const key = managerId && visibleIds.has(managerId) ? managerId : "root";
            if (!children.has(key)) children.set(key, []);
            children.get(key).push(employee);
        });
        const sortPeople = (people) => people.sort((a, b) => (a.manager_id ? 1 : 0) - (b.manager_id ? 1 : 0) || String(a.first_name || "").localeCompare(String(b.first_name || "")));
        children.forEach(sortPeople);
        return { roots: children.get("root") || [], children };
    }, [employeeRows, orgQuery, selectedProject, teamForProject]);
    const statusClass = (status) => status === "active" ? "bg-emerald-100 text-emerald-700" : status === "paused" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
    const invalidateSettings = () => {
        queryClient.invalidateQueries({ queryKey: ["auth", "company-settings"] });
        queryClient.invalidateQueries({ queryKey: ["auth", "branches"] });
        queryClient.invalidateQueries({ queryKey: ["auth", "projects"] });
    };
    const generateProjectCode = (extraOffset = 0) => {
        const namePart = (projectForm.name || projectForm.client || "PRJ")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3)
            .map((part) => part.slice(0, 3).toUpperCase())
            .join("-");
        const prefix = namePart || "PRJ";
        const maxExisting = projectRows.reduce((max, project) => {
            const match = String(project.code || "").match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`));
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        const nextNumber = String(maxExisting + 1 + extraOffset).padStart(3, "0");
        return `${prefix}-${nextNumber}`;
    };

    const submitCompany = (event) => {
        event.preventDefault();
        const payload = {
            ...companyForm,
            legal_name: companyForm.name,
            industry: companyForm.industry === "Other" ? customIndustry.trim() : companyForm.industry,
            timezone: detectedTimeZone,
        };
        const profile = resolveWorkspaceProfile({ industry: payload.industry });
        payload.operating_model = profile.operating_model;
        payload.enabled_modules = profile.enabled_modules;
        payload.terminology = profile.terminology;
        saveCompany.mutate(payload, {
            onSuccess: (response) => {
                const companyData = response?.data || {};
                updateUser({ company: { ...(user?.company || {}), ...companyData } });
                invalidateSettings();
                toast.success("Company settings saved");
            },
            onError: (error) => toast.error(error.message || "Unable to save company settings"),
        });
    };
    const saveIntegrations = (nextIntegrations, successMessage) => {
        saveCompany.mutate({ integrations: nextIntegrations }, {
            onSuccess: (response) => {
                const companyData = response?.data || {};
                setCompanyIntegrations(companyData.integrations || nextIntegrations);
                updateUser({ company: { ...(user?.company || {}), ...companyData } });
                invalidateSettings();
                toast.success(successMessage);
            },
            onError: (error) => toast.error(error.message || "Unable to update integration"),
            onSettled: () => setConnectingProvider(""),
        });
    };
    const connectIntegration = (provider) => {
        if (!canManage || connectingProvider) return;
        setConnectingProvider(provider.key);
        window.location.href = apiUrl(`/auth/integrations/${provider.key}/connect`);
    };
    const disconnectIntegration = (provider) => {
        if (!canManage || connectingProvider) return;
        setConnectingProvider(provider.key);
        setDisconnectConfirm(null);
        const next = {
            ...companyIntegrations,
            [provider.key]: {
                ...(companyIntegrations[provider.key] || {}),
                provider: provider.key,
                name: provider.name,
                status: "disconnected",
                disconnected_at: new Date().toISOString(),
                scheduling_enabled: false,
            },
        };
        saveIntegrations(next, `${provider.name} disconnected`);
    };
    const uploadLogo = (file) => {
        if (!file) return;
        uploadFile.mutate({ file, module: "auth", category: "company-logos" }, {
            onSuccess: (response) => {
                const url = response?.data?.url;
                if (!url) return toast.error("Upload completed without a file URL");
                setCompanyForm((current) => ({ ...current, logo_url: url }));
                saveCompany.mutate({ logo_url: url }, { onSuccess: invalidateSettings, onError: (error) => toast.error(error.message || "Unable to save logo") });
            },
            onError: (error) => toast.error(error.message || "Unable to upload logo"),
        });
    };
    const submitBranch = (event) => {
        event.preventDefault();
        saveBranch.mutate({ ...branchForm, timezone: detectedTimeZone }, {
            onSuccess: () => { invalidateSettings(); setBranchModalOpen(false); setBranchForm(emptyBranch); toast.success(`${branchLabel} saved`); },
            onError: (error) => toast.error(error.message || "Unable to save branch"),
        });
    };
    const submitProject = (event) => {
        event.preventDefault();
        saveProject.mutate({ ...projectForm, code: projectForm.code || generateProjectCode() }, {
            onSuccess: () => { invalidateSettings(); setProjectModalOpen(false); setProjectForm(emptyProject); toast.success(`${projectLabel} saved`); },
            onError: (error) => toast.error(error.message || "Unable to save project"),
        });
    };
    const billingData = billingStatus.data?.data || {};
    const billingSubscription = billingData.subscription || {};
    const billingLicense = billingData.license || {};
    const billingEntitlements = billingData.entitlements || {};
    const billingCustomer = billingData.customer || {};
    const billingPaymentMethod = billingCustomer.payment_method || null;
    const billingLimits = billingEntitlements.limits || {};
    const billingPlans = billingData.plans || [];
    const invoiceRows = billingInvoices.data?.data || billingData.recent_invoices || [];
    const activePlan = billingPlans.find((plan) => plan.key === (billingSubscription.plan_key || "free")) || billingPlans.find((plan) => plan.key === "free") || billingPlans[0];
    const cardDigits = normalizeCardNumber(cardForm.number);
    const cardBrand = detectCardBrand(cardDigits);
    const cardNumberOk = cardLengthValid(cardDigits, cardBrand) && passesLuhn(cardDigits);
    const cardExpiryOk = cardExpiryValid(cardForm.exp_month, cardForm.exp_year);
    const cardCvcOk = cardBrand === "amex" ? /^\d{4}$/.test(String(cardForm.cvc || "").trim()) : /^\d{3}$/.test(String(cardForm.cvc || "").trim());
    const cardEmailOk = !cardForm.billing_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardForm.billing_email.trim());
    const cardReady = Boolean(cardForm.holder_name.trim() && cardNumberOk && cardExpiryOk && cardCvcOk && cardEmailOk);
    const standardPaidActive = billingSubscription.plan_key === "standard" && !billingSubscription.requires_payment && ["active", "trialing"].includes(billingSubscription.status || "trialing");
    const freeLimitsActive = billingEntitlements.enabled && billingEntitlements.mode === "free";
    const standardFeaturesActive = !billingEntitlements.enabled || billingEntitlements.mode === "standard" || billingEntitlements.mode === "unrestricted";
    const branchLimitReached = freeLimitsActive && billingLimits.branches != null && branchRows.length >= Number(billingLimits.branches);
    const projectLimitReached = freeLimitsActive && billingLimits.projects != null && projectRows.length >= Number(billingLimits.projects);
    const money = (cents = 0, currency = "eur") => new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "eur").toUpperCase() }).format(Number(cents || 0) / 100);
    const openBillingUrl = (response, fallbackMessage) => {
        const url = response?.data?.url;
        if (url) window.location.href = url;
        else {
            setActiveBillingTab("plans");
            toast.info(fallbackMessage);
        }
    };
    const startCheckout = (planKey) => {
        billingCheckout.mutate({ plan_key: planKey }, {
            onSuccess: (response) => {
                queryClient.invalidateQueries({ queryKey: ["billing"] });
                openBillingUrl(response, "Online checkout is not available yet. You can review the Standard plan here.");
            },
            onError: () => {
                setActiveBillingTab("plans");
                toast.error("Online checkout is not available yet. Please try again later.");
            },
        });
    };
    const focusStandardPlan = () => {
        setActiveBillingTab("plans");
        setHighlightStandardPlan(true);
        window.setTimeout(() => setHighlightStandardPlan(false), 1800);
    };
    const openCardModal = () => {
        setCardForm((current) => ({
            ...current,
            billing_email: current.billing_email || user?.email || "",
        }));
        setCardModalOpen(true);
    };
    const attachPaymentMethod = (event) => {
        event.preventDefault();
        if (!cardReady) {
            toast.error("Please enter valid card details before saving.");
            return;
        }
        billingAttachPaymentMethod.mutate({
            holder_name: cardForm.holder_name.trim(),
            billing_email: cardForm.billing_email.trim() || undefined,
            brand: cardBrand,
            last4: cardDigits.slice(-4),
            exp_month: Number(cardForm.exp_month),
            exp_year: Number(cardForm.exp_year),
        }, {
            onSuccess: () => {
                setCardModalOpen(false);
                setCardForm(emptyCardForm);
                queryClient.invalidateQueries({ queryKey: ["billing"] });
                toast.success("Payment method saved");
                if (!standardPaidActive) focusStandardPlan();
            },
            onError: (error) => toast.error(error.message || "Unable to save payment method"),
        });
    };
    if (!isSettings && !isOrganization) {
        return (
            <div className="space-y-5">
                <section className="rounded-[1.2rem] border border-blue-100 bg-white/85 p-6 shadow-lg shadow-blue-500/5">
                    <div className="flex items-start gap-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={22} /></div>
                        <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Attendio</p><h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{page.title}</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{page.text}</p></div>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="grid min-h-[calc(100dvh-8rem)] overflow-hidden rounded-[1.2rem] border border-blue-100 bg-white/90 shadow-lg shadow-blue-500/5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="min-w-0 border-b border-blue-50 bg-slate-50/70 p-3 sm:p-4 lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white">{isOrganization ? <Layers3 size={19} /> : <Settings size={19} />}</div>
                    <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">{isOrganization ? "Organization" : "Settings"}</p><h1 className="text-lg font-black text-slate-950">{isOrganization ? "Hierarchy" : "Workspace"}</h1></div>
                </div>
                <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
                    {(isOrganization ? tabs.filter((tab) => tab.key === "organization") : tabs.filter((tab) => tab.key !== "billing" || canManageBilling)).map((tab) => {
                        const TabIcon = tab.icon;
                        return <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex h-11 shrink-0 items-center gap-3 rounded-2xl px-3 text-sm font-black ${activeTab === tab.key ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-white hover:text-blue-600"}`}><TabIcon size={17} />{tab.key === "branches" ? `${branchLabel}s` : tab.key === "projects" ? `${projectLabel}s` : tab.label}</button>;
                    })}
                </nav>
            </aside>

            <main className="min-w-0 overflow-auto p-3 sm:p-5">
                {activeTab === "company" && (
                    <form onSubmit={submitCompany} className="max-w-4xl space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div><h2 className="text-xl font-black text-slate-950">Company profile</h2><p className="mt-1 text-sm font-semibold text-slate-500">Legal identity, brand, size, website, and primary operating location.</p></div>
                            {(company.isLoading || saveCompany.isPending || uploadFile.isPending) && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-600">Loading...</span>}
                        </div>
                        <div className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl bg-white">
                                    {companyForm.logo_url ? <img src={companyForm.logo_url} alt={companyForm.name || "Company logo"} className="h-full w-full object-contain p-4" /> : <Building2 size={46} className="text-slate-300" />}
                                </div>
                                <button type="button" disabled={!canManage || uploadFile.isPending} onClick={() => logoInputRef.current?.click()} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-60"><Camera size={16} />Logo</button>
                                <input ref={logoInputRef} type="file" accept="image/*" onChange={(event) => uploadLogo(event.target.files?.[0])} className="hidden" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <TextField label="Company / legal name" required value={companyForm.name} onChange={(value) => setCompanyForm((current) => ({ ...current, name: value, legal_name: value }))} placeholder="Attendio GmbH" />
                                <SearchableSelect label="Company size" value={companyForm.company_size} onChange={(value) => setCompanyForm((current) => ({ ...current, company_size: value }))} options={companySizeOptions} placeholder="Select size" />
                                <SearchableSelect
                                    label="Industry"
                                    value={companyForm.industry}
                                    onChange={(value) => setCompanyForm((current) => ({ ...current, industry: value }))}
                                    options={industryOptions}
                                    placeholder="Select industry"
                                    menuMinWidth={360}
                                    renderOption={(option) => (
                                        <span className="min-w-0">
                                            <span className="block whitespace-normal break-words font-black text-slate-900">{option.label}</span>
                                            {option.profile && <span className="mt-0.5 block text-xs font-bold text-slate-500">{option.profile} workflow{option.wz ? ` · WZ ${option.wz}` : ""}</span>}
                                        </span>
                                    )}
                                />
                                {companyForm.industry === "Other" && <TextField label="Industry name" required value={customIndustry} onChange={setCustomIndustry} placeholder="Enter industry name" />}
                                <TextField label="Registration number" value={companyForm.registration_number} onChange={(value) => setCompanyForm((current) => ({ ...current, registration_number: value }))} placeholder="HRB 123456" />
                                <TextField label="VAT ID" value={companyForm.vat_id} onChange={(value) => setCompanyForm((current) => ({ ...current, vat_id: value }))} placeholder="DE123456789" />
                                <TextField label="Address" value={companyForm.address_line} onChange={(value) => setCompanyForm((current) => ({ ...current, address_line: value }))} placeholder="Street and house number" />
                                <SearchableSelect label="Country" value={companyForm.country} onChange={(value) => setCompanyForm((current) => ({ ...current, country: value, city: "" }))} options={countryOptions} placeholder="Select country" />
                                <SearchableSelect label="City" value={companyForm.city} onChange={(value) => setCompanyForm((current) => ({ ...current, city: value }))} options={cityOptionsFor(companyForm.country)} placeholder={companyForm.country ? "Select city" : "Select country first"} allowCustom loading={isCityLoading} />
                                <TextField label="Website" value={companyForm.website} onChange={(value) => setCompanyForm((current) => ({ ...current, website: value }))} placeholder="https://company.de" />
                            </div>
                        </div>
                        <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Industry behavior preview</p>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold text-slate-500">Workflow</p>
                                    <p className="mt-1 font-black capitalize text-slate-950">{previewProfile.operating_model.replaceAll("_", " ")}</p>
                                </div>
                                <div className="rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold text-slate-500">Labels</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{previewProfile.terminology.branch}, {previewProfile.terminology.project}, {previewProfile.terminology.department}</p>
                                </div>
                                <div className="rounded-xl bg-white p-3">
                                    <p className="text-xs font-bold text-slate-500">Modules</p>
                                    <p className="mt-1 text-sm font-black text-slate-950">{previewProfile.enabled_modules.length} enabled</p>
                                </div>
                            </div>
                            <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                                Changing industry updates labels, modules, and workflow defaults. Existing records stay safe; modules without matching data will show clean empty states until configured.
                            </p>
                        </div>
                        <button disabled={!canManage || saveCompany.isPending} className="h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">{saveCompany.isPending ? "Saving..." : "Save company"}</button>
                    </form>
                )}

                {activeTab === "branches" && (
                    <section className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div><h2 className="text-xl font-black text-slate-950">{branchLabel}s</h2><p className="mt-1 text-sm font-semibold text-slate-500">{branchLabel} is a location label. Use store, site, ward, office or plant names based on your operation.</p></div>
                            <button type="button" disabled={!canManage || branchLimitReached} title={branchLimitReached ? "Free plan allows 1 branch. Upgrade to Standard to add more." : undefined} onClick={() => { setBranchForm({ ...emptyBranch, country: detectedCountry || companyForm.country || "", timezone: detectedTimeZone }); setBranchModalOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-60"><Plus size={17} />Add {branchLabel.toLowerCase()}</button>
                        </div>
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={branchQuery} onChange={(event) => setBranchQuery(event.target.value)} placeholder={`Search ${branchLabel.toLowerCase()}s`} className="h-10 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                        {branches.isLoading && <p className="rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-600">Loading {branchLabel.toLowerCase()}s...</p>}
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredBranches.map((branch) => (
                                <div key={branch.id} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-slate-950">{branch.name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{[branch.city, branch.country].filter(Boolean).join(", ") || "Location not set"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${statusClass(branch.status)}`}>{branch.status}</span></div>
                                    <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500"><Globe2 size={14} />{branch.timezone || "Timezone not set"}</p>
                                    {canManage && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setBranchForm({ ...emptyBranch, ...branch }); setBranchModalOpen(true); }} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-white text-blue-600"><Edit3 size={15} /></button><button type="button" onClick={() => deleteBranch.mutate(branch.id, { onSuccess: () => { invalidateSettings(); toast.success(`${branchLabel} deleted`); }, onError: (error) => toast.error(error.message || `Unable to delete ${branchLabel.toLowerCase()}`) })} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-600"><Trash2 size={15} /></button></div>}
                                </div>
                            ))}
                            {!branches.isLoading && !filteredBranches.length && <p className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/45 p-6 text-center text-sm font-bold text-slate-500">No {branchLabel.toLowerCase()}s found.</p>}
                        </div>
                    </section>
                )}

                {activeTab === "projects" && (
                    <section className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div><h2 className="text-xl font-black text-slate-950">{projectLabel}s</h2><p className="mt-1 text-sm font-semibold text-slate-500">Use {projectLabel.toLowerCase()}s to group work by client, unit, ward, line, department or site program.</p></div>
                            <button type="button" disabled={!canManage || projectLimitReached} title={projectLimitReached ? "Free plan allows 1 project. Upgrade to Standard to add more." : undefined} onClick={() => { setProjectForm(emptyProject); setProjectModalOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-60"><Plus size={17} />Add {projectLabel.toLowerCase()}</button>
                        </div>
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={projectQuery} onChange={(event) => { setProjectQuery(event.target.value); setProjectPage(1); }} placeholder={`Search ${projectLabel.toLowerCase()}s`} className="h-10 w-full rounded-2xl border border-blue-100 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                        {projectList.isLoading && <p className="rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-600">Loading {projectLabel.toLowerCase()}s...</p>}
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredProjects.map((project) => (
                                <div key={project.id} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                    <button type="button" onClick={() => { setSelectedProjectId(project.id); setActiveTab("organization"); }} className="flex w-full items-start justify-between gap-3 text-left"><div className="min-w-0"><p className="truncate font-black text-slate-950">{project.name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{[project.code, project.client].filter(Boolean).join(" · ") || `${projectLabel} code not set`}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${statusClass(project.status)}`}>{project.status}</span></button>
                                    <p className="mt-3 text-xs font-bold text-slate-500">{project.branch_name || "Company-wide"} · {[project.start_date, project.end_date].filter(Boolean).join(" - ") || "No date window"}</p>
                                    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setSelectedProjectId(project.id); setActiveTab("organization"); }} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-white text-slate-600"><Eye size={15} /></button>{canManage && <><button type="button" onClick={() => { setProjectForm({ ...emptyProject, ...project }); setProjectModalOpen(true); }} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 bg-white text-blue-600"><Edit3 size={15} /></button><button type="button" onClick={() => deleteProject.mutate(project.id, { onSuccess: () => { invalidateSettings(); toast.success(`${projectLabel} deleted`); }, onError: (error) => toast.error(error.message || `Unable to delete ${projectLabel.toLowerCase()}`) })} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-600"><Trash2 size={15} /></button></>}</div>
                                </div>
                            ))}
                            {!projectList.isLoading && !filteredProjects.length && <p className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/45 p-6 text-center text-sm font-bold text-slate-500">No {projectLabel.toLowerCase()}s found.</p>}
                        </div>
                        <div className="flex flex-col gap-3 border-t border-blue-100 pt-4 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>{projectTotal === 0 ? 0 : (projectPage - 1) * projectPageSize + 1}-{Math.min((projectPage - 1) * projectPageSize + filteredProjects.length, projectTotal)} of {projectTotal} {projectLabel.toLowerCase()}s · Page {projectPage} of {projectTotalPages}</p>
                            <div className="flex gap-2">
                                <button type="button" disabled={projectPage === 1} onClick={() => setProjectPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-blue-100 px-4 py-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                                <button type="button" disabled={projectPage === projectTotalPages} onClick={() => setProjectPage((current) => Math.min(projectTotalPages, current + 1))} className="rounded-2xl border border-blue-100 px-4 py-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "organization" && (
                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div><h2 className="text-xl font-black text-slate-950">Organization tree</h2><p className="mt-1 text-sm font-semibold text-slate-500">Reporting lines from employee {managerLabel.toLowerCase()} assignments, filtered by {projectLabel.toLowerCase()} when selected.</p></div>
                            <SearchableSelect
                                label=""
                                value={selectedProject?.id || ""}
                                onChange={setSelectedProjectId}
                                options={projectRows.map((project) => ({ value: project.id, label: project.name, branch: project.branch_name, code: project.code, client: project.client }))}
                                placeholder={`Select ${projectLabel.toLowerCase()}`}
                                menuMinWidth={360}
                                renderOption={(project) => (
                                    <span className="min-w-0 flex-1">
                                        <span className="block whitespace-normal break-words font-black text-slate-900">{project.label}</span>
                                        <span className="mt-0.5 block whitespace-normal break-words text-xs font-bold text-slate-500">{[project.branch || "Company-wide", project.code, project.client].filter(Boolean).join(" / ")}</span>
                                    </span>
                                )}
                            />
                        </div>
                        <div className="grid gap-4 xl:grid-cols-[minmax(16rem,.64fr)_minmax(0,1.36fr)]">
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">Tenant</p><p className="mt-2 font-black text-slate-950">{companyForm.name || "Company"}</p><p className="mt-1 text-sm font-semibold text-slate-500">{companyForm.company_size || "Company size not set"} · {companyForm.industry || "Industry not set"}</p></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl bg-blue-50 p-3"><p className="text-lg font-black text-blue-700">{branchRows.length}</p><p className="text-[11px] font-bold text-blue-600">{branchLabel}s</p></div>
                                    <div className="rounded-2xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-950">{projectRows.length}</p><p className="text-[11px] font-bold text-slate-500">{projectLabel}s</p></div>
                                    <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-lg font-black text-emerald-700">{employeeRows.length}</p><p className="text-[11px] font-bold text-emerald-700">People</p></div>
                                </div>
                                {currentEmployee && !canViewCompanyOrg && (
                                    <div className="rounded-2xl border border-blue-100 bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">My organization context</p>
                                        <div className="mt-3 space-y-3 text-sm">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{managerLabel}</p>
                                                <p className="font-black text-slate-950">{currentManager ? [currentManager.first_name, currentManager.last_name].filter(Boolean).join(" ") : currentEmployee.manager_name || "No manager assigned"}</p>
                                                {currentManager && <p className="text-xs font-bold text-slate-500">{currentManager.job_title || currentManager.role_name || currentManager.email}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{branchLabel}</p>
                                                <p className="font-black text-slate-950">{currentEmployee.branch_name || "No branch assigned"}</p>
                                                {currentEmployee.branch_id && <p className="text-xs font-bold text-slate-500">{currentBranchTeam.length} visible people in this {branchLabel.toLowerCase()}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{projectLabel}s</p>
                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                    {currentProjectRows.map((project) => <button key={project.id} type="button" onClick={() => setSelectedProjectId(project.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-black ${String(selectedProject?.id) === String(project.id) ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}>{project.name}</button>)}
                                                    {!currentProjectRows.length && <span className="text-xs font-bold text-slate-500">No {projectLabel.toLowerCase()} assigned</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {canViewCompanyOrg && (
                                    <div className="rounded-2xl border border-blue-100 bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">Company organization overview</p>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-xl bg-blue-50 px-3 py-2"><p className="text-lg font-black text-blue-700">{employeeRows.filter((employee) => employee.manager_id).length}</p><p className="text-[11px] font-bold text-blue-600">Managed people</p></div>
                                            <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-lg font-black text-slate-950">{employeeRows.filter((employee) => !employee.manager_id).length}</p><p className="text-[11px] font-bold text-slate-500">Top-level people</p></div>
                                        </div>
                                        <p className="mt-3 text-xs font-bold leading-5 text-slate-500">Owners and admins see the complete company tree. Employee-only context is shown only to scoped users.</p>
                                    </div>
                                )}
                                <div className="max-h-[min(32rem,calc(100dvh-24rem))] space-y-2 overflow-auto pr-1">
                                {branchRows.map((branch) => {
                                    const branchProjects = projectRows.filter((project) => String(project.branch_id || "") === String(branch.id));
                                    return (
                                        <div key={branch.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0"><p className="truncate font-black text-slate-950">{branch.name}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{[branch.city, branch.country].filter(Boolean).join(", ")}</p></div>
                                                <span className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-500">{branchProjects.length}</span>
                                            </div>
                                            <div className="mt-2 space-y-1.5">
                                                {branchProjects.slice(0, 4).map((project) => <button key={project.id} type="button" onClick={() => setSelectedProjectId(project.id)} className={`w-full truncate rounded-xl px-3 py-2 text-left text-xs font-black ${String(selectedProject?.id) === String(project.id) ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-blue-50"}`}>{project.name}</button>)}
                                                {branchProjects.length > 4 && <p className="px-2 text-[11px] font-bold text-slate-400">+{branchProjects.length - 4} more {projectLabel.toLowerCase()}s</p>}
                                                {!branchProjects.length && <p className="text-xs font-bold text-slate-400">No {branchLabel.toLowerCase()} {projectLabel.toLowerCase()}s.</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div><p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">{projectLabel} team</p><h3 className="mt-1 text-lg font-black text-slate-950">{selectedProject?.name || `No ${projectLabel.toLowerCase()} selected`}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{selectedProject?.branch_name || "Company-wide"} · {teamForProject.length} team member{teamForProject.length === 1 ? "" : "s"}</p></div>
                                    {selectedProject?.status && <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black capitalize ${statusClass(selectedProject.status)}`}>{selectedProject.status}</span>}
                                </div>
                                <div className="relative mt-4">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input value={orgQuery} onChange={(event) => setOrgQuery(event.target.value)} placeholder="Search people in tree" className="h-10 w-full rounded-2xl border border-blue-100 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                                </div>
                                <div className="mt-5 max-h-[36rem] overflow-auto rounded-2xl bg-white p-5">
                                    <div className="flex min-w-max items-start justify-center gap-12">
                                        {orgNodes.roots.map((employee) => <OrgTreeNode key={employee.id} employee={employee} childrenByManager={orgNodes.children} />)}
                                        {!orgNodes.roots.length && <p className="rounded-2xl border border-dashed border-blue-200 bg-white p-6 text-sm font-bold text-slate-500">{selectedProject ? `No employees assigned to this ${projectLabel.toLowerCase()}.` : `No reporting lines found. Assign ${managerLabel.toLowerCase()}s from Employees.`}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === "connect" && (
                    <section className="space-y-5">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Connect apps</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Connect meeting providers through OAuth for scheduling workflows. Imported events and live sync need the provider webhook worker to be running.</p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            {integrationProviders.map((provider) => {
                                const state = companyIntegrations?.[provider.key] || {};
                                const config = integrationConfig.data?.data?.[provider.key];
                                const connected = state.status === "connected";
                                const configured = config?.configured !== false;
                                const busy = connectingProvider === provider.key && saveCompany.isPending;
                                const standardLocked = !standardFeaturesActive && !connected;
                                return (
                                    <div key={provider.key} className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 gap-3">
                                                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${connected ? "bg-emerald-100 text-emerald-700" : "bg-white text-blue-600"}`}>
                                                    {connected ? <CheckCircle2 size={20} /> : <Globe2 size={20} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="truncate font-black text-slate-950">{provider.name}</h3>
                                                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{provider.description}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : configured ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{connected ? "Connected" : configured ? "Disconnected" : "Setup needed"}</span>
                                        </div>
                                        {!configured && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">Missing OAuth credentials. Add `MICROSOFT_CLIENT_SECRET` in the auth service env and restart backend. Redirect URI in Azure must include `{config?.sso_redirect_uri || "http://localhost:8090/api/v1/auth/sso/callback"}` and `http://localhost:8090/api/v1/auth/integrations/callback`.</div>}
                                        {standardLocked && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-700">Calendar integrations are included in Standard. Upgrade when billing enforcement is enabled.</div>}
                                        {connected && <div className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">Scheduling source: <span className="font-black text-slate-800">{provider.scheduleLabel}</span>{state.connected_at ? ` · Connected ${new Date(state.connected_at).toLocaleDateString()}` : ""}</div>}
                                        <div className="mt-4 flex justify-end">
                                            {connected ? (
                                                <button type="button" disabled={!canManage || busy} onClick={() => setDisconnectConfirm(provider)} className="h-10 rounded-2xl border border-red-100 bg-white px-4 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60">{busy ? "Disconnecting..." : "Disconnect"}</button>
                                            ) : (
                                                <button type="button" disabled={!canManage || busy || standardLocked} onClick={() => connectIntegration(provider)} className="h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60">{busy ? "Opening OAuth..." : standardLocked ? "Standard only" : "Connect"}</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm font-semibold leading-6 text-slate-500">
                            OAuth connection is real. For full real-time schedule import, add webhook subscriptions and a sync worker that maps provider events into internal schedule assignments.
                        </div>
                    </section>
                )}

                {activeTab === "billing" && canManageBilling && (
                    <section className="space-y-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Billing</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">Company subscription, trial status, payment method, invoices, and plan changes. Employees never see this area.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => startCheckout("standard")} disabled={billingCheckout.isPending || standardPaidActive} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"><ReceiptText size={16} />Upgrade</button>
                            </div>
                        </div>

                        {billingStatus.isLoading && <div className="rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-600">Loading billing status...</div>}

                        <div className="rounded-[1.2rem] border border-blue-100 bg-white p-2 shadow-lg shadow-blue-500/5">
                            <div className="flex gap-1 overflow-x-auto">
                                {[
                                    { key: "overview", label: "Overview" },
                                    { key: "plans", label: "Plans" },
                                    { key: "license", label: "License" },
                                    { key: "invoices", label: "Invoices" },
                                ].map((tab) => (
                                    <button key={tab.key} type="button" onClick={() => setActiveBillingTab(tab.key)} className={`h-10 shrink-0 rounded-2xl px-4 text-sm font-black transition ${activeBillingTab === tab.key ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{tab.label}</button>
                                ))}
                            </div>
                        </div>

                        {activeBillingTab === "overview" && (
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]">
                                <div className="rounded-2xl border border-blue-100 bg-slate-50 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Current plan</p>
                                            <h3 className="mt-2 text-2xl font-black text-slate-950">{activePlan?.name || "Free"}</h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">{activePlan ? `${money(activePlan.price_cents, activePlan.currency)} / month` : "Plan loading"}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${billingSubscription.requires_payment ? "bg-red-100 text-red-700" : billingSubscription.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{billingSubscription.status || "trialing"}</span>
                                    </div>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Billing switch</p><p className="mt-1 font-black text-slate-950">{billingSubscription.billing_enabled ? "Enabled" : "Disabled"}</p></div>
                                        <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Trial left</p><p className="mt-1 font-black text-slate-950">{billingSubscription.trial_days_remaining ?? 0} days</p></div>
                                        <div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-slate-500">Provider</p><p className="mt-1 font-black capitalize text-slate-950">{billingSubscription.provider || "manual"}</p></div>
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-white p-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-500">Payment method</p>
                                                <p className="mt-1 font-black text-slate-950">
                                                    {billingPaymentMethod ? `${String(billingPaymentMethod.brand || "Card").toUpperCase()} ending ${billingPaymentMethod.last4}` : billingCustomer.status === "linked" ? "Provider customer linked" : "No payment method saved"}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    {billingPaymentMethod?.exp_month ? `Expires ${String(billingPaymentMethod.exp_month).padStart(2, "0")}/${billingPaymentMethod.exp_year}` : billingCustomer.billing_email || "Cards are stored by the payment provider, not Attendio."}
                                                </p>
                                            </div>
                                            <button type="button" onClick={openCardModal} disabled={billingAttachPaymentMethod.isPending} className="h-10 rounded-2xl border border-blue-100 px-4 text-sm font-black text-blue-600 hover:bg-blue-50 disabled:opacity-60">{billingCustomer.status === "linked" ? "Update card" : "Add payment"}</button>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                                        {billingEntitlements.enabled ? (
                                            <span>Active access mode: <b className="capitalize text-slate-950">{billingEntitlements.mode || "free"}</b>{billingEntitlements.can_download === false ? " · downloads locked on Free" : " · downloads enabled"}</span>
                                        ) : (
                                            <span>Billing enforcement is off. All workspaces stay unrestricted until the platform switch is enabled.</span>
                                        )}
                                    </div>
                                    {billingSubscription.requires_payment && (
                                        <div className="mt-4 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                            Trial or payment needs attention. Owners/admins should update payment before workspace access is restricted.
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-blue-100 bg-white p-5">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">License state</p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl bg-blue-50 p-4">
                                            <p className="text-xs font-bold text-blue-600">License key</p>
                                            <p className="mt-1 break-all font-black text-slate-950">{billingLicense.masked_key || "Allocating..."}</p>
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Status</span>
                                                <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${billingLicense.status === "active" ? "bg-emerald-100 text-emerald-700" : billingLicense.status === "expired" || billingSubscription.requires_payment ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{billingSubscription.requires_payment ? "inactive" : billingLicense.status || "allocated"}</span>
                                            </div>
                                            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">License is issued automatically after account verification and follows payment status.</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs font-bold text-slate-500">License status</p>
                                            <p className="mt-1 font-black capitalize text-slate-950">{billingLicense.status || "allocated"}</p>
                                            <p className="mt-1 text-xs font-bold text-slate-500">{billingLicense.expires_at ? `Expires ${new Date(billingLicense.expires_at).toLocaleDateString()}` : "Activates after payment"}</p>
                                            {billingSubscription.requires_payment && <button type="button" onClick={() => startCheckout("standard")} disabled={billingCheckout.isPending} className="mt-3 h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-60">Retry payment</button>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeBillingTab === "plans" && (
                            <div className="rounded-[1.2rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-500/5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Monthly plans</p>
                                        <h3 className="mt-1 text-2xl font-black text-slate-950">Upgrade your plan</h3>
                                    </div>
                                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Monthly billing only</span>
                                </div>
                                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                    {billingPlans.filter((plan) => ["free", "standard"].includes(plan.key)).map((plan) => {
                                        const selected = plan.key === (billingSubscription.plan_key || "free");
                                        const isStandard = plan.key === "standard";
                                        const features = isStandard
                                            ? ["30 EUR monthly license", "Unlimited branches and projects", "Team growth beyond 10 members", "Downloads, exports, invoices, and Teams calendar sync"]
                                            : ["1 branch", "1 project", "10 team members", "Downloads, exports, and external calendar sync locked"];
                                        return (
                                            <div key={plan.key} className={`relative flex min-h-[22rem] flex-col rounded-[1.15rem] border p-5 transition ${isStandard ? "border-blue-400 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-500/20" : "border-blue-100 bg-slate-50 text-slate-950"} ${isStandard && highlightStandardPlan ? "ring-4 ring-blue-200 ring-offset-2" : ""}`}>
                                                {isStandard && <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">Recommended</span>}
                                                <p className={`text-2xl font-black ${isStandard ? "text-white" : "text-slate-950"}`}>{plan.name}</p>
                                                <div className="mt-5 flex items-end gap-2">
                                                    <span className={`text-5xl font-black ${isStandard ? "text-white" : "text-slate-950"}`}>{money(plan.price_cents, plan.currency).replace(/\.00$/, "")}</span>
                                                    <span className={`pb-2 text-sm font-bold ${isStandard ? "text-blue-100" : "text-slate-500"}`}>/ month</span>
                                                </div>
                                                <p className={`mt-3 text-sm font-semibold leading-6 ${isStandard ? "text-blue-50" : "text-slate-500"}`}>{plan.description}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => selected && !(isStandard && billingSubscription.requires_payment) ? undefined : startCheckout(plan.key)}
                                                    disabled={(selected && !(isStandard && billingSubscription.requires_payment)) || billingCheckout.isPending}
                                                    className={`mt-5 h-11 rounded-2xl text-sm font-black transition disabled:cursor-not-allowed ${selected ? isStandard ? "bg-white/20 text-blue-100" : "bg-slate-200 text-slate-500" : isStandard ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                                >
                                                    {selected ? isStandard && billingSubscription.requires_payment ? "Retry payment" : "Current plan" : isStandard ? "Upgrade" : "Use Free"}
                                                </button>
                                                <div className={`mt-6 space-y-3 text-sm font-semibold ${isStandard ? "text-blue-50" : "text-slate-600"}`}>
                                                    {features.map((feature) => (
                                                        <div key={feature} className="flex items-center gap-3">
                                                            <CheckCircle2 className={`h-4 w-4 shrink-0 ${isStandard ? "text-white" : "text-blue-600"}`} />
                                                            <span>{feature}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className={`mt-auto pt-6 text-xs font-bold ${isStandard ? "text-blue-100" : "text-slate-500"}`}>{isStandard ? "Payment renews and extends the active license every month." : "Free limits apply only after billing enforcement is enabled."}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeBillingTab === "license" && (
                            <div className="rounded-2xl border border-blue-100 bg-white p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Workspace license</p>
                                        <h3 className="mt-1 text-xl font-black text-slate-950">{billingLicense.masked_key || "License allocating"}</h3>
                                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Every verified company gets one allocated key automatically. Payment success activates it and each successful monthly renewal extends its expiry date.</p>
                                    </div>
                                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black capitalize ${billingLicense.status === "active" ? "bg-emerald-100 text-emerald-700" : billingLicense.status === "expired" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{billingLicense.status || "allocated"}</span>
                                </div>
                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Seats</p><p className="mt-1 text-lg font-black text-slate-950">{billingLicense.seats || activePlan?.included_employees || 0}</p></div>
                                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Activated</p><p className="mt-1 font-black text-slate-950">{billingLicense.activated_at ? new Date(billingLicense.activated_at).toLocaleDateString() : "Not yet"}</p></div>
                                    <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Expires</p><p className="mt-1 font-black text-slate-950">{billingLicense.expires_at ? new Date(billingLicense.expires_at).toLocaleDateString() : "After payment"}</p></div>
                                </div>
                                {billingSubscription.requires_payment && <button type="button" onClick={() => startCheckout("standard")} disabled={billingCheckout.isPending} className="mt-5 h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">Retry payment</button>}
                            </div>
                        )}

                        {activeBillingTab === "invoices" && (
                            <div className="rounded-2xl border border-blue-100 bg-white p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">History</p>
                                        <h3 className="mt-1 text-lg font-black text-slate-950">Invoices and payments</h3>
                                    </div>
                                    {billingInvoices.isLoading && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">Loading...</span>}
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                            <tr><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Provider</th><th className="py-2 text-right">Action</th></tr>
                                        </thead>
                                        <tbody className="font-bold text-slate-600">
                                            {invoiceRows.map((invoice) => (
                                                <tr key={invoice.id} className="border-t border-blue-50">
                                                    <td className="py-3 pr-4">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : "-"}</td>
                                                    <td className="py-3 pr-4">{money(invoice.amount_cents, invoice.currency)}</td>
                                                    <td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${invoice.status === "paid" ? "bg-emerald-100 text-emerald-700" : invoice.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{invoice.status}</span></td>
                                                    <td className="py-3 pr-4 capitalize">{invoice.provider}</td>
                                                    <td className="py-3 text-right">{(invoice.hosted_payment_url || invoice.invoice_url) ? <a href={invoice.hosted_payment_url || invoice.invoice_url} className="font-black text-blue-600">Open</a> : <span className="text-slate-400">-</span>}</td>
                                                </tr>
                                            ))}
                                            {!invoiceRows.length && <tr><td colSpan={5} className="border-t border-blue-50 py-6 text-center text-slate-400">No invoices yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {branchModalOpen && (
                <Modal title={branchForm.id ? `Edit ${branchLabel.toLowerCase()}` : `Add ${branchLabel.toLowerCase()}`} onClose={() => setBranchModalOpen(false)}>
                    <form onSubmit={submitBranch} className="grid gap-4 p-5">
                        <TextField label={`${branchLabel} display name`} required value={branchForm.name} onChange={(value) => setBranchForm((current) => ({ ...current, name: value }))} placeholder={branchLabel === "Ward" ? "Emergency ward" : branchLabel === "Store" ? "Downtown store" : "Main site"} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <SearchableSelect label="Country" value={branchForm.country} onChange={(value) => setBranchForm((current) => ({ ...current, country: value, city: "" }))} options={countryOptions} placeholder="Select country" required />
                            <SearchableSelect label="City" value={branchForm.city} onChange={(value) => setBranchForm((current) => ({ ...current, city: value }))} options={cityOptionsFor(branchForm.country)} placeholder={branchForm.country ? "Select city" : "Select country first"} allowCustom loading={isCityLoading} />
                            <SearchableSelect label="Status" value={branchForm.status} onChange={(value) => setBranchForm((current) => ({ ...current, status: value }))} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
                        </div>
                        <button disabled={saveBranch.isPending} className="h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">{saveBranch.isPending ? "Saving..." : `Save ${branchLabel.toLowerCase()}`}</button>
                    </form>
                </Modal>
            )}
            {disconnectConfirm && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[1.2rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/20">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Disconnect app</p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">Disconnect {disconnectConfirm.name}?</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">New calendar sync will stop immediately. Existing schedules stay in Attendio unless you delete them separately.</p>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setDisconnectConfirm(null)} disabled={Boolean(connectingProvider)} className="h-11 rounded-2xl border border-blue-100 text-sm font-black text-slate-600 hover:bg-blue-50 disabled:opacity-60">Cancel</button>
                            <button type="button" onClick={() => disconnectIntegration(disconnectConfirm)} disabled={Boolean(connectingProvider)} className="h-11 rounded-2xl bg-red-600 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60">{connectingProvider ? "Disconnecting..." : "Disconnect"}</button>
                        </div>
                    </div>
                </div>
            )}

            {cardModalOpen && (
                <Modal title={billingPaymentMethod ? "Update payment method" : "Add payment method"} onClose={() => setCardModalOpen(false)}>
                    <form onSubmit={attachPaymentMethod} className="grid gap-4 p-5">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                            <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-600"><CreditCard size={18} /></div>
                                <div>
                                    <p className="text-sm font-black text-slate-950">Secure card setup</p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">Only the safe card summary is saved. Full card number and CVC are never stored in Attendio.</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField label="Cardholder name" required value={cardForm.holder_name} onChange={(value) => setCardForm((current) => ({ ...current, holder_name: value }))} placeholder="Name on card" />
                            <TextField label="Billing email" type="email" value={cardForm.billing_email} onChange={(value) => setCardForm((current) => ({ ...current, billing_email: value }))} placeholder="billing@company.com" />
                        </div>
                        <TextField label="Card number" required value={cardForm.number} onChange={(value) => setCardForm((current) => ({ ...current, number: value.replace(/[^\d ]/g, "").slice(0, 23) }))} placeholder="4242 4242 4242 4242">
                            <div className="relative">
                                <input
                                    required
                                    inputMode="numeric"
                                    autoComplete="cc-number"
                                    value={cardForm.number}
                                    onChange={(event) => setCardForm((current) => ({ ...current, number: event.target.value.replace(/[^\d ]/g, "").slice(0, 23) }))}
                                    placeholder="4242 4242 4242 4242"
                                    className={`${inputClassName} pr-28 ${cardDigits.length >= 12 && !cardNumberOk ? "border-red-300 bg-red-50" : ""}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">{cardBrand}</span>
                            </div>
                        </TextField>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <TextField label="Expiry month" required value={cardForm.exp_month} onChange={(value) => setCardForm((current) => ({ ...current, exp_month: value.replace(/\D/g, "").slice(0, 2) }))} placeholder="MM">
                                <input required inputMode="numeric" autoComplete="cc-exp-month" value={cardForm.exp_month} onChange={(event) => setCardForm((current) => ({ ...current, exp_month: event.target.value.replace(/\D/g, "").slice(0, 2) }))} placeholder="MM" className={`${inputClassName} ${cardForm.exp_month && !/^(0[1-9]|1[0-2])$/.test(cardForm.exp_month) ? "border-red-300 bg-red-50" : ""}`} />
                            </TextField>
                            <TextField label="Expiry year" required value={cardForm.exp_year} onChange={(value) => setCardForm((current) => ({ ...current, exp_year: value.replace(/\D/g, "").slice(0, 4) }))} placeholder="YYYY">
                                <input required inputMode="numeric" autoComplete="cc-exp-year" value={cardForm.exp_year} onChange={(event) => setCardForm((current) => ({ ...current, exp_year: event.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="YYYY" className={`${inputClassName} ${cardForm.exp_year.length === 4 && !cardExpiryOk ? "border-red-300 bg-red-50" : ""}`} />
                            </TextField>
                            <TextField label="CVC" required value={cardForm.cvc} onChange={(value) => setCardForm((current) => ({ ...current, cvc: value.replace(/\D/g, "").slice(0, 4) }))} placeholder={cardBrand === "amex" ? "1234" : "123"}>
                                <input required inputMode="numeric" autoComplete="cc-csc" value={cardForm.cvc} onChange={(event) => setCardForm((current) => ({ ...current, cvc: event.target.value.replace(/\D/g, "").slice(0, cardBrand === "amex" ? 4 : 3) }))} placeholder={cardBrand === "amex" ? "1234" : "123"} className={`${inputClassName} ${cardForm.cvc && !cardCvcOk ? "border-red-300 bg-red-50" : ""}`} />
                            </TextField>
                        </div>
                        <div className={`rounded-2xl border p-4 text-sm font-bold ${cardReady ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                            {cardReady ? "Card format, expiry, and security code look valid." : cardDigits.length >= 12 && !cardNumberOk ? "Card number does not pass validation. Check the digits before saving." : cardForm.exp_year.length === 4 && !cardExpiryOk ? "Card expiry is invalid or already expired." : cardForm.cvc && !cardCvcOk ? `${cardBrand === "amex" ? "Amex needs a 4 digit CVC." : "CVC must be exactly 3 digits."}` : !cardEmailOk ? "Billing email is not valid." : "Enter card details to validate the network, number, expiry, and CVC."}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setCardModalOpen(false)} disabled={billingAttachPaymentMethod.isPending} className="h-11 rounded-2xl border border-blue-100 text-sm font-black text-slate-600 hover:bg-blue-50 disabled:opacity-60">Cancel</button>
                            <button type="submit" disabled={!cardReady || billingAttachPaymentMethod.isPending} className="h-11 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60">{billingAttachPaymentMethod.isPending ? "Saving..." : "Save card"}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {projectModalOpen && (
                <Modal title={projectForm.id ? `Edit ${projectLabel.toLowerCase()}` : `Add ${projectLabel.toLowerCase()}`} onClose={() => setProjectModalOpen(false)}>
                    <form onSubmit={submitProject} className="grid gap-4 p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField label={`${projectLabel} name`} required value={projectForm.name} onChange={(value) => setProjectForm((current) => ({ ...current, name: value }))} placeholder={projectLabel === "Unit" ? "Emergency unit" : projectLabel === "Line" ? "Assembly line A" : "Client rollout"} />
                            <TextField label={`${projectLabel} code`} value={projectForm.code} onChange={(value) => setProjectForm((current) => ({ ...current, code: value.toUpperCase() }))} placeholder="Auto if empty">
                                <div className="flex gap-2">
                                    <input value={projectForm.code} onChange={(event) => setProjectForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Auto if empty" className={inputClassName} />
                                    <button type="button" onClick={() => setProjectCodeNonce((currentNonce) => { const nextNonce = currentNonce + 1; setProjectForm((current) => ({ ...current, code: generateProjectCode(nextNonce - 1) })); return nextNonce; })} className="inline-flex h-11 items-center gap-1 rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100"><Wand2 size={14} />Auto</button>
                                </div>
                            </TextField>
                            <TextField label="Owner / client" value={projectForm.client} onChange={(value) => setProjectForm((current) => ({ ...current, client: value }))} placeholder="Client, contract, or internal owner" />
                            <SearchableSelect label={branchLabel} value={projectForm.branch_id} onChange={(value) => setProjectForm((current) => ({ ...current, branch_id: value }))} options={activeBranchOptions} placeholder="Company-wide" />
                            <SearchableSelect label="Status" value={projectForm.status} onChange={(value) => setProjectForm((current) => ({ ...current, status: value }))} options={[{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }, { value: "inactive", label: "Inactive" }]} />
                            <TextField label="Start date" type="date" value={projectForm.start_date} onChange={(value) => setProjectForm((current) => ({ ...current, start_date: value }))} />
                            <TextField label="End date" type="date" value={projectForm.end_date} onChange={(value) => setProjectForm((current) => ({ ...current, end_date: value }))} />
                        </div>
                        <button disabled={saveProject.isPending} className="h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">{saveProject.isPending ? "Saving..." : `Save ${projectLabel.toLowerCase()}`}</button>
                    </form>
                </Modal>
            )}
        </div>
    );
}
