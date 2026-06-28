"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) setError(error.message);
    else router.push("/app");
  };

  if (sent) {
    return (
      <div style={{ maxWidth: 380, margin: "100px auto", fontFamily: "sans-serif" }}>
        <h2>Enter your code</h2>
        <p>Check your email for a 8-digit code.</p>
        <form onSubmit={verifyCode}>
          <input
            type="text" placeholder="********" value={otp}
            onChange={(e) => setOtp(e.target.value)} required maxLength={8}
            style={{ width: "100%", padding: 10, marginBottom: 12, fontSize: 18, textAlign: "center", letterSpacing: 4 }}
          />
          {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
          <button type="submit" style={{ width: "100%", padding: 10, fontSize: 14, cursor: "pointer" }}>
            Verify
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: "100px auto", fontFamily: "sans-serif" }}>
      <h2>Log in to Adulting OS</h2>
      <form onSubmit={sendCode}>
        <input
          type="email" placeholder="you@email.com" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={{ width: "100%", padding: 10, marginBottom: 12, fontSize: 14 }}
        />
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit" style={{ width: "100%", padding: 10, fontSize: 14, cursor: "pointer" }}>
          Send code
        </button>
      </form>
    </div>
  );
}