"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";

const COLORS = { primary: "#5B5FEF", violet: "#BF5AF2", red: "#FF453A" };
function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .lg { font-family: 'Inter', sans-serif; background: #0E0F13; color: #F2F3F5; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 0 20px; position: relative; overflow: hidden; }
  .lg * { box-sizing: border-box; }
  .lg::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 700px; height: 500px; background: radial-gradient(circle, ${rgba(COLORS.violet, 0.2)}, transparent 70%); pointer-events: none; }
  .lg-back { align-self: flex-start; margin: 28px 0 0; font-size: 13px; color: #8B8D98; text-decoration: none; position: relative; z-index: 1; }
  .lg-back:hover { color: #F2F3F5; }
  .lg-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; position: relative; z-index: 1; }
  .lg-brand { font-weight: 800; font-size: 15px; letter-spacing: -0.01em; color: #8B8D98; margin-bottom: 18px; }
  .lg-card { max-width: 380px; width: 100%; background: #1A1B21; border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 36px 32px; box-shadow: 0 24px 70px rgba(0,0,0,0.5); }
  .lg-title { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 6px; text-align: center; }
  .lg-sub { font-size: 13px; color: #8B8D98; margin-bottom: 26px; text-align: center; line-height: 1.5; }
  .lg-label { display: block; font-size: 11.5px; color: #6E7B8E; font-weight: 600; margin-bottom: 7px; }
  .lg-input { width: 100%; background: #212229; border: 1px solid rgba(255,255,255,0.1); color: #F2F3F5; font-family: 'Inter'; font-size: 14px; padding: 12px 14px; border-radius: 11px; outline: none; margin-bottom: 16px; }
  .lg-input:focus { border-color: ${COLORS.primary}; }
  .lg-input.code { text-align: center; font-size: 22px; letter-spacing: 6px; font-weight: 700; padding: 14px; }
  .lg-btn { width: 100%; background: ${COLORS.primary}; color: #fff; border: none; padding: 13px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.15s; }
  .lg-btn:hover { background: #4C50D8; }
  .lg-btn:disabled { opacity: 0.6; cursor: default; }
  .lg-error { color: ${COLORS.red}; font-size: 12.5px; margin: -6px 0 14px; }
  .lg-back-link { display: block; text-align: center; margin-top: 16px; font-size: 12.5px; color: #6E7B8E; background: none; border: none; cursor: pointer; text-decoration: underline; }
  .lg-back-link:hover { color: #8B8D98; }
  .lg-foot-note { font-size: 11.5px; color: #5E6B7D; margin-top: 18px; text-align: center; }
  .lg-foot-note a { color: #8B8D98; }
`;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendCode = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) setError(error.message);
    else router.push("/app");
  };

  return (
    <div className="lg">
      <style>{CSS}</style>
      <Link className="lg-back" href="/">← Back</Link>
      <div className="lg-wrap">
        <div className="lg-brand">ADULTING OS</div>
        <div className="lg-card">
          {!sent ? (
            <form onSubmit={sendCode}>
              <div className="lg-title">Log in</div>
              <div className="lg-sub">We'll email you a one-time code — no password to remember.</div>
              <label className="lg-label">Email</label>
              <input className="lg-input" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {error && <div className="lg-error">{error}</div>}
              <button className="lg-btn" type="submit" disabled={loading}>{loading ? "Sending…" : "Send code"}</button>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <div className="lg-title">Enter your code</div>
              <div className="lg-sub">We sent a code to <strong style={{ color: "#C7CEDA" }}>{email}</strong></div>
              <label className="lg-label">Code</label>
              <input className="lg-input code" type="text" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={10} />
              {error && <div className="lg-error">{error}</div>}
              <button className="lg-btn" type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify"}</button>
              <button type="button" className="lg-back-link" onClick={() => { setSent(false); setOtp(""); setError(""); }}>
                Use a different email
              </button>
            </form>
          )}
          <div className="lg-foot-note">
            Not subscribed yet? <Link href="/pricing">See pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
