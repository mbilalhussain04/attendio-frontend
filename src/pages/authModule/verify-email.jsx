import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
    ArrowLeft,
    CheckCircle2,
    MailCheck,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'
import { Button } from '../../components/form/Button.jsx'
import { useResendVerificationEmailMutation, useVerifyEmailMutation } from '../../hooks/useAuthService'

function VerifyEmail() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const isVerificationFlow = location.state?.authFlow === 'email-verification'
    const [verificationStatus, setVerificationStatus] = useState(token ? 'pending' : 'idle')
    const [verificationMessage, setVerificationMessage] = useState('')
    const attemptedTokenRef = useRef('')
    const { mutate, isPending, isSuccess } = useVerifyEmailMutation()
    const { mutate: resendVerification, isPending: isResending } = useResendVerificationEmailMutation()

    useEffect(() => {
        if (!token && !isVerificationFlow) {
            navigate('/sign-in', { replace: true })
        }
    }, [isVerificationFlow, navigate, token])

    useEffect(() => {
        if (!token) return
        if (attemptedTokenRef.current === token) return
        attemptedTokenRef.current = token
        setVerificationStatus('pending')
        setVerificationMessage('')
        mutate(
            { token },
            {
                onSuccess: () => {
                    setVerificationStatus('success')
                    toast.success('Email verified successfully')
                },
                onError: (error) => {
                    setVerificationStatus('error')
                    setVerificationMessage(error.message || 'Email verification failed')
                    toast.error(error.message || 'Email verification failed')
                },
            }
        )
    }, [token, mutate])

    const handleResend = () => {
        if (!token) return
        resendVerification(
            { token },
            {
                onSuccess: (response) => {
                    const alreadyVerified = response?.data?.already_verified
                    setVerificationStatus(alreadyVerified ? 'success' : 'resent')
                    setVerificationMessage(alreadyVerified ? 'Your email is already verified.' : 'We sent a fresh verification link. Open the newest email to continue.')
                    toast.success(alreadyVerified ? 'Email already verified' : 'Verification email sent')
                },
                onError: (error) => {
                    setVerificationStatus('error')
                    setVerificationMessage(error.message || 'Unable to resend verification email')
                    toast.error(error.message || 'Unable to resend verification email')
                },
            }
        )
    }

    return (
        <section className="min-h-screen w-full bg-[radial-gradient(circle_at_8%_8%,rgba(37,99,235,0.10),transparent_30%),radial-gradient(circle_at_92%_90%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-8">
            <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.88fr]">
                <div className="text-center lg:text-left">
                    {/* <Link to="/" className="mb-10 inline-flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-lg shadow-blue-500/25">
                            <span className="absolute inset-[11px] rounded-md bg-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-950">
                            Attendio
                        </span>
                    </Link> */}

                    <p className="mb-5 text-xs font-black uppercase tracking-[0.22em] text-blue-600 sm:text-sm">
                        Secure email verification
                    </p>

                    {/* <p className="mx-auto max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:mx-0 lg:text-6xl">
                        Verify your email to activate your workspace.
                    </p> */}

                    <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg lg:mx-0">
                        Confirm your email address so your Attendio account can be secured
                        and connected to your workforce workspace.
                    </p>

                    <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3 lg:mx-0">
                        {[
                            ['Verified', 'email confirmed'],
                            ['Secure', 'protected access'],
                            ['Ready', 'workspace active'],
                        ].map(([title, text]) => (
                            <div
                                key={title}
                                className="rounded-3xl border border-blue-100 bg-white/80 p-5 text-left shadow-xl shadow-blue-500/5 backdrop-blur"
                            >
                                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white">
                                    {title === 'Verified' && <MailCheck size={20} />}
                                    {title === 'Secure' && <ShieldCheck size={20} />}
                                    {title === 'Ready' && <CheckCircle2 size={20} />}
                                </div>
                                <h3 className="text-lg font-black text-slate-950">{title}</h3>
                                <p className="mt-1 text-sm font-bold text-slate-500">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full">
                    <div className="mx-auto w-full max-w-lg rounded-[2rem] border border-blue-100 bg-white/95 p-5 text-center shadow-2xl shadow-blue-500/10 backdrop-blur-xl sm:p-7">
                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/25">
                            <MailCheck size={30} />
                        </div>

                        <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                            <Sparkles size={14} />
                            {isSuccess || verificationStatus === 'success' ? 'Verified' : verificationStatus === 'error' ? 'Needs a fresh link' : 'Almost done'}
                        </p>

                        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                            <span className="text-slate-950">{token ? 'Verifying your email' : 'Check your inbox'}</span>
                        </h2>

                        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                            {token
                                ? verificationStatus === 'error'
                                    ? (verificationMessage || 'This verification link is invalid or expired.')
                                    : verificationStatus === 'resent'
                                        ? (verificationMessage || 'We sent a fresh verification link.')
                                        : verificationStatus === 'success'
                                            ? 'Your email is verified. You can sign in now.'
                                            : 'We are confirming your token with the auth service.'
                                : 'We sent a verification link to your email. Open it to complete your account setup and continue to Attendio.'}
                        </p>

                        <div className="mt-7 rounded-3xl border border-blue-100 bg-blue-50/70 p-4 text-left">
                            <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                    <ShieldCheck size={20} />
                                </div>

                                <div>
                                    <h3 className="text-sm font-black text-slate-950">
                                        Secure verification
                                    </h3>
                                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                        This keeps your workspace protected and ensures only trusted
                                        users can access workforce data.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-7 grid gap-3">
                            {token && verificationStatus !== 'success' && verificationStatus !== 'resent' && (
                                <Button type="button" isLoading={isPending} onClick={() => {
                                    attemptedTokenRef.current = ''
                                    setVerificationStatus('pending')
                                    mutate(
                                        { token },
                                        {
                                            onSuccess: () => {
                                                setVerificationStatus('success')
                                                toast.success('Email verified successfully')
                                            },
                                            onError: (error) => {
                                                setVerificationStatus('error')
                                                setVerificationMessage(error.message || 'Email verification failed')
                                                toast.error(error.message || 'Email verification failed')
                                            },
                                        }
                                    )
                                }}>
                                    Verify email
                                </Button>
                            )}

                            {token && verificationStatus === 'error' && (
                                <Button type="button" isLoading={isResending} onClick={handleResend}>
                                    Resend verification email
                                </Button>
                            )}

                            <Link
                                to="/sign-in"
                                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
                            >
                                Go to sign in
                            </Link>

                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700 hover:underline"
                            >
                                <ArrowLeft size={16} />
                                Back to home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default VerifyEmail
