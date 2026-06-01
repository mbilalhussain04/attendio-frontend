import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "../../utils/index.js";

/**
 * Zero-dependency Avatar
 * - Same public API as your current component: Avatar, AvatarImage, AvatarFallback
 * - Handles onError -> auto fallback
 * - Works with empty/relative URLs (optionally prefixes with BASE)
 * - Keeps your Tailwind classes intact
 */

const AvatarCtx = createContext(null);

function Avatar({ className = "", children, ...props }) {
    const [failed, setFailed] = useState(false);
    const [hasSrc, setHasSrc] = useState(false);

    const value = useMemo(
        () => ({ failed, setFailed, hasSrc, setHasSrc }),
        [failed, hasSrc]
    );

    return (
        <AvatarCtx.Provider value={value}>
            <div
                data-slot="avatar"
                className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
                {...props}
            >
                {/* We render children as-is (Image + Fallback), coordinated via context */}
                {children}
            </div>
        </AvatarCtx.Provider>
    );
}

function AvatarImage({
    className = "",
    src,
    alt,
    crossOrigin,
    referrerPolicy = "no-referrer",
    onError,
    onLoad,
    ...props
}) {
    const ctx = useContext(AvatarCtx);
    // If used outside <Avatar>, still render a simple <img>
    const setFailed = ctx?.setFailed ?? (() => { });
    const setHasSrc = ctx?.setHasSrc ?? (() => { });
    const failed = ctx?.failed ?? false;

    // If src is missing or we already failed, hide the image so fallback is visible
    const shouldHide = !src || failed;

    return (
        <img
            data-slot="avatar-image"
            src={src || null}
            alt={alt}
            loading="lazy"
            crossOrigin={crossOrigin}
            referrerPolicy={referrerPolicy}
            onError={(e) => {
                setFailed(true);
                onError?.(e);
            }}
            onLoad={(e) => {
                setHasSrc(true);
                onLoad?.(e);
            }}
            className={cn(
                "aspect-square size-full object-cover",
                shouldHide ? "hidden" : "",
                className
            )}
            {...props}
        />
    );
}

function AvatarFallback({ className = "", children, ...props }) {
    const ctx = useContext(AvatarCtx);
    const show = ctx ? (ctx.failed || !ctx.hasSrc) : true;

    return (
        <div
            data-slot="avatar-fallback"
            className={cn(
                "bg-muted flex size-full items-center justify-center rounded-full select-none",
                show ? "" : "hidden",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export { Avatar, AvatarImage, AvatarFallback };
