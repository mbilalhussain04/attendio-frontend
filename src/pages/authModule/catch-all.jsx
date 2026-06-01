import { Link } from 'react-router-dom'

export default function CatchAll() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-[#f8fbff] px-5">
            <div className="max-w-md text-center rounded-[2rem] border border-blue-100 bg-white p-8 shadow-2xl shadow-blue-500/10">
                <h1 className="text-6xl font-black text-blue-600">
                    <span className="text-slate-950">404</span>
                </h1>

                <h2 className="mt-4 text-2xl font-black text-slate-950">
                    <span className="text-slate-950">Page not found</span>
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    The page you are looking for does not exist or has been moved.
                </p>

                <Link
                    to="/"
                    className="mt-6 inline-flex rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
                >
                    Back to home
                </Link>
            </div>
        </main>
    )
}