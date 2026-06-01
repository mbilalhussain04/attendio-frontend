export const moduleCatalog = [
    { key: "attendance", label: "Attendance" },
    { key: "employees", label: "Employees" },
    { key: "leaves", label: "Leaves" },
    { key: "timesheets", label: "Timesheets" },
    { key: "projects", label: "Projects" },
    { key: "rules", label: "Rules" },
    { key: "kiosk", label: "Kiosk" },
    { key: "scheduling", label: "Scheduling" },
];

export const industryProfiles = [
    {
        key: "Software",
        label: "Software / Professional Services",
        operating_model: "project_based",
        enabled_modules: ["attendance", "employees", "leaves", "timesheets", "projects", "rules", "scheduling"],
        terminology: { branch: "Office", project: "Project", department: "Team", manager: "Manager" },
        summary: "Best for agencies, SaaS, schools, offices, consultancies, and project/team driven work.",
    },
    {
        key: "Healthcare",
        label: "Hospital / Healthcare",
        operating_model: "shift_based",
        enabled_modules: ["attendance", "employees", "leaves", "timesheets", "rules", "kiosk", "scheduling"],
        terminology: { branch: "Facility", project: "Unit", department: "Ward", manager: "Supervisor" },
        summary: "Best for hospitals, clinics, care homes, pharmacies, and rota-heavy medical teams.",
    },
    {
        key: "Retail",
        label: "Retail / Shopping Mart",
        operating_model: "shift_based",
        enabled_modules: ["attendance", "employees", "leaves", "timesheets", "rules", "kiosk", "scheduling"],
        terminology: { branch: "Store", project: "Department", department: "Section", manager: "Supervisor" },
        summary: "Best for stores, restaurants, clothing brands, supermarkets, salons, and customer-facing shifts.",
    },
    {
        key: "Manufacturing",
        label: "Manufacturing / Factory",
        operating_model: "shift_based",
        enabled_modules: ["attendance", "employees", "leaves", "timesheets", "rules", "kiosk", "scheduling"],
        terminology: { branch: "Site", project: "Line", department: "Unit", manager: "Supervisor" },
        summary: "Best for factories, production lines, workshops, warehouses, and industrial operations.",
    },
    {
        key: "Field services",
        label: "Field Services / Security",
        operating_model: "site_based",
        enabled_modules: ["attendance", "employees", "leaves", "timesheets", "projects", "rules", "kiosk", "scheduling"],
        terminology: { branch: "Region", project: "Client Site", department: "Crew", manager: "Supervisor" },
        summary: "Best for construction, security, cleaning, delivery, logistics, and client-site operations.",
    },
];

