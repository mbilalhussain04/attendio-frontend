import React from 'react'
import { Link } from 'react-router-dom'

export const FormLink = ({ to, children, className = '', state }) => {
    return (
        <Link
            to={to}
            state={state}
            className={`text-sm font-black text-blue-600 transition hover:text-blue-700 hover:underline ${className}`}
        >
            {children}
        </Link>
    )
}
