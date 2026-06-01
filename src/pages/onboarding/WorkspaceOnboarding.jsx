import React, { useMemo, useState } from "react";
import { Check, ChevronRight, Globe2, Layers3, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/auth-context.jsx";
import { useUpdateCompanySettingsMutation } from "../../hooks/useAuthService.ts";
import { companySizes, industryOptions, languageOptions, moduleCatalog, resolveWorkspaceProfile } from "../../config/workspaceProfiles.js";

const fieldClass = "h-11 w-full rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100";

export default function WorkspaceOnboarding() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const saveCompany = useUpdateCompanySettingsMutation();
    const initialProfile = resolveWorkspaceProfile(user?.company || {});
    const [form, setForm] = useState({
        name: user?.company?.name || "",
        industry: user?.company?.industry || "Software",
        company_size: user?.company?.company_size || "",
        language: user?.company?.language || "en",
        operating_model: user?.company?.operating_model || initialProfile.operating_model,
        enabled_modules: user?.company?.enabled_modules?.length ? user.company.enabled_modules : initialProfile.enabled_modules,
    });
    const selectedProfile = useMemo(() => resolveWorkspaceProfile({ industry: form.industry }), [form.industry]);
    const selectedModules = new Set(form.enabled_modules);

    const updateIndustry = (industry) => {
        const profile = resolveWorkspaceProfile({ industry });
        setForm((current) => ({
            ...current,
            industry,
            operating_model: profile.operating_model,
            enabled_modules: profile.enabled_modules,
        }));
    };

    const toggleModule = (key) => {
        setForm((current) => {
            const next = new Set(current.enabled_modules);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return { ...current, enabled_modules: [...next] };
        });
    };

    const submit = (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
            toast.error("Company name is required");
            return;
        }
        if (!form.company_size) {
            toast.error("Choose company size");
            return;
        }
        const payload = {
            ...form,
            terminology: selectedProfile.terminology,
            onboarding_completed: true,
        };
        saveCompany.mutate(payload, {
            onSuccess: (response) => {
                const company = response?.data || {};
                updateUser({ company: { ...(user?.company || {}), ...company } });
                queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
                queryClient.invalidateQueries({ queryKey: ["auth", "company-settings"] });
                toast.success("Workspace configured");
                navigate("/dashboard", { replace: true });
            },
            onError: (error) => toast.error(error.message || "Unable to configure workspace"),
        });
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-6 sm:px-6">
            <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-500/5 sm:p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Workspace setup</p>
                    <h1 className="mt-3 text-3xl font-black text-slate-950">Shape Attendio for your operation</h1>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                        These answers configure labels, modules, and defaults without changing the underlying data model.
                    </p>

                    <div className="mt-6 grid gap-4">
                        <label className="grid gap-2 text-left">
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Company name</span>
                            <input className={fieldClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Company name" />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-left">
                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Company size</span>
                                <select className={fieldClass} value={form.company_size} onChange={(event) => setForm((current) => ({ ...current, company_size: event.target.value }))}>
                                    <option value="">Select size</option>
                                    {companySizes.map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </label>
                            <label className="grid gap-2 text-left">
                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Language</span>
                                <select className={fieldClass} value={form.language} onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}>
                                    {languageOptions.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                                </select>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="grid gap-5">
                    <div className="rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-500/5">
                        <div className="flex items-center gap-2">
                            <Layers3 size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-950">Industry profile</h2>
                        </div>
                        <div className="mt-4 grid gap-4">
                            <label className="grid gap-2 text-left">
                                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Industry</span>
                                <select className={fieldClass} value={form.industry} onChange={(event) => updateIndustry(event.target.value)}>
                                    {industryOptions.filter((item) => item.value !== "Other").map((industry) => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
                                </select>
                            </label>
                            <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-black text-slate-950">{selectedProfile.label}</p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{selectedProfile.operating_model.replaceAll("_", " ")}</p>
                                    </div>
                                    <Check size={18} className="text-blue-600" />
                                </div>
                                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{selectedProfile.summary}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-blue-100 bg-white p-5 shadow-lg shadow-blue-500/5">
                        <div className="flex items-center gap-2">
                            <Settings2 size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-950">Modules</h2>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {moduleCatalog.map((module) => (
                                <label key={module.key} className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black ${selectedModules.has(module.key) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-blue-100 bg-slate-50 text-slate-600"}`}>
                                    <input type="checkbox" checked={selectedModules.has(module.key)} onChange={() => toggleModule(module.key)} className="h-4 w-4 accent-blue-600" />
                                    {module.label}
                                </label>
                            ))}
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                            <Globe2 size={16} className="mb-2 text-blue-600" />
                            Labels will use this profile: {selectedProfile.terminology.branch}, {selectedProfile.terminology.department}, {selectedProfile.terminology.project}, {selectedProfile.terminology.manager}.
                        </div>
                    </div>

                    <button disabled={saveCompany.isPending} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {saveCompany.isPending ? "Configuring..." : "Finish setup"} <ChevronRight size={17} />
                    </button>
                </section>
            </form>
        </div>
    );
}