export const industryCatalog = [
    { value: "Agriculture", label: "Agriculture / Farming", profile: "Manufacturing", wz: "A", keywords: "landwirtschaft farm seasonal field" },
    { value: "Automotive", label: "Automotive / Workshop", profile: "Manufacturing", wz: "C/G", keywords: "auto werkstatt repair dealership production" },
    { value: "Aviation", label: "Aviation / Airport Services", profile: "Field services", wz: "H", keywords: "airport aviation ground handling airline" },
    { value: "Banking", label: "Banking", profile: "Software", wz: "K", keywords: "bank finance office compliance" },
    { value: "Beauty salon", label: "Beauty Salon / Barber", profile: "Retail", wz: "S", keywords: "salon barber kosmetik appointments shifts" },
    { value: "Cleaning services", label: "Cleaning Services", profile: "Field services", wz: "N", keywords: "cleaning facility client site crew" },
    { value: "Clothing brand", label: "Clothing Brand / Fashion Retail", profile: "Retail", wz: "G", keywords: "fashion apparel clothing store retail boutique" },
    { value: "Construction", label: "Construction / Handwerk", profile: "Field services", wz: "F", keywords: "bau handwerk Baustelle trades site crew" },
    { value: "Consulting", label: "Consulting", profile: "Software", wz: "M", keywords: "consultancy professional services project" },
    { value: "Education", label: "Education / Ausbildung Provider", profile: "Software", wz: "P", keywords: "schule ausbildung training academy college" },
    { value: "Energy", label: "Energy / Utilities Operations", profile: "Manufacturing", wz: "D", keywords: "energy utility plant grid operations" },
    { value: "Field services", label: "Field Services", profile: "Field services", wz: "N", keywords: "field service onsite technicians" },
    { value: "Financial services", label: "Financial Services", profile: "Software", wz: "K", keywords: "finance insurance advisory" },
    { value: "Food and beverage", label: "Food & Beverage Production", profile: "Manufacturing", wz: "C", keywords: "food production beverage kitchen manufacturing" },
    { value: "Government", label: "Government / Public Sector", profile: "Software", wz: "O", keywords: "public administration office" },
    { value: "Healthcare", label: "Healthcare / Hospital", profile: "Healthcare", wz: "Q", keywords: "hospital clinic pflege praxis medical" },
    { value: "Hospitality", label: "Hotel / Hospitality", profile: "Retail", wz: "I", keywords: "hotel front desk housekeeping restaurant shifts" },
    { value: "Insurance", label: "Insurance", profile: "Software", wz: "K", keywords: "insurance broker claims office" },
    { value: "Legal services", label: "Legal Services", profile: "Software", wz: "M", keywords: "law legal Kanzlei office" },
    { value: "Logistics", label: "Logistics / Delivery", profile: "Field services", wz: "H", keywords: "warehouse delivery transport Fahrer route" },
    { value: "Manufacturing", label: "Manufacturing / Factory", profile: "Manufacturing", wz: "C", keywords: "factory production line industrie" },
    { value: "Media", label: "Media / Creative Studio", profile: "Software", wz: "J", keywords: "media studio production creative project" },
    { value: "Nonprofit", label: "Nonprofit / NGO", profile: "Software", wz: "S", keywords: "ngo charity association Verein" },
    { value: "Pharmaceuticals", label: "Pharmaceuticals / Pharmacy", profile: "Healthcare", wz: "C/Q", keywords: "pharma apotheke pharmacy medical" },
    { value: "Professional services", label: "Professional Services", profile: "Software", wz: "M", keywords: "agency services office client project" },
    { value: "Real estate", label: "Real Estate / Property Management", profile: "Field services", wz: "L", keywords: "property facility site inspections" },
    { value: "Restaurant", label: "Restaurant / Gastronomie", profile: "Retail", wz: "I", keywords: "restaurant cafe bar gastronomie kitchen service" },
    { value: "Retail", label: "Retail / Store", profile: "Retail", wz: "G", keywords: "shop store supermarket mart cashier" },
    { value: "Security services", label: "Security Services", profile: "Field services", wz: "N", keywords: "security guard client site patrol" },
    { value: "Software", label: "Software / SaaS", profile: "Software", wz: "J", keywords: "software it saas engineering remote" },
    { value: "Technology", label: "Technology / IT Services", profile: "Software", wz: "J", keywords: "it technology support managed services" },
    { value: "Telecommunications", label: "Telecommunications", profile: "Field services", wz: "J", keywords: "telecom network installation technicians" },
    { value: "Transportation", label: "Transportation", profile: "Field services", wz: "H", keywords: "transport bus delivery fleet drivers" },
    { value: "Utilities", label: "Utilities", profile: "Manufacturing", wz: "D/E", keywords: "utility water power plant maintenance" },
];

export const industryOptions = [...industryCatalog, { value: "Other", label: "Other / Custom industry", profile: "Software", wz: "", keywords: "custom" }].map((item) => ({
    value: item.value,
    label: item.label,
    profile: item.profile,
    wz: item.wz,
    searchText: `${item.value} ${item.label} ${item.profile} ${item.wz} ${item.keywords || ""}`,
}));

export const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export const languageOptions = [
    { value: "en", label: "English" },
    { value: "de", label: "German" },
    { value: "ur", label: "Urdu" },
    { value: "ar", label: "Arabic" },
];

export const defaultWorkspaceProfile = industryProfiles[0];

function profileForIndustry(industry) {
    const normalized = String(industry || "").trim().toLowerCase();
    if (!normalized) return defaultWorkspaceProfile;
    const exact = industryProfiles.find((profile) => profile.key.toLowerCase() === normalized);
    if (exact) return exact;
    const catalogItem = industryCatalog.find((item) => item.value.toLowerCase() === normalized || item.label.toLowerCase() === normalized);
    if (catalogItem) return industryProfiles.find((profile) => profile.key === catalogItem.profile) || defaultWorkspaceProfile;
    return defaultWorkspaceProfile;
}

export function resolveWorkspaceProfile(company = {}) {
    const selected = profileForIndustry(company.industry);
    return {
        ...selected,
        company_size: company.company_size || "",
        language: company.language || "en",
        operating_model: company.operating_model || selected.operating_model,
        enabled_modules: company.enabled_modules?.length ? company.enabled_modules : selected.enabled_modules,
        terminology: { ...selected.terminology, ...(company.terminology || {}) },
        onboarding_completed: Boolean(company.onboarding_completed),
    };
}

export function labelFor(company, key, fallback) {
    return resolveWorkspaceProfile(company).terminology[key] || fallback;
}

export function moduleEnabled(company, key) {
    const profile = resolveWorkspaceProfile(company);
    return profile.enabled_modules.includes(key);
}
