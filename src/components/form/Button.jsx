import React from 'react'
import { Loader2 } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

export const Button = ({
    type = 'button',
    children,
    isLoading = false,
    className = '',
    ...props
}) => {
    return (
        <button
            type={type}
            disabled={isLoading}
            className={twMerge(
                'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70',
                className
            )}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                </>
            ) : (
                children
            )}
        </button>
    )
}