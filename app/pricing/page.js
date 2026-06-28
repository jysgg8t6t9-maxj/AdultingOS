"use client";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert("Something went wrong starting checkout."); setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 380, margin: "100px auto", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Adulting OS</h2>
      <p style={{ fontSize: 28, fontWeight: 700 }}>£4.99<span style={{ fontSize: 14 }}>/month</span></p>
      <button onClick={subscribe} disabled={loading} style={{ width: "100%", padding: 12, fontSize: 15, cursor: "pointer" }}>
        {loading ? "Redirecting…" : "Subscribe"}
      </button>
    </div>
  );
}