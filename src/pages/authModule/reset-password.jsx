import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { InputField } from '../../components/form/InputField.jsx'
import { Button } from '../../components/form/Button.jsx'
import { FormLink } from '../../components/form/FormLink.jsx'
import { useResetPasswordMutation } from '../../hooks/useAuthService'

function ResetPassword() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    useEffect(() => {
        if (!token) {
            navigate('/sign-in', { replace: true })
        }
    }, [token, navigate])

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    })

    const { mutate, isPending } = useResetPasswordMutation()

    const onSubmit = (values) => {
        if (!token) {
            toast.error('Reset link is missing or invalid')
            return
        }

        if (values.password !== values.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        mutate(
            { token, password: values.password },
            {
                onSuccess: () => {
                    toast.success('Password reset successful')
                    navigate('/sign-in')
                },
                onError: (error) => {
                    const errorMessage =
                        error.message || 'Unable to reset password'
                    toast.error(errorMessage)
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
                        Secure password update
                    </p>

                    {/* <h1 className="mx-auto max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:mx-0 lg:text-6xl">
                        <span className="text-slate-950">Create a new password for your workspace.</span>
                    </h1> */}

                    <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg lg:mx-0">
                        Choose a strong password to protect your Attendio account and keep
                        your workforce data secure.
                    </p>

                    <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3 lg:mx-0">
                        {[
                            ['Protected', 'secure reset'],
                            ['Verified', 'token based access'],
                            ['Ready', 'sign in again'],
                        ].map(([title, text]) => (
                            <div
                                key={title}
                                className="rounded-3xl border border-blue-100 bg-white/80 p-5 text-left shadow-xl shadow-blue-500/5 backdrop-blur"
                            >
                                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white">
                                    {title === 'Protected' && <ShieldCheck size={20} />}
                                    {title === 'Verified' && <KeyRound size={20} />}
                                    {title === 'Ready' && <CheckCircle2 size={20} />}
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
                            <LockKeyhole size={26} />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-black tracking-tight text-slate-950">
                                <span className="text-slate-950">Reset password</span>
                            </h2>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Enter and confirm your new password below.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
                            <InputField
                                label="New Password"
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
                                Update password
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

export default ResetPassword
