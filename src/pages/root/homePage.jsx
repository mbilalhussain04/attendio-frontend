import { useState } from 'react'
import './homePage.css'
import { Link } from "react-router-dom"

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const cards = [
    {
      title: 'Leave approvals',
      text: 'Keep requests, balances, and manager decisions organized.',
      icon: '◷',
    },
    {
      title: 'Timesheet ready',
      text: 'Turn approved work records into cleaner time summaries.',
      icon: '✓',
    },
    {
      title: 'Kiosk mode',
      text: 'Simple shared check-ins for teams on site or branch floors.',
      icon: '⌁',
    },
  ]

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <div className="mark">
            <span />
          </div>
          <strong>Attendio</strong>
        </div>

        <div className={`navActions ${menuOpen ? 'open' : ''}`}>
          <a href="#">Get a Demo</a>
          <Link to="/sign-in">
            <button className="login">Login</button>
          </Link>
          <Link to="/sign-up">
            <button className="signup">Sign Up</button>
          </Link>
        </div>

        <button
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <section className="hero">
        <div className="copy">
          <p className="eyebrow">SMART TIME & WORKFORCE OPERATIONS</p>

          <h1>
            The smarter way
            <br />
            to track time across
            <br />
            your workforce.
          </h1>

          <p className="subtitle">
            A smarter workforce time tracking platform that helps companies
            track employee work hours, manage attendance, and keep daily
            operations organized across teams and shifts.
          </p>

          <div className="ctaRow">
            <button className="cta">Start with Attendio →</button>
            <p>
              Simple to start.
              <br />
              Built for growing teams.
            </p>
          </div>

          <div className="rating">
            <span>★★★★★</span>
            <p>Trusted for time tracking and workforce operations</p>
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
              <h3>Operations Leader</h3>
              <div className="label">Attendio</div>
              <div className="pin" />
              <div className="appIcon">
                <div className="checkIcon">✓</div>
              </div>
            </div>

            <div className="laptop">
              <div className="screen">
                <div className="screenTop">
                  <div className="windowDots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Workforce Dashboard</p>
                </div>

                <div className="dashboard">
                  <aside>
                    <div className="sideIcon" />
                    <span />
                    <span />
                    <span />
                    <span />
                  </aside>

                  <section>
                    <div className="dashHead">
                      <div>
                        <p>Today</p>
                        <h4>Team overview</h4>
                      </div>
                      <button>Live</button>
                    </div>

                    <div className="stats">
                      <div>
                        <strong>128</strong>
                        <p>Checked in</p>
                      </div>
                      <div>
                        <strong>12</strong>
                        <p>On leave</p>
                      </div>
                      <div>
                        <strong>4.8k</strong>
                        <p>Tracked hrs</p>
                      </div>
                    </div>

                    <div className="activity">
                      <div>
                        <span />
                        <p>Morning shift synced</p>
                      </div>
                      <div>
                        <span />
                        <p>Leave queue reviewed</p>
                      </div>
                      <div>
                        <span />
                        <p>Timesheet summary prepared</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="base" />
            </div>

            <div className="miniCard leftTop">
              <strong>Live</strong>
              <p>workforce status</p>
            </div>

            <div className="miniCard rightTop">
              <strong>Ready</strong>
              <p>clean records</p>
            </div>

            <div className="miniCard leftBottom">
              <strong>Smart</strong>
              <p>daily operations</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
