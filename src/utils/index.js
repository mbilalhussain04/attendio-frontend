import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function getInitials(name) {
    if (!name) return "";

    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

    return firstInitial + lastInitial;
}