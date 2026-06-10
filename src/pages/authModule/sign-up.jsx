import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
    Building2,
    CheckCircle2,
    ShieldCheck,
    Users,
    Clock3,
    ArrowRight,
    Sparkles,
} from 'lucide-react'

const PLAN_LABELS = {
    starter: { name: 'Starter', employees: 'up to 15 employees' },
    professional: { name: 'Professional', employees: 'up to 50 employees' },
    enterprise: { name: 'Enterprise', employees: 'unlimited employees' },
}
import { InputField } from '../../components/form/InputField.jsx'
import { Button } from '../../components/form/Button.jsx'
import { FormLink } from '../../components/form/FormLink.jsx'
import { useSignUpMutation } from '../../hooks/useAuthService.ts'
import './sign-up.css'

function SignUp() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const selectedPlanKey = searchParams.get('plan')
    const selectedPlan = PLAN_LABELS[selectedPlanKey] || null

    useEffect(() => {
        if (selectedPlanKey) {
            localStorage.setItem('attendio_selected_plan', selectedPlanKey)
        }
    }, [selectedPlanKey])

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm({
        defaultValues: {
            companyName: '',
            email: '',
            password: '',
            name: '',
            confirmPassword: '',
        },
    })

    const { mutate, isPending } = useSignUpMutation()

    const onSubmit = (values) => {
        if (values.password !== values.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        const [firstName, ...rest] = values.name.trim().split(/\s+/)
        mutate({
            company_name: values.companyName,
            owner_first_name: firstName || 'Owner',
            owner_last_name: rest.join(' ') || 'User',
            owner_email: values.email,
            owner_password: values.password,
        }, {
            onSuccess: (response) => {
                const slug = response?.data?.company?.slug
                if (slug) {
                    localStorage.setItem('attendio_tenant_slug', slug)
                }
                if (selectedPlanKey) {
                    localStorage.setItem('attendio_selected_plan', selectedPlanKey)
                }
                toast.success('Company workspace created', {
                    description: 'We sent a verification link. Verify your email before signing in.',
                })

                reset()
                navigate('/verify-email', { state: { authFlow: 'email-verification' } })
            },
            onError: (error) => {
                const errorMessage = error.message || 'An error occurred'
                toast.error(errorMessage)
            },
        })
    }

    return (
        <section className="signup-page">
            <div className="signup-shell">
                <div className="signup-left">
                    {/* <Link to="/" className="signup-brand">
                        <div className="signup-brand-icon">
                            <span />
                        </div>
                        <strong>Attendio</strong>
                    </Link> */}

                    <p className="signup-eyebrow">START YOUR WORKFORCE OPERATIONS</p>

                    {/* <h1 className="signup-title">
                        Create your workspace and bring every workday into focus.
                    </h1> */}

                    <p className="signup-subtitle">
                        Set up your company, invite your team, and start managing time,
                        attendance, and workforce operations from one modern platform.
                    </p>

                    <div className="signup-visual">
                        <div className="signup-grid" />
                        <div className="signup-glow-one" />
                        <div className="signup-glow-two" />

                        <div className="setup-panel">
                            <div className="setup-topbar">
                                <div>
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <p>Workspace setup</p>
                            </div>

                            <div className="setup-header">
                                <div className="setup-logo">
                                    <Building2 size={28} />
                                </div>

                                <div>
                                    <p>New company</p>
                                    <h3>Attendio Workspace</h3>
                                </div>

                                <div className="setup-status">
                                    <CheckCircle2 size={18} />
                                </div>
                            </div>

                            <div className="setup-progress">
                                <div className="progress-row completed">
                                    <div className="progress-icon">
                                        <Building2 size={17} />
                                    </div>

                                    <div>
                                        <strong>Company profile</strong>
                                        <p>Workspace identity created</p>
                                    </div>

                                    <CheckCircle2 size={18} />
                                </div>

                                <div className="progress-row active">
                                    <div className="progress-icon">
                                        <Users size={17} />
                                    </div>

                                    <div>
                                        <strong>Invite your team</strong>
                                        <p>Managers and employees ready</p>
                                    </div>

                                    <ArrowRight size={18} />
                                </div>

                                <div className="progress-row">
                                    <div className="progress-icon">
                                        <Clock3 size={17} />
                                    </div>

                                    <div>
                                        <strong>Start tracking time</strong>
                                        <p>Daily work hours stay organized</p>
                                    </div>

                                    <span className="progress-dot" />
                                </div>
                            </div>
                        </div>

                        <div className="signup-floating-card signup-card-one">
                            <ShieldCheck size={18} />
                            <div>
                                <strong>Secure by default</strong>
                                <p>Protected company access</p>
                            </div>
                        </div>

                        <div className="signup-floating-card signup-card-two">
                            <Users size={18} />
                            <div>
                                <strong>Team ready</strong>
                                <p>Invite employees faster</p>
                            </div>
                        </div>

                        <div className="signup-floating-card signup-card-three">
                            <Clock3 size={18} />
                            <div>
                                <strong>Time ready</strong>
                                <p>Operations start clean</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="signup-right">
                    <div className="signup-card">
                        {selectedPlan && (
                            <div className="signup-plan-badge">
                                <Sparkles size={14} />
                                <span>
                                    <strong>{selectedPlan.name} Plan</strong>
                                    {' — '}60-day free trial · {selectedPlan.employees} · No credit card
                                </span>
                            </div>
                        )}

                        <div className="signup-card-heading">
                            <h2>
                                Sign up to <span>Attendio</span>
                            </h2>
                            <p>{selectedPlan ? `Starting your ${selectedPlan.name} trial` : 'Create your account to continue'}</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
                            <InputField
                                label="Company Name"
                                name="companyName"
                                type="text"
                                register={register}
                                errors={errors}
                                placeholder="Technoflick"
                                required
                            />

                            <InputField
                                label="Full Name"
                                name="name"
                                type="text"
                                register={register}
                                errors={errors}
                                placeholder="John Doe"
                                required
                            />

                            <InputField
                                label="Email Address"
                                name="email"
                                type="email"
                                register={register}
                                errors={errors}
                                placeholder="example@company.com"
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
                            />

                            <InputField
                                label="Confirm Password"
                                name="confirmPassword"
                                type="password"
                                register={register}
                                errors={errors}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />

                            <Button type="submit" isLoading={isSubmitting || isPending}>
                                Create account
                            </Button>

                            <div className="signup-footer">
                                Already have an account?{' '}
                                <FormLink to={selectedPlanKey ? `/sign-in?plan=${selectedPlanKey}` : '/sign-in'}>
                                    Sign in
                                </FormLink>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SignUp
