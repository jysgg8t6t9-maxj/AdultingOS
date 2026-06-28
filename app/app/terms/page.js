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

export default function TermsOfService() {
  return (
    <div className="lg-page">
      <style>{CSS}</style>
      <div className="lg-page-wrap">
        <h1>Terms of Service</h1>
        <div className="updated">Last updated: 28/06/26 </div>

        <p>These terms govern your use of Adulting OS, operated by Adulting OS. By subscribing or using the service, you agree to these terms.</p>

        <h2>The service</h2>
        <p>Adulting OS is a personal finance and life-organisation tool. It calculates a Life Score and related insights from data you enter. It is provided for general organisational and informational purposes only.</p>

        <h2>Not financial advice</h2>
        <p>Adulting OS does not provide regulated financial advice. Nothing in the app — including the Life Score, money leak detection, or any recommendations — constitutes professional financial, legal, tax, or medical advice. You should consult a qualified, regulated professional before making significant financial decisions.</p>

        <h2>Subscription and billing</h2>
        <ul>
          <li>Adulting OS costs £4.99/month, billed automatically on a recurring monthly basis via Stripe.</li>
          <li>You may cancel at any time via Settings → Manage subscription. Cancellation takes effect at the end of your current billing period; you retain access until then.</li>
          <li>We do not offer refunds for partial billing periods, except where required by law.</li>
          <li>Prices may change with reasonable advance notice.</li>
        </ul>

        <h2>Your account</h2>
        <p>You are responsible for keeping your login access secure. You must provide accurate information and are responsible for the accuracy of the financial data you enter — the Life Score and diagnostics are only as accurate as the data you provide.</p>

        <h2>Acceptable use</h2>
        <p>You agree not to misuse the service, attempt to access other users' data, or use the service for any unlawful purpose.</p>

        <h2>Limitation of liability</h2>
        <p>The service is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Adulting OS is not liable for any financial decisions made based on information provided by the app, or for any indirect or consequential losses.</p>

        <h2>Termination</h2>
        <p>We may suspend or terminate accounts that breach these terms. You may close your account at any time by contacting [YOUR CONTACT EMAIL].</p>

        <h2>Governing law</h2>
        <p>These terms are governed by the laws of England and Wales.</p>

        <h2>Contact</h2>
        <p>ben.d.martin@sky.com</p>
      </div>
    </div>
  );
}
