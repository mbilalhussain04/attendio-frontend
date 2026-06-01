import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const InputField = ({
    type = 'text',
    label,
    name,
    register,
    errors,
    placeholder = '',
    required = false,
    autoComplete = 'off',
    className = '',
    extraLabel = null,
}) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPasswordField = type === 'password'

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                {label && (
                    <label htmlFor={name} className="block text-sm font-black text-slate-800">
                        {label}
                    </label>
                )}

                {extraLabel}
            </div>

            <div className="relative">
                <input
                    {...register(name)}
                    type={isPasswordField && showPassword ? 'text' : type}
                    id={name}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`block w-full rounded-2xl border border-blue-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 ${className}`}
                    required={required}
                />

                {isPasswordField && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-blue-600"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                )}
            </div>

            {errors && errors[name] && (
                <p className="text-sm font-semibold text-red-600">
                    {errors[name].message}
                </p>
            )}
        </div>
    )
}