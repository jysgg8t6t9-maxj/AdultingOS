"use client";
import { useState } from "react";
import Link from "next/link";

const COLORS = { primary: "#5B5FEF", violet: "#BF5AF2", green: "#34C759" };
function rgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .pg { font-family: 'Inter', sans-serif; background: #0E0F13; color: #F2F3F5; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 0 20px; position: relative; overflow: hidden; }
  .pg * { box-sizing: border-box; }
  .pg::before { content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 700px; height: 500px; background: radial-gradient(circle, ${rgba(COLORS.primary, 0.22)}, transparent 70%); pointer-events: none; }
  .pg-back { align-self: flex-start; margin: 28px 0 0; font-size: 13px; color: #8B8D98; text-decoration: none; position: relative; z-index: 1; }
  .pg-back:hover { color: #F2F3F5; }
  .pg-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; position: relative; z-index: 1; }
  .pg-brand { font-weight: 800; font-size: 15px; letter-spacing: -0.01em; color: #8B8D98; margin-bottom: 18px; }
  .pg-card { max-width: 400px; width: 100%; background: #1A1B21; border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 38px 34px; box-shadow: 0 24px 70px rgba(0,0,0,0.5); text-align: center; }
  .pg-title { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 6px; }
  .pg-tagline { font-size: 13px; color: #8B8D98; margin-bottom: 26px; }
  .pg-price-row { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
  .pg-price { font-size: 48px; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.violet}); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .pg-price-period { font-size: 14px; color: #8B8D98; font-weight: 600; }
  .pg-price-note { font-size: 12px; color: #5E6B7D; margin: 4px 0 24px; }
  .pg-list { text-align: left; list-style: none; margin: 0 0 28px; padding: 0; font-size: 13.5px; color: #C7CEDA; }
  .pg-list li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .pg-list li:last-child { border-bottom: none; }
  .pg-check { color: ${COLORS.green}; font-weight: 700; flex-shrink: 0; }
  .pg-btn { width: 100%; background: ${COLORS.primary}; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14.5px; cursor: pointer; transition: background 0.15s; }
  .pg-btn:hover { background: #4C50D8; }
  .pg-btn:disabled { opacity: 0.6; cursor: default; }
  .pg-foot-note { font-size: 11.5px; color: #5E6B7D; margin-top: 16px; }
  .pg-foot-note a { color: #8B8D98; }
`;

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setError("Something went wrong starting checkout. Please try again."); setLoading(false); }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="pg">
      <style>{CSS}</style>
      <Link className="pg-back" href="/">← Back</Link>
      <div className="pg-wrap">
        <div className="pg-brand">ADULTING OS</div>
        <div className="pg-card">
          <div className="pg-title">Get your Life Score</div>
          <div className="pg-tagline">Everything, for one simple price.</div>

          <div className="pg-price-row">
            <span className="pg-price">£4.99</span>
            <span className="pg-price-period">/month</span>
          </div>
          <div className="pg-price-note">Cancel anytime, no questions asked.</div>

          <ul className="pg-list">
            <li><span className="pg-check">✓</span> Full Life Score diagnostic</li>
            <li><span className="pg-check">✓</span> Finances — Budgeting, Subscriptions, Debt, Paycheck, Emergency Fund, Savings</li>
            <li><span className="pg-check">✓</span> Password-protected Documents & Emergency vault</li>
            <li><span className="pg-check">✓</span> Life Admin deadline tracking</li>
            <li><span className="pg-check">✓</span> Manage or cancel anytime</li>
          </ul>
		<div style={{ background: "#212229", borderRadius: 14, padding: 16, marginBottom: 22, textAlign: "left" }}>
  		<div style={{ fontSize: 10.5, color: "#6E7B8E", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Your Life Score</div>
  		<div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
    		<span style={{ fontSize: 30, fontWeight: 800 }}>53</span>
   		 <span style={{ fontSize: 13, color: "#6E7B8E" }}>/100</span>
 		 </div>
 		 <div style={{ fontSize: 12, color: "#9499A8", marginTop: 2 }}>Calculated from your real savings, debt, and spending — not a quiz.</div>
		</div>
          <button className="pg-btn" onClick={subscribe} disabled={loading}>
            {loading ? "Redirecting to checkout…" : "Subscribe"}
          </button>
          {error && <div style={{ color: "#FF453A", fontSize: 12.5, marginTop: 12 }}>{error}</div>}

          <div className="pg-foot-note">
            Already subscribed? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
