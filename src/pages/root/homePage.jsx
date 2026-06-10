import { useState, useEffect } from 'react'
import './homePage.css'
import { Link } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import teamIllustration from "../../assets/teamwork.png"
import PricingSection from './PricingSection.jsx'
import './PricingSection.css'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'


export default function HomePage() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const cards = [
    { title: t('hero.card1Title'), text: t('hero.card1Text'), icon: '◷' },
    { title: t('hero.card2Title'), text: t('hero.card2Text'), icon: '✓' },
    { title: t('hero.card3Title'), text: t('hero.card3Text'), icon: '⌁' },
  ]

  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours()
  const secondDeg = seconds * 6
  const minuteDeg = minutes * 6 + seconds * 0.1
  const hourDeg = (hours % 12) * 30 + minutes * 0.5

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <div className="mark"><span /></div>
          <strong>Attendio</strong>
        </div>

        <div className={`navActions ${menuOpen ? 'open' : ''}`}>
          <a href="#pricing">{t('nav.pricing')}</a>

          <Link to="/sign-in">
            <button className="login">{t('nav.login')}</button>
          </Link>
          <Link to="/sign-up">
            <button className="signup">{t('nav.signUp')}</button>
          </Link>
          <LanguageSwitcher />
        </div>

        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      <section className="hero">
        <div className="copy">
          <p className="eyebrow">{t('hero.eyebrow')}</p>

          <h2>
            {t('hero.h1_line1')}
            <br />
            {t('hero.h1_line2')}
            <br />
            {t('hero.h1_line3')}
          </h2>

          <p className="subtitle">{t('hero.subtitle')}</p>

          <div className="ctaRow">
            <Link to="/sign-in">
              <button className="cta">{t('hero.cta')}</button>
            </Link>
            <p>
              {t('hero.ctaSub1')}
              <br />
              {t('hero.ctaSub2')}
            </p>
          </div>

          <div className="rating">
            <span>★★★★★</span>
            <p>{t('hero.ratingText')}</p>
          </div>

          <div className="featureCards">
            {cards.map((card) => (
              <div className="featureCard" key={card.title}>
                <div className="featureIcon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="graphic">
          <div className="gridBg">
            <div className="softShape">✓</div>

            <div className="node n1" />
            <div className="node n2" />
            <div className="node n3" />
            <div className="node n4" />
            <div className="node n5" />

            <div className="leaderCircle">
              <h3>{t('hero.leaderTitle')}</h3>
              <div className="label">{t('hero.leaderLabel')}</div>
              <div className="pin" />
              <div className="appIcon">
                <div className="checkIcon">✓</div>
              </div>
            </div>

            <div className="laptop">
              <div className="screen">
                <div className="screenTop">
                  <div className="windowDots">
                    <span /><span /><span />
                  </div>
                  <p>{t('hero.dashboardLabel')}</p>
                </div>

                <div className="dashboard">
                  <aside>
                    <div className="sideIcon" />
                    <span /><span /><span /><span />
                  </aside>

                  <section>
                    <div className="dashHead">
                      <div>
                        <p>{t('hero.dashToday')}</p>
                        <h4>{t('hero.dashTeamOverview')}</h4>
                      </div>
                      <button>{t('hero.dashLive')}</button>
                    </div>

                    <div className="stats">
                      <div>
                        <strong>128</strong>
                        <p>{t('hero.dashCheckedIn')}</p>
                      </div>
                      <div>
                        <strong>12</strong>
                        <p>{t('hero.dashOnLeave')}</p>
                      </div>
                      <div>
                        <strong>4.8k</strong>
                        <p>{t('hero.dashTrackedHrs')}</p>
                      </div>
                    </div>

                    <div className="activity">
                      <div><span /><p>{t('hero.dashMorningShift')}</p></div>
                      <div><span /><p>{t('hero.dashLeaveQueue')}</p></div>
                      <div><span /><p>{t('hero.dashTimesheet')}</p></div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="base" />
            </div>

            <div className="miniCard leftTop">
              <strong>{t('hero.miniLive')}</strong>
              <p>{t('hero.miniLiveSub')}</p>
            </div>

            <div className="miniCard rightTop">
              <strong>{t('hero.miniReady')}</strong>
              <p>{t('hero.miniReadySub')}</p>
            </div>

            <div className="miniCard leftBottom">
              <strong>{t('hero.miniSmart')}</strong>
              <p>{t('hero.miniSmartSub')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="attendanceSection">
        <div className="attendanceTop">
          <p>{t('section2.label')}</p>
          <span />
          <h2>{t('section2.h2')}</h2>
          <h4>{t('section2.h4')}</h4>
        </div>

        <div className="attendanceContent">
          <div className="attendanceImageBox">
            <img src={teamIllustration} alt="Time tracking illustration" />

            <div className="modernClock">
              {[...Array(12)].map((_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
              ))}
              <b className="hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
              <b className="minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />
              <b className="second" style={{ transform: `rotate(${secondDeg}deg)` }} />
              <em />
              <small>attendio</small>
            </div>
          </div>

          <div className="attendanceText">
            <h3>{t('section2.h3')}</h3>
            <div className="attendanceNote">{t('section2.note')}</div>
            <p>{t('section2.p')}</p>
          </div>
        </div>
      </section>

      <PricingSection />
    </main>
  )
}
