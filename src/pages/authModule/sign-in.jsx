import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import {
    Clock3,
    ShieldCheck,
    Users,
    Building2,
    Fingerprint,
    CheckCircle2,
} from 'lucide-react'
import { InputField } from '../../components/form/InputField.jsx'
import { Button } from '../../components/form/Button.jsx'
import { FormLink } from '../../components/form/FormLink.jsx'
import { useLoginMutation, useKioskLoginMutation, useSsoDiscoverMutation } from '../../hooks/useAuthService'
import { useAuth } from '../../context/auth-context.jsx'
import { apiUrl } from '../../config/api.js'
import './sign-in.css'

function SignIn() {
    const navigate = useNavigate()
    const location = useLocation()
    const { login } = useAuth()
    const [authMode, setAuthMode] = useState(() => new URLSearchParams(location.search).get('mode') === 'kiosk' ? 'kiosk' : 'standard')
    const [showSsoEmail, setShowSsoEmail] = useState(false)
    const [ssoEmail, setSsoEmail] = useState('')
    const [showMfaToken, setShowMfaToken] = useState(false)
    const explicitTenantSlug = new URLSearchParams(location.search).get('tenant') || ''

    useEffect(() => {
        const ssoError = new URLSearchParams(location.search).get('sso_error')
        if (ssoError) {
            toast.error(ssoError, { id: 'sso-error' })
            navigate(location.pathname, { replace: true })
        }
    }, [location.pathname, location.search, navigate])

    // Get redirect path from location state or default to dashboard
    const getRedirectPath = () => {
        return location.state?.from?.pathname || '/dashboard'
    }

    const { mutate: kioskLoginMutate, isPending: isKioskPending } = useKioskLoginMutation()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            email: '',
            password: '',
            mfa_token: '',
            tenant_slug: explicitTenantSlug,
        },
    })

    const { mutate, isPending } = useLoginMutation()
    const { mutate: discoverSso, isPending: isSsoPending } = useSsoDiscoverMutation()

    const handleOnSubmit = (values) => {
        const payload = {
            ...values,
            tenant_slug: values.tenant_slug || explicitTenantSlug || undefined,
        }
        mutate(payload, {
            onSuccess: (data) => {
                login(data)
                toast.success('Login successful')
                navigate(getRedirectPath())
            },
            onError: (error) => {
                if (/MFA token required/i.test(error.message || '')) {
                    setShowMfaToken(true)
                    toast.error('Enter the 6-digit code from your authenticator app')
                    return
                }
                if (error.status === 403 && /email verification/i.test(error.message || '')) {
                    navigate('/verify-email', { state: { authFlow: 'email-verification' } })
                }
                toast.error(error.message || 'An error occurred')
            },
        })
    }

    const startSso = (provider) => {
        const next = encodeURIComponent(getRedirectPath())
        const tenant = explicitTenantSlug ? `&tenant=${encodeURIComponent(explicitTenantSlug)}` : ''
        window.location.href = apiUrl(`/auth/sso/${provider}?next=${next}${tenant}`)
    }

    const handleSsoDiscover = () => {
        if (!showSsoEmail) {
            setShowSsoEmail(true)
            return
        }
        if (!ssoEmail) {
            toast.error('Enter your work email first')
            return
        }
        discoverSso(
            { email: ssoEmail },
            {
                onSuccess: (response) => {
                    const loginUrl = response?.data?.login_url
                    if (!loginUrl) {
                        toast.error('No SSO provider found for this email')
                        return
                    }
                    const next = encodeURIComponent(getRedirectPath())
                    window.location.href = apiUrl(`${loginUrl.replace('/api/v1', '')}${loginUrl.includes('?') ? '&' : '?'}next=${next}`)
                },
                onError: (error) => {
                    toast.error(error.message || 'Unable to discover SSO provider')
                },
            }
        )
    }

    const {
        register: kioskRegister,
        handleSubmit: handleKioskSubmit,
        formState: { errors: kioskErrors, isSubmitting: isKioskSubmitting },
    } = useForm({
        defaultValues: {
            employee_code: '',
            pin: '',
            tenant_slug: new URLSearchParams(location.search).get('tenant') || '',
        },
    })

    const handleKioskOnSubmit = (values) => {
        kioskLoginMutate(values, {
            onSuccess: (data) => {
                login(data)
                toast.success('Kiosk login successful')
                navigate('/attendance', { replace: true })
            },
            onError: (error) => {
                toast.error(error.message || 'Kiosk login failed')
            },
        })
    }

    return (
        <section className="signin-page">
            <div className="signin-shell">
                <div className="signin-left">
                    {/* <Link to="/" className="brand-link">
                        <div className="brand-icon">
                            <span />
                        </div>
                        <span>Attendio</span>
                    </Link> */}

                    <p className="signin-eyebrow">SMART TIME & WORKFORCE OPERATIONS</p>

                    {/* <h2 className="signin-title">
                        Sign in to manage time across your workforce.
                    </h2> */}

                    <p className="signin-subtitle">
                        Track employee work hours, manage attendance, and keep daily
                        workforce operations organized across teams and shifts.
                    </p>

                    <div className="login-product-visual">
                        <div className="visual-grid-lines" />
                        <div className="visual-glow-one" />
                        <div className="visual-glow-two" />

                        <div className="signin-device">
                            <div className="device-top">
                                <span />
                                <span />
                                <span />
                                <p>Secure workforce access</p>
                            </div>

                            <div className="access-card">
                                <div className="access-avatar">
                                    <Fingerprint size={30} />
                                </div>

                                <div className="access-content">
                                    <p>Signing in</p>
                                    <h3>Employee Portal</h3>
                                    <span>Identity verified</span>
                                </div>

                                <div className="access-check">
                                    <CheckCircle2 size={22} />
                                </div>
                            </div>

                            <div className="device-stats">
                                <div>
                                    <Clock3 size={19} />
                                    <strong>08:42</strong>
                                    <p>Today</p>
                                </div>

                                <div>
                                    <Users size={19} />
                                    <strong>128</strong>
                                    <p>Active</p>
                                </div>

                                <div>
                                    <ShieldCheck size={19} />
                                    <strong>Safe</strong>
                                    <p>Access</p>
                                </div>
                            </div>

                            <div className="activity-feed">
                                <div>
                                    <span />
                                    <p>Morning shift ready</p>
                                    <strong>Live</strong>
                                </div>

                                <div>
                                    <span />
                                    <p>Branch attendance synced</p>
                                    <strong>Now</strong>
                                </div>

                                <div>
                                    <span />
                                    <p>Records prepared for review</p>
                                    <strong>Ready</strong>
                                </div>
                            </div>
                        </div>

                        <div className="floating-login-card card-secure">
                            <ShieldCheck size={18} />
                            <div>
                                <strong>Secure login</strong>
                                <p>Protected access</p>
                            </div>
                        </div>

                        <div className="floating-login-card card-branch">
                            <Building2 size={18} />
                            <div>
                                <strong>Branch ready</strong>
                                <p>Teams connected</p>
                            </div>
                        </div>

                        <div className="floating-login-card card-time">
                            <Clock3 size={18} />
                            <div>
                                <strong>Time synced</strong>
                                <p>Work hours updated</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="signin-right">
                    <div className="auth-card">
                        <div className="auth-tabs">
                            <button
                                type="button"
                                onClick={() => setAuthMode('standard')}
                                className={authMode === 'standard' ? 'active' : ''}
                            >
                                Standard Login
                            </button>

                            <button
                                type="button"
                                onClick={() => setAuthMode('kiosk')}
                                className={authMode === 'kiosk' ? 'active' : ''}
                            >
                                Kiosk Mode
                            </button>
                        </div>

                        <div className="auth-heading">
                            <h2>
                                Sign in to <span>Attendio</span>
                            </h2>
                            <p>
                                {authMode === 'standard'
                                    ? 'Sign in to your account to continue'
                                    : 'Enter your employee code and PIN'}
                            </p>
                        </div>

                        {authMode === 'standard' ? (
                            <>
                                <form onSubmit={handleSubmit(handleOnSubmit)} className="auth-form" autoComplete="off">
                                    <input type="hidden" {...register('tenant_slug')} />
                                    <InputField
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        register={register}
                                        errors={errors}
                                        placeholder="example@company.com"
                                        autoComplete="off"
                                        required
                                    />

                                    <InputField
                                        label="Password"
                                        name="password"
                                        type="password"
                                        register={register}
                                        errors={errors}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        required
                                        extraLabel={
                                            <FormLink to="/forgot-password" state={{ authFlow: 'password-recovery' }}>
                                                Forgot Password?
                                            </FormLink>
                                        }
                                    />

                                    {showMfaToken && (
                                        <InputField
                                            label="Authenticator Code"
                                            name="mfa_token"
                                            type="text"
                                            register={register}
                                            errors={errors}
                                            placeholder="123456"
                                            autoComplete="one-time-code"
                                            required
                                        />
                                    )}

                                    <Button type="submit" isLoading={isSubmitting || isPending}>
                                        Sign In
                                    </Button>
                                </form>

                                <div className="auth-divider">
                                    <span />
                                    <p>OR</p>
                                    <span />
                                </div>

                                <div className="sso-buttons">
                                    <button
                                        type="button"
                                        onClick={() => startSso('google')}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => startSso('microsoft')}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path fill="#F25022" d="M1 1h10v10H1z" />
                                            <path fill="#00A4EF" d="M12 1h10v10H12z" />
                                            <path fill="#7FBA00" d="M1 12h10v10H1z" />
                                            <path fill="#FFB900" d="M12 12h10v10H12z" />
                                        </svg>
                                        Continue with Microsoft
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSsoDiscover}
                                        disabled={isSsoPending}
                                    >
                                        <ShieldCheck size={20} />
                                        {isSsoPending ? 'Checking SSO...' : showSsoEmail ? 'Proceed with SSO' : 'Continue with SSO'}
                                    </button>
                                </div>

                                {showSsoEmail && (
                                    <form
                                        className="mt-3"
                                        onSubmit={(event) => {
                                            event.preventDefault()
                                            handleSsoDiscover()
                                        }}
                                    >
                                        <input
                                            value={ssoEmail}
                                            onChange={(event) => setSsoEmail(event.target.value)}
                                            type="email"
                                            autoFocus
                                            placeholder="Work email for company SSO"
                                            className="block w-full rounded-2xl border border-blue-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                        <p className="mt-2 text-xs font-bold text-slate-500">
                                            We’ll find your company’s SSO provider from this email.
                                        </p>
                                    </form>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleKioskSubmit(handleKioskOnSubmit)} className="auth-form" autoComplete="off">
                                <InputField
                                    label="Employee Code"
                                    name="employee_code"
                                    register={kioskRegister}
                                    errors={kioskErrors}
                                    placeholder="Enter your employee code"
                                    autoComplete="off"
                                    required
                                />

                                <InputField
                                    label="PIN"
                                    name="pin"
                                    type="password"
                                    register={kioskRegister}
                                    errors={kioskErrors}
                                    placeholder="Enter your PIN"
                                    autoComplete="new-password"
                                    required
                                />

                                <Button type="submit" isLoading={isKioskSubmitting || isKioskPending}>
                                    Kiosk Sign In
                                </Button>
                            </form>
                        )}

                        <div className="auth-footer">
                            Not registered yet? <FormLink to="/sign-up" state={{ authFlow: 'signup' }}>Create account</FormLink>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SignIn
