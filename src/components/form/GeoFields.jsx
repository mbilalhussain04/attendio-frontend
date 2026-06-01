import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

function normalizeOption(option) {
    return typeof option === "string" ? { value: option, label: option } : option;
}

export function SearchableSelect({ label, value, onChange, options, placeholder = "Select", allowCustom = false, compact = false, required = false, loading = false, renderOption, menuMinWidth = 0 }) {
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
    const canUseCustom = allowCustom && query.trim() && !normalizedOptions.some((option) => option.label.toLowerCase() === query.trim().toLowerCase());
    const place = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return false;
        const width = Math.min(window.innerWidth - 24, compact ? Math.max(176, rect.width, menuMinWidth) : Math.max(rect.width, menuMinWidth));
        const top = rect.bottom + 2;
        const maxHeight = Math.min(256, Math.max(80, window.innerHeight - top - 12));
        const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
        setMenuStyle({ position: "fixed", left, top, width, maxHeight, zIndex: 160 });
        return true;
    };

    useEffect(() => {
        if (!isOpen) return undefined;
        place();
        window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        const close = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", close);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            document.removeEventListener("mousedown", close);
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [compact, isOpen]);

    const selectValue = (nextValue) => {
        onChange(nextValue);
        setQuery("");
        setIsOpen(false);
    };
    const toggleOpen = () => {
        if (isOpen) {
            setIsOpen(false);
            setQuery("");
            return;
        }
        if (place()) setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative space-y-2 text-left">
            {label && <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>}
            <button type="button" onClick={toggleOpen} className={compact ? "flex h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-2.5 text-left text-sm font-medium text-slate-900 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" : "flex h-11 w-full items-center justify-between rounded-2xl border border-blue-100 bg-slate-50 px-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"}>
                <span className={selected || value ? "truncate" : "truncate text-slate-400"}>{selected ? (selected.flag ? `${selected.flag} ${selected.label}` : selected.label) : value || placeholder}</span>
                <ChevronDown size={17} className={isOpen ? "shrink-0 rotate-180 text-blue-600 transition" : "shrink-0 text-slate-400 transition"} />
            </button>
            {isOpen && menuStyle.left !== undefined && (
                <div style={menuStyle} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-500/15">
                    <div className="border-b border-blue-50 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100" />
                        </div>
                    </div>
                    <div className="overflow-auto p-2" style={{ maxHeight: Math.max(120, Number(menuStyle.maxHeight || 256) - 58) }}>
                        {filteredOptions.map((option) => (
                            <button key={option.value} type="button" onClick={() => selectValue(option.value)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                                {renderOption ? renderOption(option) : <span className="min-w-0 truncate">{option.flag ? `${option.flag} ${option.label}` : option.label}</span>}
                                {option.value === value && <Check size={16} className="text-blue-600" />}
                            </button>
                        ))}
                        {canUseCustom && <button type="button" onClick={() => selectValue(query.trim())} className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-blue-600 transition hover:bg-blue-50">Use "{query.trim()}"</button>}
                        {loading && <p className="px-3 py-4 text-center text-xs font-medium text-slate-400">Loading...</p>}
                        {!loading && filteredOptions.length === 0 && !canUseCustom && <p className="px-3 py-4 text-center text-xs font-medium text-slate-400">No option found</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

export function useGeoOptions(activeCountry = "") {
    const [countryOptions, setCountryOptions] = useState([]);
    const [detectedCountry, setDetectedCountry] = useState("");
    const [citiesByCountry, setCitiesByCountry] = useState({});
    const [loadingCountry, setLoadingCountry] = useState("");

    useEffect(() => {
        let mounted = true;
        import("country-state-city/lib/country").then((module) => {
            if (!mounted) return;
            const countryApi = module.default;
            const options = countryApi.getAllCountries().map((country) => {
                const rawPhoneCode = String(country.phonecode || "").replace(/\+/g, "").trim();
                return { value: country.isoCode, label: country.name, name: country.name, flag: country.flag, dialCode: rawPhoneCode ? `+${rawPhoneCode}` : "", searchText: `${country.name} ${country.isoCode}` };
            });
            setCountryOptions(options);
            const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const countryFromTimeZone = countryApi.getAllCountries().find((country) => country.timezones?.some((zone) => zone.zoneName === browserTimeZone))?.isoCode;
            const regionFromLocale = Intl.DateTimeFormat().resolvedOptions().locale?.match(/[-_]([A-Z]{2})\b/i)?.[1]?.toUpperCase();
            setDetectedCountry(countryFromTimeZone || regionFromLocale || "");
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!activeCountry || citiesByCountry[activeCountry]) return undefined;
        let mounted = true;
        setLoadingCountry(activeCountry);
        fetch(`/geo/cities/${activeCountry}.json`)
            .then((response) => response.ok ? response.json() : [])
            .then((names) => {
                if (mounted) {
                    setCitiesByCountry((current) => ({ ...current, [activeCountry]: names }));
                    setLoadingCountry("");
                }
            })
            .catch(() => {
                if (mounted) setLoadingCountry("");
            });
        return () => { mounted = false; };
    }, [activeCountry, citiesByCountry]);

    const cityOptionsFor = (countryCode) => countryCode
        ? (citiesByCountry[countryCode] || []).map((name) => ({ value: name, label: name }))
        : [];
    return { countryOptions, detectedCountry, detectedTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", cityOptionsFor, isCityLoading: loadingCountry === activeCountry };
}

export function PhoneField({ label = "Phone", value, onChange, countryOptions, preferredCountry }) {
    const [selectedCountryCode, setSelectedCountryCode] = useState("");
    const currentDial = value?.match(/^\+\d+/)?.[0] || "";
    const selectedCountry = useMemo(() =>
        countryOptions.find((country) => country.dialCode === currentDial)
        || countryOptions.find((country) => country.value === selectedCountryCode)
        || countryOptions.find((country) => country.value === preferredCountry)
        || null,
    [countryOptions, currentDial, preferredCountry, selectedCountryCode]);
    const localNumber = selectedCountry?.dialCode && value?.startsWith(selectedCountry.dialCode)
        ? value.slice(selectedCountry.dialCode.length).trim()
        : value?.replace(/^\+\d+\s*/, "") || "";
    const updateValue = (country, number) => {
        const digitsOnly = number.replace(/[^\d\s()-]/g, "");
        onChange(digitsOnly ? `${country?.dialCode || ""} ${digitsOnly}`.trim() : "");
    };
    useEffect(() => {
        if (selectedCountry?.value) setSelectedCountryCode(selectedCountry.value);
    }, [selectedCountry?.value]);
    return (
        <label className="space-y-2 text-left">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
            <div className="grid grid-cols-[104px_1fr] gap-2">
                <SearchableSelect label="" value={selectedCountry?.value || ""} onChange={(code) => { setSelectedCountryCode(code); updateValue(countryOptions.find((country) => country.value === code), localNumber); }} options={countryOptions.map((country) => ({ value: country.value, label: country.dialCode || country.value, flag: country.flag, searchText: `${country.name} ${country.dialCode} ${country.value}` }))} placeholder="Code" compact />
                <input value={localNumber} onChange={(event) => updateValue(selectedCountry, event.target.value)} placeholder="1590 6340952" inputMode="tel" className="h-11 min-w-0 rounded-2xl border border-blue-100 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
            </div>
        </label>
    );
}
