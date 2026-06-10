import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PLAN_KEYS = ['starter', 'professional', 'enterprise']
const MONTHLY_PRICES = { starter: 19, professional: 39, enterprise: null }
const YEARLY_PRICES = { starter: 15, professional: 32, enterprise: null }
const FEATURED_KEY = 'professional'
const ENTERPRISE_LINK = 'mailto:mbilalhussain96@gmail.com'

export default function PricingSection() {
    const { t } = useTranslation()
    const [billing, setBilling] = useState('monthly')
    const [openFaq, setOpenFaq] = useState(null)

    const faqs = t('pricing.faqs', { returnObjects: true })
    const trust = t('pricing.trust', { returnObjects: true })

    return (
        <section className="ps-root" id="pricing">

            {/* ── HEADER ── */}
            <div className="ps-header">
                <p className="ps-eyebrow">{t('pricing.eyebrow')}</p>
                {/* <h2 className="ps-title">{t('pricing.title')}</h2> */}
                <p className="ps-subtitle">{t('pricing.subtitle')}</p>

                {/* billing toggle */}
                <div className="ps-toggle">
                    <button
                        className={`ps-toggle-btn ${billing === 'monthly' ? 'ps-toggle-active' : ''}`}
                        onClick={() => setBilling('monthly')}
                    >
                        {t('pricing.monthly')}
                    </button>
                    <button
                        className={`ps-toggle-btn ${billing === 'yearly' ? 'ps-toggle-active' : ''}`}
                        onClick={() => setBilling('yearly')}
                    >
                        {t('pricing.yearly')}
                        <span className="ps-save-pill">{t('pricing.savePercent')}</span>
                    </button>
                </div>
            </div>

            {/* ── PLAN CARDS ── */}
            <div className="ps-cards">
                {PLAN_KEYS.map((key) => {
                    const monthlyPrice = MONTHLY_PRICES[key]
                    const yearlyPrice = YEARLY_PRICES[key]
                    const price = billing === 'yearly' ? yearlyPrice : monthlyPrice
                    const featured = key === FEATURED_KEY
                    const ctaLink = key === 'enterprise' ? ENTERPRISE_LINK : `/sign-up?plan=${key}`
                    const isExternal = ctaLink.startsWith('mailto')
                    const employees = t(`pricing.plans.${key}.employees`)
                    const features = t(`pricing.plans.${key}.features`, { returnObjects: true })
                    const notIncluded = t(`pricing.plans.${key}.notIncluded`, { returnObjects: true })

                    return (
                        <div
                            key={key}
                            className={`ps-card ${featured ? 'ps-card-featured' : ''}`}
                        >
                            {featured && (
                                <div className="ps-badge">{t('pricing.recommended')}</div>
                            )}

                            <div className="ps-card-top">
                                <div className="ps-plan-meta">
                                    <span className="ps-plan-name">{t(`pricing.plans.${key}.name`)}</span>
                                    <span className="ps-employee-pill">
                                        <span className="ps-pill-icon">👤</span>
                                        {employees} {t('pricing.employees_label')}
                                    </span>
                                </div>

                                <div className="ps-price-row">
                                    {price !== null ? (
                                        <>
                                            <span className="ps-price">€{price}</span>
                                            <span className="ps-price-meta">
                                                {t('pricing.perMonth')}
                                                {billing === 'yearly' && (
                                                    <span className="ps-billed-yearly"> {t('pricing.billedYearly')}</span>
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="ps-price-custom">{t('pricing.custom')}</span>
                                    )}
                                </div>

                                {billing === 'yearly' && monthlyPrice && (
                                    <p className="ps-yearly-note">
                                        {t('pricing.yearlyNote', {
                                            monthly: monthlyPrice,
                                            save: (monthlyPrice - yearlyPrice) * 12,
                                        })}
                                    </p>
                                )}

                                <p className="ps-plan-desc">{t(`pricing.plans.${key}.desc`)}</p>
                            </div>

                            {isExternal ? (
                                <a href={ctaLink} className="ps-cta-link">
                                    <button className={`ps-cta ${featured ? 'ps-cta-primary' : 'ps-cta-outline'}`}>
                                        {t(`pricing.plans.${key}.cta`)}
                                    </button>
                                </a>
                            ) : (
                                <Link to={ctaLink} className="ps-cta-link">
                                    <button className={`ps-cta ${featured ? 'ps-cta-primary' : 'ps-cta-outline'}`}>
                                        {t(`pricing.plans.${key}.cta`)} →
                                    </button>
                                </Link>
                            )}

                            {featured && (
                                <p className="ps-no-card">{t('pricing.noCard')}</p>
                            )}

                            <div className="ps-divider" />

                            <ul className="ps-features">
                                {Array.isArray(features) && features.map(f => (
                                    <li key={f} className="ps-feature-yes">
                                        <span className="ps-check">✓</span>
                                        {f}
                                    </li>
                                ))}
                                {Array.isArray(notIncluded) && notIncluded.map(f => (
                                    <li key={f} className="ps-feature-no">
                                        <span className="ps-cross">—</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>

            {/* ── TRUST STRIP ── */}
            <div className="ps-trust">
                {Array.isArray(trust) && trust.map(item => (
                    <div key={item.title} className="ps-trust-item">
                        <span className="ps-trust-icon">{item.icon}</span>
                        <div>
                            <strong>{item.title}</strong>
                            <p>{item.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FAQ ── */}
            <div className="ps-faq">
                <h3 className="ps-faq-title">{t('pricing.faqTitle')}</h3>
                <div className="ps-faq-list">
                    {Array.isArray(faqs) && faqs.map((item, i) => (
                        <div
                            key={i}
                            className={`ps-faq-item ${openFaq === i ? 'ps-faq-open' : ''}`}
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        >
                            <div className="ps-faq-q">
                                <span>{item.q}</span>
                                <span className="ps-faq-arrow">{openFaq === i ? '−' : '+'}</span>
                            </div>
                            {openFaq === i && <p className="ps-faq-a">{item.a}</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── BOTTOM CTA ── */}
            <div className="ps-bottom-cta">
                <div className="ps-bottom-cta-inner">
                    <p className="ps-bottom-eyebrow">{t('pricing.bottomEyebrow')}</p>
                    <h3 className="ps-bottom-title">{t('pricing.bottomTitle')}</h3>
                    <p className="ps-bottom-sub">{t('pricing.bottomSub')}</p>
                    <div className="ps-bottom-actions">
                        <Link to="/sign-up">
                            <button className="ps-bottom-btn-primary">{t('pricing.bottomPrimary')}</button>
                        </Link>
                        <a href="mailto:mbilalhussain96@gmail.com">
                            <button className="ps-bottom-btn-ghost">{t('pricing.bottomGhost')}</button>
                        </a>
                    </div>
                </div>
            </div>

        </section>
    )
}
