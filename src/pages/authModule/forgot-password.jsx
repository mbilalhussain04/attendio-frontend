import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MailCheck, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react'
import { InputField } from '../../components/form/InputField.jsx'
import { Button } from '../../components/form/Button.jsx'
import { FormLink } from '../../components/form/FormLink.jsx'
import { useForgotPasswordMutation } from '../../hooks/useAuthService'

function ForgotPassword() {
    const navigate = useNavigate()
    const location = useLocation()
    const isRecoveryFlow = location.state?.authFlow === 'password-recovery'

    useEffect(() => {
        if (!isRecoveryFlow) {
            navigate('/sign-in', { replace: true })
        }
    }, [isRecoveryFlow, navigate])

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            email: '',
        },
    })

    const { mutate, isPending } = useForgotPasswordMutation()

    const onSubmit = (values) => {
        mutate(values, {
            onSuccess: () => {
                toast.success('Reset flow triggered', {
                    description: 'If the account exists, reset instructions will be issued.',
                })
                navigate('/sign-in')
            },
            onError: (error) => {
                const errorMessage =
                    error.message || 'Unable to send reset link'
                toast.error(errorMessage)
            },
        })
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
                        Secure account recovery
                    </p>

                    {/* <h1 className="mx-auto max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:mx-0 lg:text-6xl">
                        Get back into your workforce workspace.
                    </h1> */}

                    <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg lg:mx-0">
                        Enter your work email and we’ll send a secure reset link so you can
                        regain access to your Attendio account.
                    </p>

                    <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3 lg:mx-0">
                        {[
                            ['Secure', 'protected reset'],
                            ['Fast', 'email recovery'],
                            ['Private', 'account verified'],
                        ].map(([title, text]) => (
                            <div
                                key={title}
                                className="rounded-3xl border border-blue-100 bg-white/80 p-5 text-left shadow-xl shadow-blue-500/5 backdrop-blur"
                            >
                                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white">
                                    {title === 'Secure' && <ShieldCheck size={20} />}
                                    {title === 'Fast' && <MailCheck size={20} />}
                                    {title === 'Private' && <KeyRound size={20} />}
                                </div>
                                <h3 className="text-lg font-black text-slate-950">{title}</h3>
                                <p className="mt-1 text-sm font-bold text-slate-500">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full">
                    <div className="mx-auto w-full max-w-lg rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-2xl shadow-blue-500/10 backdrop-blur-xl sm:p-6">
                        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/25">
                            <KeyRound size={26} />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                <span className="text-slate-950">Forgot your password?</span>
                            </h2>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                No problem. We’ll send reset instructions to your email.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
                            <InputField
                                label="Email Address"
                                name="email"
                                type="email"
                                register={register}
                                errors={errors}
                                placeholder="example@company.com"
                                required
                            />

                            <Button type="submit" isLoading={isSubmitting || isPending}>
                                Send reset link
                            </Button>
                        </form>

                        <div className="mt-6 flex justify-center">
                            <FormLink
                                to="/sign-in"
                                className="inline-flex items-center gap-2 text-sm font-black text-blue-600 transition hover:text-blue-700 hover:underline"
                            >
                                <ArrowLeft size={16} />
                                Back to sign in
                            </FormLink>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ForgotPassword
