const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .lg-page { font-family: 'Inter', sans-serif; background: #0E0F13; color: #F2F3F5; min-height: 100vh; padding: 60px 20px 80px; }
  .lg-page-wrap { max-width: 680px; margin: 0 auto; }
  .lg-page h1 { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
  .lg-page .updated { font-size: 12.5px; color: #6E7B8E; margin-bottom: 36px; }
  .lg-page h2 { font-size: 17px; font-weight: 700; margin: 32px 0 10px; }
  .lg-page p, .lg-page li { font-size: 14px; line-height: 1.7; color: #C7CEDA; }
  .lg-page ul { padding-left: 20px; margin: 8px 0; }
  .lg-page a { color: #8B8D98; }
`;

export default function PrivacyPolicy() {
  return (
    <div className="lg-page">
      <style>{CSS}</style>
      <div className="lg-page-wrap">
        <h1>Privacy Policy</h1>
        <div className="updated">Last updated: 28/06/26 </div>

        <p>Adulting OS ("we", "us") is operated by Adulting OS. This policy explains what personal data we collect, why, and what rights you have over it under UK GDPR.</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your email address, used for login and account recovery.</li>
          <li><strong>Financial and personal data you enter:</strong> budgets, transactions, subscriptions, debts, savings, emergency contacts, medical information, and document storage notes — all entered voluntarily by you to use the product.</li>
          <li><strong>Payment data:</strong> we never see or store your card details. All payments are processed by Stripe, Inc. We retain only your Stripe customer ID and subscription status.</li>
        </ul>

        <h2>Where your data is stored</h2>
        <p>Your data is stored in a Supabase-hosted PostgreSQL database. Access is restricted to your account only via Row Level Security — no other user, and no member of our team, can view your stored financial or personal data through normal use of the product.</p>

        <h2>How we use your data</h2>
        <p>Solely to provide the service: to display your dashboard, calculate your Life Score, and manage your subscription. We do not sell your data, and we do not use it for advertising.</p>

        <h2>Your rights</h2>
        <p>Under UK GDPR, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Export your data — available directly in-app via Settings → Export backup</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data, by contacting ben.d.martin@sky.com </li>
          <li>Withdraw consent and cancel your subscription at any time via Settings → Manage subscription</li>
        </ul>

        <h2>Data retention</h2>
        <p>We retain your data for as long as your account remains active. If you cancel your subscription, your data remains accessible to you but app access is paused; you may request full deletion at any time.</p>

        <h2>Third parties we use</h2>
        <ul>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Supabase</strong> — database and authentication</li>
          <li><strong>Resend</strong> — transactional email delivery (login codes)</li>
          <li><strong>Vercel</strong> — application hosting</li>
        </ul>

        <h2>Contact</h2>
        <p>Questions about this policy or your data: ben.d.martin@sky.com </p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy from time to time. Material changes will be reflected with an updated "Last updated" date above.</p>
      </div>
    </div>
  );
}
