import Link from "next/link";

const COLORS = {
  primary: "#5B5FEF",
  green: "#34C759",
  red: "#FF453A",
  amber: "#FF9F0A",
  blue: "#0A84FF",
  violet: "#BF5AF2",
};

function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .lp { font-family: 'Inter', sans-serif; background: #0E0F13; color: #F2F3F5; min-height: 100vh; }
  .lp * { box-sizing: border-box; }
  .lp-wrap { max-width: 1080px; margin: 0 auto; padding: 0 28px; }
  .lp-nav { display: flex; justify-content: space-between; align-items: center; padding: 28px 0; }
  .lp-brand { font-weight: 800; font-size: 18px; letter-spacing: -0.01em; }
  .lp-nav-links { display: flex; gap: 14px; align-items: center; }
  .lp-link { color: #8B8D98; font-size: 13.5px; font-weight: 600; text-decoration: none; }
  .lp-link:hover { color: #F2F3F5; }
  .lp-btn { background: ${COLORS.primary}; color: #fff; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13.5px; text-decoration: none; display: inline-block; }
  .lp-btn:hover { background: #4C50D8; }
  .lp-btn-ghost { border: 1px solid rgba(255,255,255,0.14); color: #F2F3F5; padding: 9px 17px; border-radius: 10px; font-weight: 600; font-size: 13.5px; text-decoration: none; }

  .lp-hero { text-align: center; padding: 70px 0 50px; }
  .lp-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: ${COLORS.primary}; background: ${rgba(COLORS.primary, 0.12)}; border: 1px solid ${rgba(COLORS.primary, 0.3)}; padding: 6px 14px; border-radius: 20px; margin-bottom: 22px; }
  .lp-h1 { font-size: 46px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.12; margin: 0 0 18px; }
  .lp-h1 span { background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.violet}); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .lp-sub { font-size: 16px; color: #9499A8; max-width: 540px; margin: 0 auto 32px; line-height: 1.6; }
  .lp-hero-ctas { display: flex; gap: 12px; justify-content: center; margin-bottom: 14px; }
  .lp-hero-note { font-size: 12px; color: #5E6B7D; }

  .lp-score-card { max-width: 460px; margin: 50px auto 0; background: #1A1B21; border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); }
  .lp-score-row { display: flex; align-items: center; gap: 20px; }
  .lp-score-num { font-size: 44px; font-weight: 800; }
  .lp-score-verdict { font-size: 13px; color: #9499A8; margin-top: 4px; }
  .lp-score-factors { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 22px; }
  .lp-factor { text-align: center; }
  .lp-factor-dot { width: 28px; height: 28px; border-radius: 8px; margin: 0 auto 6px; }
  .lp-factor-label { font-size: 9.5px; color: #6E7B8E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

  .lp-section { padding: 80px 0; border-top: 1px solid rgba(255,255,255,0.06); }
  .lp-section-head { text-align: center; max-width: 560px; margin: 0 auto 44px; }
  .lp-section-eyebrow { font-size: 11.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: ${COLORS.primary}; margin-bottom: 10px; }
  .lp-section-title { font-size: 30px; font-weight: 800; letter-spacing: -0.015em; margin: 0 0 14px; }
  .lp-section-sub { font-size: 14.5px; color: #9499A8; line-height: 1.6; }

  .lp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .lp-card { background: #1A1B21; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 26px; }
  .lp-card-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 16px; }
  .lp-card-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
  .lp-card-sub { font-size: 13px; color: #8B8D98; line-height: 1.55; }

  .lp-diag-steps { display: flex; flex-direction: column; gap: 14px; max-width: 520px; margin: 0 auto; }
  .lp-diag-step { display: flex; gap: 16px; align-items: flex-start; background: #1A1B21; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 18px; }
  .lp-diag-num { width: 26px; height: 26px; border-radius: 8px; background: ${rgba(COLORS.primary, 0.16)}; color: ${COLORS.primary}; font-weight: 800; font-size: 12.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lp-diag-text-title { font-size: 13.5px; font-weight: 700; margin-bottom: 2px; }
  .lp-diag-text-sub { font-size: 12.5px; color: #8B8D98; }

  .lp-pricing-card { max-width: 380px; margin: 0 auto; background: linear-gradient(160deg, ${rgba(COLORS.primary, 0.16)}, ${rgba(COLORS.violet, 0.1)}); border: 1px solid ${rgba(COLORS.primary, 0.28)}; border-radius: 22px; padding: 36px 32px; text-align: center; }
  .lp-price { font-size: 44px; font-weight: 800; margin: 4px 0 2px; }
  .lp-price span { font-size: 15px; color: #9499A8; font-weight: 600; }
  .lp-price-note { font-size: 13px; color: #9499A8; margin-bottom: 24px; }
  .lp-pricing-list { text-align: left; margin: 0 0 26px; padding: 0; list-style: none; font-size: 13.5px; color: #C7CEDA; }
  .lp-pricing-list li { display: flex; gap: 10px; padding: 7px 0; }
  .lp-big-cta { display: block; width: 100%; text-align: center; background: ${COLORS.primary}; color: #fff; padding: 13px; border-radius: 12px; font-weight: 700; font-size: 14.5px; text-decoration: none; }
  .lp-big-cta:hover { background: #4C50D8; }

  .lp-footer { padding: 40px 0 50px; text-align: center; color: #5E6B7D; font-size: 12.5px; border-top: 1px solid rgba(255,255,255,0.06); }

  @media (max-width: 760px) {
    .lp-h1 { font-size: 32px; }
    .lp-grid { grid-template-columns: 1fr; }
    .lp-score-factors { grid-template-columns: repeat(3, 1fr); }
  }
`;

const FEATURES = [
  { icon: "📊", color: COLORS.primary, title: "Life Score", sub: "A score built from your real savings, debt, spending, admin and protection — not a checklist. Click into it and see exactly why." },
  { icon: "💰", color: COLORS.green, title: "Finances", sub: "Budgeting, Subscriptions, Debt, Paycheck Planning, Emergency Fund and Savings Accounts — all interlinked, not seven disconnected tools." },
  { icon: "🔒", color: COLORS.violet, title: "Documents & Emergency", sub: "Your most sensitive information, password-protected, with your own recovery email." },
  { icon: "⚠️", color: COLORS.amber, title: "Money leak detection", sub: "Flag subscriptions you don't actually need, and see exactly what cancelling them saves you a year." },
  { icon: "📅", color: COLORS.blue, title: "Life Admin", sub: "Every renewal and deadline in one place — tracked, not scattered across emails and sticky notes." },
  { icon: "🛡️", color: COLORS.red, title: "Debt payoff plans", sub: "A real avalanche-method simulation — see exactly how many months to debt-free, and what extra payments actually save you." },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <style>{CSS}</style>

      <div className="lp-wrap">
        <nav className="lp-nav">
          <div className="lp-brand">Adulting OS</div>
          <div className="lp-nav-links">
            <Link className="lp-link" href="/login">Log in</Link>
            <Link className="lp-btn" href="/pricing">Get started</Link>
          </div>
        </nav>

        <section className="lp-hero">
          <div className="lp-eyebrow">★ Your first diagnostic in under 60 seconds</div>
          <h1 className="lp-h1">The life admin system that<br /><span>actually tells you the truth.</span></h1>
          <p className="lp-sub">
            Adulting OS turns your real finances into a single Life Score, finds the money you're quietly leaking,
            flags what's actually at risk — then tells you the three things to fix first.
          </p>
          <div className="lp-hero-ctas">
            <Link className="lp-btn" href="/pricing">Get your Life Score — £4.99/mo</Link>
            <Link className="lp-btn-ghost" href="/login">Log in</Link>
          </div>
          <div className="lp-hero-note">Cancel anytime. No long-term contract.</div>

          <div className="lp-score-card">
            <div className="lp-score-row">
              <div>
                <div className="lp-score-num">53<span style={{ fontSize: 18, color: "#6E7B8E" }}>/100</span></div>
                <div className="lp-score-verdict">Making progress, but real gaps remain.</div>
              </div>
            </div>
            <div className="lp-score-factors">
              {[
                { l: "Savings", c: COLORS.green },
                { l: "Debt", c: COLORS.red },
                { l: "Spending", c: COLORS.amber },
                { l: "Admin", c: COLORS.blue },
                { l: "Protection", c: COLORS.violet },
              ].map((f) => (
                <div className="lp-factor" key={f.l}>
                  <div className="lp-factor-dot" style={{ background: rgba(f.c, 0.16), border: `1px solid ${rgba(f.c, 0.35)}` }} />
                  <div className="lp-factor-label">{f.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <div className="lp-section-eyebrow">Everything in one place</div>
            <div className="lp-section-title">One system, not seven disconnected apps</div>
            <div className="lp-section-sub">Every board feeds the next — change your budget, and your Emergency Fund target moves with it.</div>
          </div>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <div className="lp-card" key={f.title}>
                <div className="lp-card-icon" style={{ background: rgba(f.color, 0.14) }}>{f.icon}</div>
                <div className="lp-card-title">{f.title}</div>
                <div className="lp-card-sub">{f.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <div className="lp-section-eyebrow">The diagnostic</div>
            <div className="lp-section-title">What you see in your first 60 seconds</div>
            <div className="lp-section-sub">Not a tour. An actual verdict, built from your real numbers.</div>
          </div>
          <div className="lp-diag-steps">
            {[
              { t: "Your Life Score", s: "Calculated from your real savings, debt, spending, admin and protection." },
              { t: "Money leak detection", s: "Subscriptions flagged as likely waste, with the exact £/year you'd save cancelling them." },
              { t: "Risk report", s: "The real exposures sitting in your finances right now — not generic advice." },
              { t: "Strengths & weaknesses", s: "The two pillars carrying you, and the two holding you back." },
              { t: "Your 3 critical moves", s: "Ranked by what actually moves your score the most." },
            ].map((step, i) => (
              <div className="lp-diag-step" key={i}>
                <div className="lp-diag-num">{i + 1}</div>
                <div>
                  <div className="lp-diag-text-title">{step.t}</div>
                  <div className="lp-diag-text-sub">{step.s}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <div className="lp-section-eyebrow">Pricing</div>
            <div className="lp-section-title">One plan. Everything included.</div>
          </div>
          <div className="lp-pricing-card">
            <div className="lp-price">£4.99<span>/month</span></div>
            <div className="lp-price-note">Cancel anytime, no questions asked.</div>
            <ul className="lp-pricing-list">
              <li>✓ Full Life Score diagnostic</li>
              <li>✓ Finances — Budgeting, Subscriptions, Debt, Paycheck, Emergency Fund, Savings</li>
              <li>✓ Password-protected Documents & Emergency vault</li>
              <li>✓ Life Admin deadline tracking</li>
              <li>✓ Manage or cancel your subscription anytime</li>
            </ul>
            <Link className="lp-big-cta" href="/pricing">Get started</Link>
          </div>
        </section>

        <footer className="lp-footer">
          Adulting OS · adultingos.co.uk
        </footer>
      </div>
    </div>
  );
}

