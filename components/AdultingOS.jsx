"use client";
import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import {
  Home, Wallet, CalendarClock, FileText, Phone, Gauge, Settings as SettingsIcon,
  Sun, Moon, ChevronRight, ChevronLeft, X, AlertTriangle, Plus, Trash2,
  PiggyBank, CreditCard, Repeat, ShieldCheck, ArrowRight, CheckCircle2, Sparkles,
  Lock, Mail,
} from "lucide-react";
import { storage } from "../lib/storage";

const STORAGE_KEY = "adulting_os_v3";

const COLORS = {
  primary: "#5B5FEF",
  green: "#34C759",
  red: "#FF453A",
  amber: "#FF9F0A",
  blue: "#0A84FF",
  violet: "#BF5AF2",
};

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * amt), ng = Math.round(g + (255 - g) * amt), nb = Math.round(b + (255 - b) * amt);
  return `rgb(${nr},${ng},${nb})`;
}
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_FINANCES = {
  income: { monthly: 0 },
  budgets: [
    { id: "b1", category: "Rent / Mortgage", allocated: 0 },
    { id: "b2", category: "Bills", allocated: 0 },
    { id: "b3", category: "Shopping", allocated: 0 },
    { id: "b4", category: "Transport", allocated: 0 },
    { id: "b5", category: "Holidays", allocated: 0 },
    { id: "b6", category: "Savings", allocated: 0 },
  ],
  transactions: [],
  goals: [],
  subscriptions: [],
  debts: [],
  debtExtraPayment: 0,
  emergencyFund: { current: 0, targetMonths: 3, hasDedicatedAccount: false },
  savingsAccounts: [],
};

const DEFAULT_DATA = {
  profile: { name: "", theme: "dark" },
  finances: DEFAULT_FINANCES,
  admin: { deadlines: [] },
  documents: {
    items: [
      { id: "d1", name: "Passport", stored: false, note: "" },
      { id: "d2", name: "Driving licence", stored: false, note: "" },
      { id: "d3", name: "National Insurance number", stored: false, note: "" },
      { id: "d4", name: "Insurance policies", stored: false, note: "" },
      { id: "d5", name: "Tenancy / mortgage agreement", stored: false, note: "" },
      { id: "d6", name: "Will", stored: false, note: "" },
    ],
  },
  emergency: { contacts: [], medical: { bloodType: "", allergies: "", conditions: "" }, insurance: { provider: "", policyNumber: "" } },
  security: { passwordSet: false, passwordHash: "", email: "" },
  meta: { diagnosticSeen: false },
};

const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "finances", label: "Finances", icon: Wallet },
  { key: "admin", label: "Life Admin", icon: CalendarClock },
  { key: "vault", label: "Documents & Emergency", icon: Lock },
  { key: "lifescore", label: "Life Score", icon: Gauge },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function fmtGBP(n, decimals = 0) {
  const v = Number(n) || 0;
  return "£" + v.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function monthlyAmount(sub) {
  const amt = Number(sub.amount) || 0;
  if (sub.cycle === "yearly") return amt / 12;
  if (sub.cycle === "weekly") return amt * 4.345;
  return amt;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
function scoreVerdict(pct) {
  if (pct >= 85) return "Exceptionally well prepared.";
  if (pct >= 65) return "In solid shape — a few things to tighten.";
  if (pct >= 40) return "Making progress, but real gaps remain.";
  return "Needs urgent attention.";
}

/* ---------- shared finance helpers (the "interlinking" layer) ---------- */
function getMonthlyIncome(data) { return Number(data.finances.income.monthly) || 0; }
function getTotalBudgeted(data) { return data.finances.budgets.reduce((s, b) => s + (Number(b.allocated) || 0), 0); }
function getSpentByCategory(data) {
  const map = {};
  data.finances.transactions.filter((t) => t.type === "expense" && isThisMonth(t.date)).forEach((t) => {
    map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
  });
  return map;
}
function getMonthlySubsTotal(data) { return data.finances.subscriptions.reduce((s, x) => s + monthlyAmount(x), 0); }
function getTotalDebt(data) { return data.finances.debts.reduce((s, d) => s + (Number(d.balance) || 0), 0); }
function getTotalMinPayments(data) { return data.finances.debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0); }
function getEmergencyTarget(data) {
  const monthlyExpenses = getTotalBudgeted(data) || (getMonthlySubsTotal(data) + getTotalMinPayments(data));
  return monthlyExpenses * (Number(data.finances.emergencyFund.targetMonths) || 3);
}
function getTotalSavings(data) {
  return (Number(data.finances.emergencyFund.current) || 0) + data.finances.savingsAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
}
function getNetWorth(data) { return getTotalSavings(data) - getTotalDebt(data); }

function simulatePayoff(debts, extraMonthly) {
  if (!debts || debts.length === 0) return { months: 0, totalInterest: 0 };
  let bal = debts.map((d) => ({ balance: Number(d.balance) || 0, apr: Number(d.apr) || 0, minPayment: Number(d.minPayment) || 0 }))
    .sort((a, b) => b.apr - a.apr);
  let months = 0, totalInterest = 0;
  while (bal.some((d) => d.balance > 0) && months < 600) {
    months++;
    let extra = Number(extraMonthly) || 0;
    for (const d of bal) {
      if (d.balance <= 0) continue;
      const interest = d.balance * (d.apr / 100 / 12);
      totalInterest += interest;
      d.balance += interest;
      d.balance -= Math.min(d.minPayment, d.balance);
    }
    for (const d of bal) {
      if (extra <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(extra, d.balance);
      d.balance -= pay; extra -= pay;
    }
  }
  return { months, totalInterest };
}

function computeFactors(data) {
  const income = getMonthlyIncome(data);
  const ef = data.finances.emergencyFund;
  const efTarget = getEmergencyTarget(data);
  const efPct = efTarget > 0 ? clamp((ef.current / efTarget) * 100, 0, 100) : (ef.current > 0 ? 60 : 30);
  const totalSavings = getTotalSavings(data);
  const cushionRatio = income > 0 ? clamp((totalSavings / (income * 3)) * 100, 0, 100) : (totalSavings > 0 ? 60 : 30);
  const savingsScore = Math.round((efPct + cushionRatio) / 2);

  const totalDebt = getTotalDebt(data);
  const annualIncome = income * 12;
  const debtRatio = annualIncome > 0 ? totalDebt / annualIncome : (totalDebt > 0 ? 1 : 0);
  const debtScore = data.finances.debts.length === 0 ? 90 : Math.round(clamp(100 - debtRatio * 140, 0, 100));

  const subs = data.finances.subscriptions;
  const subsMonthly = getMonthlySubsTotal(data);
  const subsRatio = income > 0 ? subsMonthly / income : 0;
  const unnecessaryCount = subs.filter((s) => s.necessary === "unnecessary").length;
  const spendingScore = Math.round(subs.length === 0 && income === 0 ? 70 : clamp(100 - clamp(((subsRatio - 0.03) / 0.17) * 100, 0, 100) - unnecessaryCount * 4, 0, 100));

  const deadlines = data.admin.deadlines || [];
  const now = new Date();
  const overdue = deadlines.filter((d) => new Date(d.date) < now).length;
  const soon = deadlines.filter((d) => { const days = (new Date(d.date) - now) / 86400000; return days >= 0 && days <= 14; }).length;
  const adminScore = deadlines.length === 0 ? 75 : Math.round(clamp(100 - overdue * 30 - soon * 10, 0, 100));

  const docs = data.documents.items || [];
  const docsPct = docs.length ? (docs.filter((d) => d.stored).length / docs.length) * 100 : 50;
  const hasContacts = (data.emergency.contacts || []).length > 0;
  const hasMedical = !!(data.emergency.medical.bloodType || data.emergency.medical.allergies || data.emergency.medical.conditions);
  const hasInsurance = !!data.emergency.insurance.provider;
  const emergencyPts = [hasContacts, hasMedical, hasInsurance].filter(Boolean).length;
  const protectionScore = Math.round((docsPct + (emergencyPts / 3) * 100) / 2);

  return [
    { key: "savings", label: "Savings", value: savingsScore, color: COLORS.green, icon: PiggyBank, detail: `${fmtGBP(totalSavings)} saved across your emergency fund and savings accounts.` },
    { key: "debt", label: "Debt", value: debtScore, color: COLORS.red, icon: CreditCard, detail: data.finances.debts.length ? `${fmtGBP(totalDebt)} in tracked debt.` : "No debts tracked — nothing weighing you down." },
    { key: "spending", label: "Spending", value: spendingScore, color: COLORS.amber, icon: Repeat, detail: subs.length ? `${fmtGBP(subsMonthly)}/mo across ${subs.length} subscriptions, ${unnecessaryCount} flagged unnecessary.` : "No subscriptions tracked yet." },
    { key: "admin", label: "Life Admin", value: adminScore, color: COLORS.blue, icon: CalendarClock, detail: deadlines.length ? `${overdue} overdue, ${soon} due within 2 weeks.` : "No deadlines tracked yet." },
    { key: "protection", label: "Protection", value: protectionScore, color: COLORS.violet, icon: ShieldCheck, detail: `${docs.filter((d) => d.stored).length}/${docs.length} documents secured, ${emergencyPts}/3 emergency essentials on file.` },
  ];
}

function buildDiagnostic(data, factors) {
  const income = getMonthlyIncome(data);
  const subs = [...data.finances.subscriptions].sort((a, b) => monthlyAmount(b) - monthlyAmount(a));
  const flaggedUnnecessary = subs.filter((s) => s.necessary === "unnecessary");
  const leakThreshold = income > 0 ? income * 0.03 : 15;
  const leaks = flaggedUnnecessary.length > 0 ? flaggedUnnecessary : subs.filter((s) => s.necessary !== "necessary" && monthlyAmount(s) > leakThreshold);
  const subsMonthly = getMonthlySubsTotal(data);
  const leaksAnnual = leaks.reduce((s, x) => s + monthlyAmount(x), 0) * 12;

  const deadlines = data.admin.deadlines || [];
  const now = new Date();
  const overdue = deadlines.filter((d) => new Date(d.date) < now);
  const totalDebt = getTotalDebt(data);
  const totalBudgeted = getTotalBudgeted(data);
  const ef = data.finances.emergencyFund;
  const efTarget = getEmergencyTarget(data);

  const risks = [];
  if (factors.find((f) => f.key === "savings").value < 25) risks.push("Minimal emergency savings — a single unexpected cost could set you back.");
  if (overdue.length > 0) risks.push(`${overdue.length} deadline${overdue.length > 1 ? "s" : ""} already overdue.`);
  if (totalDebt > 0 && income > 0 && totalDebt > income * 6) risks.push("Debt load is high relative to income.");
  if (leaks.length > 0) risks.push(`${leaks.length} subscription${leaks.length > 1 ? "s" : ""} flagged as likely low-value spend.`);
  if (income > 0 && totalBudgeted > income) risks.push("Your planned budget exceeds your income.");
  if (efTarget > 0 && ef.current < efTarget * 0.5) risks.push("Emergency fund covers less than half its target.");
  if ((data.emergency.contacts || []).length === 0) risks.push("No emergency contacts on file.");
  if (!data.emergency.insurance.provider) risks.push("No insurance details on record.");
  if (risks.length === 0) risks.push("No major risks detected right now — keep it that way.");

  const sortedAsc = [...factors].sort((a, b) => a.value - b.value);
  const sortedDesc = [...factors].sort((a, b) => b.value - a.value);
  const strengths = sortedDesc.slice(0, 2);
  const weaknesses = sortedAsc.slice(0, 2);

  const adviceMap = {
    savings: `Build your emergency fund — you're at ${efTarget > 0 ? Math.round((ef.current / efTarget) * 100) : 0}% of your target. Small, regular transfers close this fast.`,
    debt: `Make a plan for your highest-interest debt first. ${fmtGBP(totalDebt)} outstanding is worth tackling deliberately.`,
    spending: `Review your subscriptions. You're spending ${fmtGBP(subsMonthly)}/mo — ${leaks.length ? `${leaks.length} of these look like quiet waste.` : "worth a periodic audit either way."}`,
    admin: `Clear your overdue admin first. ${overdue.length} item${overdue.length !== 1 ? "s" : ""} need attention before anything else.`,
    protection: "Fill in your Document Vault and Emergency tab — this is what protects you if something goes wrong.",
  };
  const advice = sortedAsc.slice(0, 3).map((f) => adviceMap[f.key]);

  return { leaks, subsMonthly, leaksAnnual, risks, strengths, weaknesses, advice };
}

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
    let start = null, raf;
    const tick = (t) => {
      if (!start) start = t;
      const p = clamp((t - start) / duration, 0, 1);
      setVal(targetRef.current * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .aos-root { font-family:'Inter',sans-serif; font-variant-numeric:tabular-nums; position:relative; min-height:100vh; display:flex; transition: background .3s,color .3s; }
  .aos-root * { box-sizing:border-box; }
  .aos-root[data-theme="dark"] { --bg:#0E0F13; --surface:#1A1B21; --surface-2:#212229; --text:#F2F3F5; --text-muted:#8B8D98; --border:rgba(255,255,255,.08); --shadow:0 1px 2px rgba(0,0,0,.4); --shadow-lg:0 8px 30px rgba(0,0,0,.45); }
  .aos-root[data-theme="light"] { --bg:#F4F5F9; --surface:#FFFFFF; --surface-2:#EEF0F6; --text:#1B1C22; --text-muted:#6B6E78; --border:rgba(0,0,0,.07); --shadow:0 1px 2px rgba(20,20,30,.06); --shadow-lg:0 16px 40px rgba(20,20,30,.12); }
  .aos-root { background:var(--bg); color:var(--text); }
  .aos-sidebar { width:216px; flex-shrink:0; padding:28px 14px; display:flex; flex-direction:column; gap:4px; border-right:1px solid var(--border); }
  .aos-brand { padding:6px 12px 22px; font-weight:800; font-size:17px; letter-spacing:-0.01em; }
  .aos-navbtn { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:12px; border:none; background:none; color:var(--text-muted); font-family:'Inter'; font-size:13.5px; font-weight:600; cursor:pointer; text-align:left; transition:background .15s,color .15s; }
  .aos-navbtn:hover { background:var(--surface-2); color:var(--text); }
  .aos-navbtn.active { background:${hexToRgba(COLORS.primary, 0.13)}; color:${COLORS.primary}; }
  .aos-main { flex:1; padding:38px 44px 60px; max-width:1180px; overflow:hidden; }
  .aos-page { animation-duration:.42s; animation-timing-function:cubic-bezier(.22,1,.36,1); animation-fill-mode:both; }
  .slide-right { animation-name:slideInRight; } .slide-left { animation-name:slideInLeft; }
  @keyframes slideInRight { from{opacity:0;transform:translateX(28px);} to{opacity:1;transform:translateX(0);} }
  @keyframes slideInLeft { from{opacity:0;transform:translateX(-28px);} to{opacity:1;transform:translateX(0);} }
  .aos-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:26px; }
  .aos-greeting { font-size:24px; font-weight:800; letter-spacing:-0.015em; }
  .aos-date { font-size:12.5px; color:var(--text-muted); }
  .aos-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .aos-grid.cols-2 { grid-template-columns:repeat(2,1fr); }
  .aos-card { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:22px; box-shadow:var(--shadow); }
  .aos-card.span-2 { grid-column:span 2; }
  .aos-card.clickable { cursor:pointer; transition:transform .15s,box-shadow .15s; }
  .aos-card.clickable:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
  .aos-eyebrow { font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--text-muted); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .aos-bignum { font-size:38px; font-weight:800; letter-spacing:-0.02em; line-height:1; }
  .aos-sub { font-size:12.5px; color:var(--text-muted); margin-top:6px; line-height:1.5; }
  .aos-track { height:8px; background:var(--surface-2); border-radius:5px; overflow:hidden; margin-top:14px; }
  .aos-fill { height:100%; border-radius:5px; transition:width 1s cubic-bezier(.22,1,.36,1); }
  .aos-icon-chip { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .aos-banner { border-radius:20px; padding:24px 26px; display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:22px; background:linear-gradient(135deg, ${hexToRgba(COLORS.primary, 0.18)}, ${hexToRgba(COLORS.violet, 0.14)}); border:1px solid ${hexToRgba(COLORS.primary, 0.25)}; }
  .aos-banner-title { font-size:17px; font-weight:800; margin-bottom:4px; }
  .aos-banner-sub { font-size:12.5px; color:var(--text-muted); max-width:420px; }
  .aos-cta { display:flex; align-items:center; gap:8px; background:${COLORS.primary}; color:#fff; border:none; padding:11px 18px; border-radius:12px; font-weight:700; font-size:13px; cursor:pointer; flex-shrink:0; white-space:nowrap; }
  .aos-cta:hover { background:#4C50D8; }
  .aos-section-title { font-size:21px; font-weight:800; letter-spacing:-0.015em; margin:0 0 4px; }
  .aos-section-sub { font-size:13px; color:var(--text-muted); margin-bottom:24px; }
  .aos-input, .aos-select { background:var(--surface-2); border:1px solid var(--border); color:var(--text); font-family:'Inter'; font-size:13.5px; padding:10px 13px; border-radius:10px; outline:none; }
  .aos-input:focus, .aos-select:focus { border-color:${COLORS.primary}; }
  .aos-btn { background:${COLORS.primary}; color:#fff; border:none; font-size:13px; font-weight:700; padding:10px 16px; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:6px; }
  .aos-btn:hover { background:#4C50D8; }
  .aos-btn-ghost { background:var(--surface-2); border:1px solid var(--border); color:var(--text); font-size:12.5px; font-weight:600; padding:9px 14px; border-radius:10px; cursor:pointer; }
  .aos-btn-ghost:hover { border-color:${COLORS.primary}; }
  .aos-btn-text { background:none; border:none; color:var(--text-muted); font-size:12.5px; cursor:pointer; text-decoration:underline; padding:0; }
  .aos-btn-text:hover { color:${COLORS.primary}; }
  @keyframes ringPop { from{transform:scale(.82);opacity:0;} to{transform:scale(1);opacity:1;} }
  .vault-icon-lg { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
  .aos-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border); }
  .aos-row:last-child { border-bottom:none; }
  .aos-row-label { font-size:13.5px; font-weight:600; }
  .aos-row-meta { font-size:11.5px; color:var(--text-muted); margin-top:2px; }
  .aos-row-value { font-size:13.5px; font-weight:700; }
  .aos-empty { font-size:13px; color:var(--text-muted); padding:16px 0; }
  .aos-delete { color:var(--text-muted); cursor:pointer; }
  .aos-delete:hover { color:${COLORS.red}; }
  .aos-form-row { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
  .aos-form-row .aos-input, .aos-form-row .aos-select { flex:1; min-width:100px; }
  .aos-fieldset { margin-bottom:16px; }
  .aos-fieldset label { display:block; font-size:11.5px; color:var(--text-muted); margin-bottom:6px; font-weight:600; }
  .aos-checkbox-row { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); }
  .aos-checkbox-row:last-child { border-bottom:none; }
  .aos-checkbox { width:18px; height:18px; border:1.5px solid var(--border); border-radius:6px; flex-shrink:0; margin-top:1px; cursor:pointer; display:flex; align-items:center; justify-content:center; background:transparent; }
  .aos-checkbox.checked { background:${COLORS.primary}; border-color:${COLORS.primary}; }
  .aos-checklabel { font-size:13.5px; font-weight:600; cursor:pointer; }
  .aos-checklabel.done { color:var(--text-muted); text-decoration:line-through; }
  .aos-subnav-row { display:flex; gap:8px; margin-bottom:22px; flex-wrap:wrap; }
  .aos-subnav-btn { background:var(--surface-2); border:1px solid var(--border); color:var(--text-muted); font-family:'Inter'; font-size:12.5px; font-weight:600; padding:8px 14px; border-radius:10px; cursor:pointer; }
  .aos-subnav-btn.active { background:${hexToRgba(COLORS.primary, 0.15)}; color:${COLORS.primary}; border-color:${hexToRgba(COLORS.primary, 0.4)}; }
  .ls-wrap { display:flex; flex-direction:column; align-items:center; }
  .ls-orbit-wrap { display:block; } .ls-list-wrap { display:none; }
  @media (max-width:760px) { .ls-orbit-wrap{display:none;} .ls-list-wrap{display:block;width:100%;} }
  .ls-orbit { position:relative; width:540px; height:540px; margin:10px auto 18px; }
  .ls-orbit-ring { position:absolute; inset:60px; border:1.5px dashed var(--border); border-radius:50%; }
  .ls-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:188px; height:188px; border-radius:50%; background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow-lg); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:2; }
  .ls-center-num { font-size:46px; font-weight:800; letter-spacing:-0.02em; }
  .ls-center-label { font-size:11px; color:var(--text-muted); font-weight:700; letter-spacing:.05em; text-transform:uppercase; margin-top:2px; }
  .ls-sat-pos { position:absolute; transform:translate(-50%,-50%); }
  .ls-sat { width:124px; padding:12px; border-radius:14px; background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow); cursor:pointer; transition:transform .18s,box-shadow .18s; text-align:center; }
  .ls-sat-pos:hover .ls-sat { transform:scale(1.07); box-shadow:var(--shadow-lg); }
  .ls-sat.selected { border-color:var(--sat-color); }
  .ls-sat-icon { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; }
  .ls-sat-label { font-size:11.5px; font-weight:700; }
  .ls-sat-val { font-size:15px; font-weight:800; margin-top:2px; }
  .ls-detail { width:100%; max-width:540px; }
  .ls-detail-head { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .ls-factor-list-row { display:flex; align-items:center; gap:14px; padding:14px; border-radius:14px; background:var(--surface); border:1px solid var(--border); margin-bottom:10px; cursor:pointer; }
  .diag-overlay { position:absolute; inset:0; background:var(--bg); z-index:50; display:flex; flex-direction:column; padding:36px 48px; animation:fadeIn .25s ease; }
  @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
  .diag-close { position:absolute; top:28px; right:36px; background:var(--surface-2); border:none; width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text); }
  .diag-body { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; max-width:620px; margin:0 auto; width:100%; }
  .diag-eyebrow { font-size:11.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:${COLORS.primary}; margin-bottom:14px; display:flex; align-items:center; gap:6px; }
  .diag-title { font-size:26px; font-weight:800; letter-spacing:-0.015em; text-align:center; margin-bottom:8px; }
  .diag-sub { font-size:13.5px; color:var(--text-muted); text-align:center; margin-bottom:30px; max-width:460px; }
  .diag-list-item { width:100%; display:flex; align-items:flex-start; gap:12px; padding:13px 0; border-bottom:1px solid var(--border); }
  .diag-list-item:last-child { border-bottom:none; }
  .diag-footer { display:flex; align-items:center; justify-content:space-between; padding-top:24px; max-width:620px; margin:0 auto; width:100%; }
  .diag-dots { display:flex; gap:6px; }
  .diag-dot { width:6px; height:6px; border-radius:50%; background:var(--border); }
  .diag-dot.active { background:${COLORS.primary}; width:18px; border-radius:3px; }
  .diag-strength-cols { display:flex; gap:16px; width:100%; }
  .diag-strength-col { flex:1; }
  .diag-strength-head { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:10px; }
  .diag-advice-item { display:flex; gap:14px; width:100%; align-items:flex-start; padding:14px 0; border-bottom:1px solid var(--border); }
  .diag-advice-item:last-child { border-bottom:none; }
  .diag-advice-num { width:26px; height:26px; border-radius:8px; background:${hexToRgba(COLORS.primary, 0.15)}; color:${COLORS.primary}; font-weight:800; font-size:12.5px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .aos-tag-leak { font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:${COLORS.amber}; background:${hexToRgba(COLORS.amber, 0.14)}; padding:3px 8px; border-radius:6px; margin-left:8px; }
  .aos-loading { padding:60px; color:var(--text-muted); }
`;

export default function AdultingOS() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [direction, setDirection] = useState("right");
  const [financesSubTab, setFinancesSubTab] = useState("overview");
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagStep, setDiagStep] = useState(0);
  const loadedRef = useRef(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        const raw = res && res.value ? JSON.parse(res.value) : {};
        let financesSeed = DEFAULT_FINANCES;
        if (!raw.finances && raw.money) {
          financesSeed = {
            ...DEFAULT_FINANCES,
            income: { monthly: raw.profile?.income || 0 },
            subscriptions: (raw.money.subscriptions || []).map((s) => ({ id: s.id || uid(), name: s.name, amount: s.amount, cycle: s.cycle, category: "Other", dueDay: "", necessary: "unreviewed" })),
            debts: (raw.money.debts || []).map((d) => ({ id: d.id || uid(), name: d.name, balance: d.balance, apr: "", minPayment: "" })),
            emergencyFund: { current: raw.money.savingsCurrent || 0, targetMonths: 3, hasDedicatedAccount: false },
          };
        }
        const merged = {
          ...DEFAULT_DATA, ...raw,
          profile: { ...DEFAULT_DATA.profile, ...raw.profile },
          finances: { ...financesSeed, ...raw.finances },
          admin: { ...DEFAULT_DATA.admin, ...raw.admin },
          documents: { ...DEFAULT_DATA.documents, ...raw.documents },
          emergency: { ...DEFAULT_DATA.emergency, ...raw.emergency },
          security: { ...DEFAULT_DATA.security, ...raw.security },
          meta: { ...DEFAULT_DATA.meta, ...raw.meta },
        };
        delete merged.money;
        setData(merged);
      } catch { setData(DEFAULT_DATA); }
      loadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (data && loadedRef.current) storage.set(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  useEffect(() => {
    if (data && !autoOpenedRef.current && !data.meta.diagnosticSeen) {
      autoOpenedRef.current = true;
      const t = setTimeout(() => setDiagnosticOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [data]);

  const factors = useMemo(() => (data ? computeFactors(data) : []), [data]);
  const totalScore = factors.length ? Math.round(factors.reduce((s, f) => s + f.value, 0) / factors.length) : 0;
  const diagnostic = useMemo(() => (data ? buildDiagnostic(data, factors) : null), [data, factors]);

  if (!data) {
    return <div className="aos-root" data-theme="dark"><style>{CSS}</style><div className="aos-loading">Loading Adulting OS…</div></div>;
  }

  const update = (path, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const goTo = (key) => {
    const order = NAV.map((n) => n.key);
    setDirection(order.indexOf(key) >= order.indexOf(activeTab) ? "right" : "left");
    setActiveTab(key);
  };
  const goToFinances = (subtab) => { setFinancesSubTab(subtab); goTo("finances"); };

  const closeDiagnostic = () => { setDiagnosticOpen(false); setDiagStep(0); update(["meta", "diagnosticSeen"], true); };

  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greeting = data.profile.name ? `${greetingWord}, ${data.profile.name}` : greetingWord;
  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="aos-root" data-theme={data.profile.theme}>
      <style>{CSS}</style>
      <div className="aos-sidebar">
        <div className="aos-brand">Adulting OS</div>
        {NAV.map((n) => {
          const Icon = n.icon;
          return <button key={n.key} className={"aos-navbtn" + (activeTab === n.key ? " active" : "")} onClick={() => goTo(n.key)}><Icon size={17} />{n.label}</button>;
        })}
      </div>

      <div className="aos-main">
        <div key={activeTab} className={"aos-page " + (direction === "right" ? "slide-right" : "slide-left")}>
          {activeTab === "home" && (
            <HomeTab data={data} greeting={greeting} todayStr={todayStr} totalScore={totalScore}
              onOpenLifeScore={() => goTo("lifescore")} onOpenDiagnostic={() => setDiagnosticOpen(true)} onOpenFinances={goToFinances} onOpenVault={() => goTo("vault")} />
          )}
          {activeTab === "finances" && <FinancesTab data={data} update={update} sub={financesSubTab} setSub={setFinancesSubTab} />}
          {activeTab === "admin" && <AdminTab data={data} update={update} />}
          {activeTab === "vault" && <VaultTab data={data} update={update} />}
          {activeTab === "lifescore" && <LifeScoreTab factors={factors} totalScore={totalScore} selectedFactor={selectedFactor} setSelectedFactor={setSelectedFactor} />}
          {activeTab === "settings" && <SettingsTab data={data} update={update} setData={setData} />}
        </div>
      </div>

      {diagnosticOpen && diagnostic && (
        <DiagnosticOverlay totalScore={totalScore} diagnostic={diagnostic} step={diagStep} setStep={setDiagStep} onClose={closeDiagnostic} />
      )}
    </div>
  );
}

function ScoreRing({ pct, size = 92, stroke = 7, color = COLORS.primary }) {
  const gid = useId();
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = c - (clamp(pct, 0, 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible", animation: "ringPop .6s cubic-bezier(.34,1.56,.64,1) both" }}>
      <defs>
        <linearGradient id={`grad-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={lighten(color, 0.55)} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id={`glow-${gid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={stroke * 0.55} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#grad-${gid})`} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} filter={`url(#glow-${gid})`}
        style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.34,1.56,.64,1)" }}
      />
    </svg>
  );
}
function IconChip({ Icon, color, size = 34 }) {
  return <div className="aos-icon-chip" style={{ background: hexToRgba(color, 0.15) }}><Icon size={size * 0.5} color={color} /></div>;
}
function StatCard({ Icon, color, label, big, sub, onClick }) {
  return (
    <div className={"aos-card" + (onClick ? " clickable" : "")} onClick={onClick}>
      <div className="aos-eyebrow"><IconChip Icon={Icon} color={color} size={26} />{label}</div>
      <div className="aos-bignum" style={{ fontSize: 26 }}>{big}</div>
      {sub && <div className="aos-sub">{sub}</div>}
    </div>
  );
}
function Bar({ pct, color }) { return <div className="aos-track"><div className="aos-fill" style={{ width: clamp(pct, 0, 100) + "%", background: color }} /></div>; }
function SubNav({ tabs, active, onChange }) {
  return <div className="aos-subnav-row">{tabs.map((t) => <button key={t.key} className={"aos-subnav-btn" + (active === t.key ? " active" : "")} onClick={() => onChange(t.key)}>{t.label}</button>)}</div>;
}

function HomeTab({ data, greeting, todayStr, totalScore, onOpenLifeScore, onOpenDiagnostic, onOpenFinances, onOpenVault }) {
  const animScore = useCountUp(totalScore);
  const monthlySubsTotal = getMonthlySubsTotal(data);
  const totalDebt = getTotalDebt(data);
  const totalSavings = getTotalSavings(data);
  const ef = data.finances.emergencyFund;
  const efTarget = getEmergencyTarget(data);
  const efPct = efTarget > 0 ? clamp((ef.current / efTarget) * 100, 0, 100) : 0;
  const animEfPct = useCountUp(efPct);
  const upcoming = [...(data.admin.deadlines || [])].filter((d) => d.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextDeadline = upcoming[0];
  const docsCount = data.documents.items.filter((d) => d.stored).length;

  return (
    <div>
      <div className="aos-header"><div className="aos-greeting">{greeting}</div><div className="aos-date">{todayStr}</div></div>

      <div className="aos-banner">
        <div>
          <div className="aos-banner-title">Your Life Score Diagnostic</div>
          <div className="aos-banner-sub">See your money leaks, real risks, and the 3 moves to make right now.</div>
        </div>
        <button className="aos-cta" onClick={onOpenDiagnostic}><Sparkles size={15} /> View Diagnostic</button>
      </div>

      <div className="aos-grid" style={{ marginBottom: 16 }}>
        <div className="aos-card span-2 clickable" onClick={onOpenLifeScore}>
          <div className="aos-eyebrow"><Gauge size={13} /> Life Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <ScoreRing pct={animScore} />
            <div>
              <div className="aos-bignum">{Math.round(animScore)}<span style={{ fontSize: 18, color: "var(--text-muted)" }}>/100</span></div>
              <div className="aos-sub">{scoreVerdict(totalScore)} Tap to see why →</div>
            </div>
          </div>
        </div>
        <div className="aos-card clickable" onClick={() => onOpenFinances("emergency")}>
          <div className="aos-eyebrow"><IconChip Icon={PiggyBank} color={COLORS.green} size={26} /> Emergency Fund</div>
          <div className="aos-bignum" style={{ fontSize: 26 }}>{fmtGBP(ef.current)}</div>
          <div className="aos-sub">{Math.round(efPct)}% of target</div>
          <div className="aos-track"><div className="aos-fill" style={{ width: animEfPct + "%", background: COLORS.green }} /></div>
        </div>
      </div>

      <div className="aos-grid">
        <div className="aos-card clickable" onClick={() => onOpenFinances("subscriptions")}>
          <div className="aos-eyebrow"><IconChip Icon={Repeat} color={COLORS.amber} size={26} /> Subscriptions</div>
          <div className="aos-bignum" style={{ fontSize: 26 }}>{fmtGBP(monthlySubsTotal)}<span style={{ fontSize: 13, color: "var(--text-muted)" }}>/mo</span></div>
          <div className="aos-sub">{data.finances.subscriptions.length} active · {fmtGBP(monthlySubsTotal * 12)}/yr</div>
        </div>
        <div className="aos-card clickable" onClick={() => onOpenFinances("debt")}>
          <div className="aos-eyebrow"><IconChip Icon={CreditCard} color={COLORS.red} size={26} /> Debt</div>
          <div className="aos-bignum" style={{ fontSize: 26 }}>{fmtGBP(totalDebt)}</div>
          <div className="aos-sub">{data.finances.debts.length} tracked</div>
        </div>
        <div className="aos-card">
          <div className="aos-eyebrow"><IconChip Icon={CalendarClock} color={COLORS.blue} size={26} /> Next Deadline</div>
          {nextDeadline ? (<><div style={{ fontSize: 15, fontWeight: 700 }}>{nextDeadline.title}</div><div className="aos-sub">{new Date(nextDeadline.date).toLocaleDateString("en-GB")}</div></>) : <div className="aos-sub">Nothing tracked yet</div>}
        </div>
      </div>

      <div className="aos-grid cols-2" style={{ marginTop: 16 }}>
        <div className="aos-card clickable" onClick={() => onOpenFinances("savings")}>
          <div className="aos-eyebrow"><IconChip Icon={PiggyBank} color={COLORS.primary} size={26} /> Total Saved</div>
          <div className="aos-bignum" style={{ fontSize: 26 }}>{fmtGBP(totalSavings)}</div>
          <div className="aos-sub">emergency fund + savings accounts</div>
        </div>
        <div className="aos-card clickable" onClick={onOpenVault}>
          <div className="aos-eyebrow"><IconChip Icon={FileText} color={COLORS.violet} size={26} /> Document Vault</div>
          <div className="aos-bignum" style={{ fontSize: 26 }}>{docsCount}/{data.documents.items.length}</div>
          <div className="aos-sub">documents secured</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Finances ----------------------------- */

function FinancesTab({ data, update, sub, setSub }) {
  return (
    <div>
      <div className="aos-section-title">Finances</div>
      <div className="aos-section-sub">Every board below shares the same numbers — change one, the rest update.</div>
      <SubNav tabs={[
        { key: "overview", label: "Overview" }, { key: "budgeting", label: "Budgeting" }, { key: "subscriptions", label: "Subscriptions" },
        { key: "debt", label: "Debt" }, { key: "paycheck", label: "Paycheck" }, { key: "emergency", label: "Emergency Fund" }, { key: "savings", label: "Savings Accounts" },
      ]} active={sub} onChange={setSub} />
      {sub === "overview" && <FinancesOverview data={data} goSub={setSub} />}
      {sub === "budgeting" && <BudgetingBoard data={data} update={update} />}
      {sub === "subscriptions" && <SubscriptionsBoard data={data} update={update} />}
      {sub === "debt" && <DebtBoard data={data} update={update} />}
      {sub === "paycheck" && <PaycheckBoard data={data} update={update} />}
      {sub === "emergency" && <EmergencyFundBoard data={data} update={update} />}
      {sub === "savings" && <SavingsAccountsBoard data={data} update={update} />}
    </div>
  );
}

function FinancesOverview({ data, goSub }) {
  const income = getMonthlyIncome(data);
  const totalSpent = Object.values(getSpentByCategory(data)).reduce((a, b) => a + b, 0);
  const cashFlow = income - totalSpent;
  const netWorth = getNetWorth(data);
  const subsMonthly = getMonthlySubsTotal(data);
  const unnecessaryAnnual = data.finances.subscriptions.filter((s) => s.necessary === "unnecessary").reduce((s, x) => s + monthlyAmount(x), 0) * 12;
  const plan = simulatePayoff(data.finances.debts, data.finances.debtExtraPayment);
  const efTarget = getEmergencyTarget(data);
  const efPct = efTarget > 0 ? clamp((data.finances.emergencyFund.current / efTarget) * 100, 0, 100) : 0;
  const savingsAccTotal = data.finances.savingsAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  return (
    <div>
      <div className="aos-grid cols-2" style={{ marginBottom: 16 }}>
        <StatCard Icon={netWorth >= 0 ? CheckCircle2 : AlertTriangle} color={netWorth >= 0 ? COLORS.green : COLORS.red} label="Net worth" big={fmtGBP(netWorth)} sub="savings + accounts, minus debt" />
        <StatCard Icon={cashFlow >= 0 ? Sparkles : AlertTriangle} color={cashFlow >= 0 ? COLORS.primary : COLORS.red} label="Cash flow this month" big={fmtGBP(cashFlow)} sub={`${fmtGBP(income)} income − ${fmtGBP(totalSpent)} spent`} />
      </div>
      <div className="aos-grid">
        <StatCard Icon={Repeat} color={COLORS.amber} label="Subscriptions" big={fmtGBP(subsMonthly) + "/mo"} sub={unnecessaryAnnual > 0 ? `Save ${fmtGBP(unnecessaryAnnual)}/yr if cancelled` : "all reviewed"} onClick={() => goSub("subscriptions")} />
        <StatCard Icon={CreditCard} color={COLORS.red} label="Debt" big={fmtGBP(getTotalDebt(data))} sub={data.finances.debts.length ? `Debt-free in ${plan.months} mo` : "none tracked"} onClick={() => goSub("debt")} />
        <StatCard Icon={ShieldCheck} color={COLORS.violet} label="Emergency fund" big={Math.round(efPct) + "%"} sub="funded" onClick={() => goSub("emergency")} />
      </div>
      <div className="aos-grid cols-2" style={{ marginTop: 16 }}>
        <StatCard Icon={Wallet} color={COLORS.primary} label="Budgeting" big={fmtGBP(getTotalBudgeted(data))} sub="planned this month" onClick={() => goSub("budgeting")} />
        <StatCard Icon={PiggyBank} color={COLORS.green} label="Savings accounts" big={fmtGBP(savingsAccTotal)} sub={`${data.finances.savingsAccounts.length} accounts`} onClick={() => goSub("savings")} />
      </div>
    </div>
  );
}

function BudgetsList({ data, update, spentByCategory, showSpent }) {
  const [form, setForm] = useState({ category: "", allocated: "" });
  const budgets = data.finances.budgets;
  const addBudget = () => { if (!form.category) return; update(["finances", "budgets"], [...budgets, { id: uid(), category: form.category, allocated: Number(form.allocated) || 0 }]); setForm({ category: "", allocated: "" }); };
  const removeBudget = (id) => update(["finances", "budgets"], budgets.filter((b) => b.id !== id));
  const editAmount = (id, val) => update(["finances", "budgets"], budgets.map((b) => (b.id === id ? { ...b, allocated: Number(val) || 0 } : b)));

  return (
    <div>
      <div className="aos-form-row">
        <input className="aos-input" placeholder="Category name" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="aos-input" placeholder="Amount (£)" type="number" value={form.allocated} onChange={(e) => setForm({ ...form, allocated: e.target.value })} />
        <button className="aos-btn" onClick={addBudget}><Plus size={14} />Add</button>
      </div>
      {budgets.map((b) => {
        const spent = showSpent ? (spentByCategory[b.category] || 0) : null;
        const pct = b.allocated > 0 && spent !== null ? (spent / b.allocated) * 100 : 0;
        return (
          <div key={b.id} style={{ marginBottom: 14 }}>
            <div className="aos-row" style={{ borderBottom: "none", paddingBottom: 6 }}>
              <div className="aos-row-label">{b.category}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input className="aos-input" type="number" value={b.allocated} onChange={(e) => editAmount(b.id, e.target.value)} style={{ width: 90, padding: "6px 10px" }} />
                <Trash2 size={15} className="aos-delete" onClick={() => removeBudget(b.id)} />
              </div>
            </div>
            {showSpent && (<><Bar pct={pct} color={pct > 100 ? COLORS.red : COLORS.primary} /><div className="aos-sub" style={{ marginTop: 4 }}>{fmtGBP(spent)} spent of {fmtGBP(b.allocated)}</div></>)}
          </div>
        );
      })}
    </div>
  );
}

function TransactionsView({ data, update }) {
  const categories = data.finances.budgets.map((b) => b.category);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", category: categories[0] || "Other", type: "expense", amount: "" });
  const add = () => { if (!form.description || !form.amount) return; update(["finances", "transactions"], [...data.finances.transactions, { id: uid(), ...form, amount: Number(form.amount) }]); setForm({ ...form, description: "", amount: "" }); };
  const remove = (id) => update(["finances", "transactions"], data.finances.transactions.filter((t) => t.id !== id));
  const sorted = [...data.finances.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="aos-card">
      <div className="aos-eyebrow">Add Transaction</div>
      <div className="aos-form-row">
        <input className="aos-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="aos-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select className="aos-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select>
        <select className="aos-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}<option>Other</option></select>
        <input className="aos-input" placeholder="Amount (£)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <button className="aos-btn" onClick={add}><Plus size={14} />Add</button>
      </div>
      {sorted.length === 0 && <div className="aos-empty">No transactions logged yet</div>}
      {sorted.map((t) => (
        <div className="aos-row" key={t.id}>
          <div><div className="aos-row-label">{t.description}</div><div className="aos-row-meta">{t.category} · {new Date(t.date).toLocaleDateString("en-GB")}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="aos-row-value" style={{ color: t.type === "income" ? COLORS.green : "var(--text)" }}>{t.type === "income" ? "+" : "-"}{fmtGBP(t.amount)}</div>
            <Trash2 size={15} className="aos-delete" onClick={() => remove(t.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AddFundsRow({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input className="aos-input" placeholder="Add amount" type="number" value={val} onChange={(e) => setVal(e.target.value)} style={{ maxWidth: 140, padding: "7px 11px" }} />
      <button className="aos-btn-ghost" onClick={() => { const n = Number(val); if (n > 0) { onAdd(n); setVal(""); } }}>Add funds</button>
    </div>
  );
}

function GoalsView({ data, update }) {
  const [form, setForm] = useState({ name: "", target: "", deadline: "" });
  const goals = data.finances.goals;
  const add = () => { if (!form.name || !form.target) return; update(["finances", "goals"], [...goals, { id: uid(), name: form.name, target: Number(form.target), current: 0, deadline: form.deadline }]); setForm({ name: "", target: "", deadline: "" }); };
  const remove = (id) => update(["finances", "goals"], goals.filter((g) => g.id !== id));
  const addFunds = (id, amt) => update(["finances", "goals"], goals.map((g) => (g.id === id ? { ...g, current: (Number(g.current) || 0) + amt } : g)));

  return (
    <div className="aos-card">
      <div className="aos-eyebrow">Add a Goal</div>
      <div className="aos-form-row">
        <input className="aos-input" placeholder="Goal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="aos-input" placeholder="Target (£)" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <input className="aos-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <button className="aos-btn" onClick={add}><Plus size={14} />Add</button>
      </div>
      {goals.length === 0 && <div className="aos-empty">No goals set yet</div>}
      {goals.map((g) => {
        const pct = g.target > 0 ? clamp((g.current / g.target) * 100, 0, 100) : 0;
        return (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div className="aos-row" style={{ borderBottom: "none", paddingBottom: 6 }}>
              <div><div className="aos-row-label">{g.name}</div><div className="aos-row-meta">{g.deadline ? `by ${new Date(g.deadline).toLocaleDateString("en-GB")}` : ""}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="aos-row-value">{fmtGBP(g.current)} / {fmtGBP(g.target)}</div>
                <Trash2 size={15} className="aos-delete" onClick={() => remove(g.id)} />
              </div>
            </div>
            <Bar pct={pct} color={COLORS.green} />
            <AddFundsRow onAdd={(amt) => addFunds(g.id, amt)} />
          </div>
        );
      })}
    </div>
  );
}

function BudgetingBoard({ data, update }) {
  const [sub, setSub] = useState("budgets");
  const income = getMonthlyIncome(data);
  const totalBudgeted = getTotalBudgeted(data);
  const spentByCategory = getSpentByCategory(data);
  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="aos-grid cols-2" style={{ marginBottom: 20 }}>
        <StatCard Icon={Wallet} color={COLORS.primary} label="Budgeted this month" big={fmtGBP(totalBudgeted)} sub={`of ${fmtGBP(income)} income`} />
        <StatCard Icon={Repeat} color={totalSpent > totalBudgeted ? COLORS.red : COLORS.green} label="Spent this month" big={fmtGBP(totalSpent)} sub={totalSpent > totalBudgeted ? "Over budget" : "On track"} />
      </div>
      <SubNav tabs={[{ key: "budgets", label: "Budgets" }, { key: "transactions", label: "Transactions" }, { key: "goals", label: "Goals" }]} active={sub} onChange={setSub} />
      {sub === "budgets" && <div className="aos-card"><BudgetsList data={data} update={update} spentByCategory={spentByCategory} showSpent={true} /></div>}
      {sub === "transactions" && <TransactionsView data={data} update={update} />}
      {sub === "goals" && <GoalsView data={data} update={update} />}
    </div>
  );
}

function SubsCalendar({ subs }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="aos-card">
      <div className="aos-eyebrow">Due Dates</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {days.map((d) => {
          const due = subs.filter((s) => Number(s.dueDay) === d);
          return (
            <div key={d} style={{ width: 74, minHeight: 64, border: "1px solid var(--border)", borderRadius: 10, padding: "6px 8px", background: due.length ? hexToRgba(COLORS.amber, 0.08) : "var(--surface-2)" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>{d}</div>
              {due.map((s) => <div key={s.id} style={{ fontSize: 10.5, marginTop: 3, fontWeight: 600, color: COLORS.amber }}>{s.name}</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubsInsights({ subs }) {
  const byCategory = {};
  subs.forEach((s) => { byCategory[s.category || "Other"] = (byCategory[s.category || "Other"] || 0) + monthlyAmount(s); });
  const flagged = subs.filter((s) => s.necessary === "unnecessary");
  return (
    <div className="aos-card">
      <div className="aos-eyebrow">Spend by Category</div>
      {Object.entries(byCategory).length === 0 && <div className="aos-empty">Nothing tracked yet</div>}
      {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
        <div className="aos-row" key={cat}><div className="aos-row-label">{cat}</div><div className="aos-row-value">{fmtGBP(amt)}/mo</div></div>
      ))}
      {flagged.length > 0 && (
        <>
          <div className="aos-eyebrow" style={{ marginTop: 18 }}>Flagged as Unnecessary</div>
          {flagged.map((s) => <div className="aos-row" key={s.id}><div className="aos-row-label">{s.name}</div><div className="aos-row-value">{fmtGBP(monthlyAmount(s))}/mo</div></div>)}
        </>
      )}
    </div>
  );
}

function SubscriptionsBoard({ data, update }) {
  const [sub, setSub] = useState("bills");
  const subs = data.finances.subscriptions;
  const monthlyTotal = getMonthlySubsTotal(data);
  const unnecessaryMonthly = subs.filter((s) => s.necessary === "unnecessary").reduce((s, x) => s + monthlyAmount(x), 0);
  const [form, setForm] = useState({ name: "", amount: "", cycle: "monthly", category: "Other", dueDay: "" });
  const add = () => { if (!form.name || !form.amount) return; update(["finances", "subscriptions"], [...subs, { id: uid(), ...form, necessary: "unreviewed" }]); setForm({ name: "", amount: "", cycle: "monthly", category: "Other", dueDay: "" }); };
  const remove = (id) => update(["finances", "subscriptions"], subs.filter((s) => s.id !== id));
  const setNecessary = (id, val) => update(["finances", "subscriptions"], subs.map((s) => (s.id === id ? { ...s, necessary: val } : s)));

  return (
    <div>
      <div className="aos-grid" style={{ marginBottom: 20 }}>
        <StatCard Icon={Repeat} color={COLORS.amber} label="Monthly total" big={fmtGBP(monthlyTotal)} sub={`${fmtGBP(monthlyTotal * 12)}/yr across ${subs.length}`} />
        <StatCard Icon={AlertTriangle} color={COLORS.red} label="Flagged unnecessary" big={subs.filter((s) => s.necessary === "unnecessary").length} sub="bills marked not worth it" />
        <StatCard Icon={PiggyBank} color={COLORS.green} label="Potential savings" big={fmtGBP(unnecessaryMonthly * 12) + "/yr"} sub="if you cancel flagged bills" />
      </div>
      <SubNav tabs={[{ key: "bills", label: "Bills" }, { key: "calendar", label: "Calendar" }, { key: "insights", label: "Insights" }]} active={sub} onChange={setSub} />
      {sub === "bills" && (
        <div className="aos-card">
          <div className="aos-form-row">
            <input className="aos-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="aos-input" placeholder="Amount (£)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select className="aos-select" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="weekly">Weekly</option></select>
            <input className="aos-input" placeholder="Due day (1-31)" type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} style={{ maxWidth: 120 }} />
            <button className="aos-btn" onClick={add}><Plus size={14} />Add</button>
          </div>
          {subs.length === 0 && <div className="aos-empty">No bills added yet</div>}
          {subs.map((s) => (
            <div className="aos-row" key={s.id}>
              <div><div className="aos-row-label">{s.name}</div><div className="aos-row-meta">{s.cycle}{s.dueDay ? ` · due on ${s.dueDay}` : ""}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="aos-row-value">{fmtGBP(s.amount)}</div>
                <select className="aos-select" value={s.necessary} onChange={(e) => setNecessary(s.id, e.target.value)} style={{ fontSize: 11.5, padding: "6px 8px" }}>
                  <option value="unreviewed">Not reviewed</option><option value="necessary">Necessary</option><option value="unnecessary">Unnecessary</option>
                </select>
                <Trash2 size={15} className="aos-delete" onClick={() => remove(s.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
      {sub === "calendar" && <SubsCalendar subs={subs} />}
      {sub === "insights" && <SubsInsights subs={subs} />}
    </div>
  );
}

function DebtBoard({ data, update }) {
  const debts = data.finances.debts;
  const totalDebt = getTotalDebt(data);
  const totalMin = getTotalMinPayments(data);
  const extra = data.finances.debtExtraPayment || 0;
  const plan = useMemo(() => simulatePayoff(debts, extra), [debts, extra]);
  const [form, setForm] = useState({ name: "", balance: "", apr: "", minPayment: "" });
  const add = () => { if (!form.name || !form.balance) return; update(["finances", "debts"], [...debts, { id: uid(), ...form }]); setForm({ name: "", balance: "", apr: "", minPayment: "" }); };
  const remove = (id) => update(["finances", "debts"], debts.filter((d) => d.id !== id));

  return (
    <div>
      <div className="aos-grid" style={{ marginBottom: 20 }}>
        <StatCard Icon={CreditCard} color={COLORS.red} label="Total debt" big={fmtGBP(totalDebt)} sub={`${debts.length} tracked`} />
        <StatCard Icon={Wallet} color={COLORS.primary} label="Monthly minimums" big={fmtGBP(totalMin)} sub="across all debts" />
        <StatCard Icon={CheckCircle2} color={COLORS.green} label="Debt-free in" big={debts.length ? `${plan.months} mo` : "—"} sub={debts.length ? `≈ ${fmtGBP(plan.totalInterest)} interest total` : "No debts tracked"} />
      </div>
      <div className="aos-card" style={{ marginBottom: 18 }}>
        <div className="aos-eyebrow">Add a Debt</div>
        <div className="aos-form-row">
          <input className="aos-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="aos-input" placeholder="Balance (£)" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          <input className="aos-input" placeholder="APR %" type="number" value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} />
          <input className="aos-input" placeholder="Min payment (£)" type="number" value={form.minPayment} onChange={(e) => setForm({ ...form, minPayment: e.target.value })} />
          <button className="aos-btn" onClick={add}><Plus size={14} />Add</button>
        </div>
        {debts.length === 0 && <div className="aos-empty">No debts tracked — nice.</div>}
        {debts.map((d) => (
          <div className="aos-row" key={d.id}>
            <div><div className="aos-row-label">{d.name}</div><div className="aos-row-meta">{d.apr || 0}% APR · {fmtGBP(d.minPayment)} min/mo</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="aos-row-value">{fmtGBP(d.balance)}</div>
              <Trash2 size={15} className="aos-delete" onClick={() => remove(d.id)} />
            </div>
          </div>
        ))}
      </div>
      <div className="aos-card">
        <div className="aos-eyebrow">Payoff Plan</div>
        <div className="aos-fieldset" style={{ marginBottom: 10 }}>
          <label>Extra monthly payment (£) — thrown at your highest-interest debt first</label>
          <input className="aos-input" type="number" value={extra} onChange={(e) => update(["finances", "debtExtraPayment"], Number(e.target.value))} style={{ width: 160 }} />
        </div>
        {debts.length > 0 ? (
          <div className="aos-sub">At this rate, you'll be debt-free in <b style={{ color: "var(--text)" }}>{plan.months} months</b>, paying roughly <b style={{ color: "var(--text)" }}>{fmtGBP(plan.totalInterest)}</b> in interest along the way.</div>
        ) : <div className="aos-empty">Add a debt to see your payoff plan.</div>}
      </div>
    </div>
  );
}

function PaycheckBoard({ data, update }) {
  const income = getMonthlyIncome(data);
  const totalAllocated = getTotalBudgeted(data);
  const remaining = income - totalAllocated;

  return (
    <div>
      <div className="aos-grid" style={{ marginBottom: 20 }}>
        <StatCard Icon={Wallet} color={COLORS.primary} label="Monthly income" big={fmtGBP(income)} />
        <StatCard Icon={CheckCircle2} color={COLORS.green} label="Allocated" big={fmtGBP(totalAllocated)} sub={`${income > 0 ? Math.round((totalAllocated / income) * 100) : 0}% of income`} />
        <StatCard Icon={remaining < 0 ? AlertTriangle : Sparkles} color={remaining < 0 ? COLORS.red : COLORS.violet} label="Unallocated" big={fmtGBP(remaining)} sub={remaining < 0 ? "You've over-allocated" : "still free to assign"} />
      </div>
      <div className="aos-card" style={{ marginBottom: 18 }}>
        <div className="aos-fieldset" style={{ marginBottom: 0 }}>
          <label>Monthly income (£) — shared with Settings and your Life Score</label>
          <input className="aos-input" type="number" value={income} onChange={(e) => update(["finances", "income", "monthly"], Number(e.target.value))} style={{ width: 180 }} />
        </div>
      </div>
      <div className="aos-card">
        <div className="aos-eyebrow">Where it goes</div>
        <div className="aos-sub" style={{ marginBottom: 14 }}>These categories are shared with your Budgeting board — edit here or there, it's the same plan.</div>
        <BudgetsList data={data} update={update} spentByCategory={{}} showSpent={false} />
      </div>
    </div>
  );
}

function EmergencyFundBoard({ data, update }) {
  const ef = data.finances.emergencyFund;
  const target = getEmergencyTarget(data);
  const pct = target > 0 ? clamp((ef.current / target) * 100, 0, 100) : 0;

  return (
    <div>
      <div className="aos-grid cols-2" style={{ marginBottom: 20 }}>
        <StatCard Icon={PiggyBank} color={COLORS.green} label="Current balance" big={fmtGBP(ef.current)} />
        <StatCard Icon={ShieldCheck} color={COLORS.violet} label="Target" big={fmtGBP(target)} sub={`${ef.targetMonths} months of your budgeted expenses`} />
      </div>
      <div className="aos-card" style={{ marginBottom: 18 }}>
        <Bar pct={pct} color={COLORS.green} />
        <div className="aos-sub" style={{ marginTop: 8 }}>{Math.round(pct)}% funded</div>
      </div>
      <div className="aos-card">
        <div className="aos-fieldset"><label>Current balance (£)</label><input className="aos-input" type="number" value={ef.current} onChange={(e) => update(["finances", "emergencyFund", "current"], Number(e.target.value))} style={{ width: 180 }} /></div>
        <div className="aos-fieldset"><label>Target — months of expenses covered</label>
          <select className="aos-select" value={ef.targetMonths} onChange={(e) => update(["finances", "emergencyFund", "targetMonths"], Number(e.target.value))}>
            <option value={1}>1 month</option><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option>
          </select>
        </div>
        <div className="aos-fieldset" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <div className={"aos-checkbox" + (ef.hasDedicatedAccount ? " checked" : "")} onClick={() => update(["finances", "emergencyFund", "hasDedicatedAccount"], !ef.hasDedicatedAccount)} />
          <div className="aos-checklabel" onClick={() => update(["finances", "emergencyFund", "hasDedicatedAccount"], !ef.hasDedicatedAccount)}>I keep this in a separate, dedicated account</div>
        </div>
      </div>
      <div className="aos-sub" style={{ marginTop: 12 }}>Your target is based on your monthly budgeted expenses ({fmtGBP(getTotalBudgeted(data))}) × {ef.targetMonths} months. Update it in Budgeting and this updates too.</div>
    </div>
  );
}

function SavingsAccountsBoard({ data, update }) {
  const accounts = data.finances.savingsAccounts;
  const total = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const [form, setForm] = useState({ name: "", provider: "", balance: "", type: "Easy access", rate: "", notes: "" });
  const add = () => { if (!form.name || !form.balance) return; update(["finances", "savingsAccounts"], [...accounts, { id: uid(), ...form }]); setForm({ name: "", provider: "", balance: "", type: "Easy access", rate: "", notes: "" }); };
  const remove = (id) => update(["finances", "savingsAccounts"], accounts.filter((a) => a.id !== id));

  return (
    <div>
      <div className="aos-grid cols-2" style={{ marginBottom: 20 }}>
        <StatCard Icon={PiggyBank} color={COLORS.green} label="Total saved" big={fmtGBP(total)} />
        <StatCard Icon={Wallet} color={COLORS.primary} label="Accounts" big={accounts.length} />
      </div>
      <div className="aos-card">
        <div className="aos-eyebrow">Add an Account</div>
        <div className="aos-form-row">
          <input className="aos-input" placeholder="Account name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="aos-input" placeholder="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <input className="aos-input" placeholder="Balance (£)" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          <select className="aos-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Easy access</option><option>ISA</option><option>Fixed term</option><option>Other</option></select>
          <input className="aos-input" placeholder="Rate %" type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} style={{ maxWidth: 100 }} />
          <button className="aos-btn" onClick={add}><Plus size={14} />Add</button>
        </div>
        {accounts.length === 0 && <div className="aos-empty">No savings accounts added yet</div>}
        {accounts.map((a) => (
          <div className="aos-row" key={a.id}>
            <div><div className="aos-row-label">{a.name}</div><div className="aos-row-meta">{a.provider} · {a.type}{a.rate ? ` · ${a.rate}% AER` : ""}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="aos-row-value">{fmtGBP(a.balance)}</div>
              <Trash2 size={15} className="aos-delete" onClick={() => remove(a.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Other top-level tabs ------------------------- */

function AdminTab({ data, update }) {
  const [form, setForm] = useState({ title: "", date: "", category: "General" });
  const addDeadline = () => { if (!form.title || !form.date) return; update(["admin", "deadlines"], [...data.admin.deadlines, { id: uid(), ...form }]); setForm({ title: "", date: "", category: "General" }); };
  const removeDeadline = (id) => update(["admin", "deadlines"], data.admin.deadlines.filter((d) => d.id !== id));
  const sorted = [...data.admin.deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = new Date();

  return (
    <div>
      <div className="aos-section-title">Life Admin</div>
      <div className="aos-section-sub">Renewals, deadlines, and the dates you can't afford to miss.</div>
      <div className="aos-card">
        <div className="aos-eyebrow">Add a Deadline</div>
        <div className="aos-form-row">
          <input className="aos-input" placeholder="e.g. Passport renewal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="aos-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className="aos-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>General</option><option>Insurance</option><option>Contracts</option><option>Documents</option><option>Finance</option></select>
          <button className="aos-btn" onClick={addDeadline}><Plus size={14} />Add</button>
        </div>
        {sorted.length === 0 && <div className="aos-empty">No deadlines tracked yet</div>}
        {sorted.map((d) => {
          const overdue = new Date(d.date) < now;
          return (
            <div className="aos-row" key={d.id}>
              <div><div className="aos-row-label">{d.title}</div><div className="aos-row-meta">{d.category}{overdue ? " · overdue" : ""}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div className="aos-row-value" style={{ color: overdue ? COLORS.red : "var(--text)" }}>{new Date(d.date).toLocaleDateString("en-GB")}</div>
                <Trash2 size={15} className="aos-delete" onClick={() => removeDeadline(d.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsSection({ data, update }) {
  const toggle = (id) => update(["documents", "items"], data.documents.items.map((d) => (d.id === id ? { ...d, stored: !d.stored } : d)));
  const updateNote = (id, note) => update(["documents", "items"], data.documents.items.map((d) => (d.id === id ? { ...d, note } : d)));
  const securedCount = data.documents.items.filter((d) => d.stored).length;
  return (
    <div>
      <div className="aos-sub" style={{ marginBottom: 14 }}>{securedCount}/{data.documents.items.length} secured.</div>
      <div className="aos-card">
        {data.documents.items.map((d) => (
          <div className="aos-checkbox-row" key={d.id}>
            <div className={"aos-checkbox" + (d.stored ? " checked" : "")} onClick={() => toggle(d.id)} />
            <div style={{ flex: 1 }}>
              <div className={"aos-checklabel" + (d.stored ? " done" : "")} onClick={() => toggle(d.id)} style={{ marginBottom: 6 }}>{d.name}</div>
              <input className="aos-input" placeholder="Where is it stored?" value={d.note} onChange={(e) => updateNote(d.id, e.target.value)} style={{ width: "100%", fontSize: 12.5, padding: "7px 11px" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmergencySection({ data, update }) {
  const [form, setForm] = useState({ name: "", relation: "", phone: "" });
  const addContact = () => { if (!form.name || !form.phone) return; update(["emergency", "contacts"], [...data.emergency.contacts, { id: uid(), ...form }]); setForm({ name: "", relation: "", phone: "" }); };
  const removeContact = (id) => update(["emergency", "contacts"], data.emergency.contacts.filter((c) => c.id !== id));

  return (
    <div>
      <div className="aos-grid cols-2" style={{ marginBottom: 18 }}>
        <div className="aos-card">
          <div className="aos-eyebrow">Medical</div>
          <div className="aos-fieldset"><label>Blood type</label><input className="aos-input" value={data.emergency.medical.bloodType} onChange={(e) => update(["emergency", "medical", "bloodType"], e.target.value)} style={{ width: "100%" }} /></div>
          <div className="aos-fieldset"><label>Allergies</label><input className="aos-input" value={data.emergency.medical.allergies} onChange={(e) => update(["emergency", "medical", "allergies"], e.target.value)} style={{ width: "100%" }} /></div>
          <div className="aos-fieldset" style={{ marginBottom: 0 }}><label>Conditions</label><input className="aos-input" value={data.emergency.medical.conditions} onChange={(e) => update(["emergency", "medical", "conditions"], e.target.value)} style={{ width: "100%" }} /></div>
        </div>
        <div className="aos-card">
          <div className="aos-eyebrow">Insurance</div>
          <div className="aos-fieldset"><label>Provider</label><input className="aos-input" value={data.emergency.insurance.provider} onChange={(e) => update(["emergency", "insurance", "provider"], e.target.value)} style={{ width: "100%" }} /></div>
          <div className="aos-fieldset" style={{ marginBottom: 0 }}><label>Policy number</label><input className="aos-input" value={data.emergency.insurance.policyNumber} onChange={(e) => update(["emergency", "insurance", "policyNumber"], e.target.value)} style={{ width: "100%" }} /></div>
        </div>
      </div>
      <div className="aos-card">
        <div className="aos-eyebrow">Emergency Contacts</div>
        <div className="aos-form-row">
          <input className="aos-input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="aos-input" placeholder="Relation" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
          <input className="aos-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="aos-btn" onClick={addContact}><Plus size={14} />Add</button>
        </div>
        {data.emergency.contacts.length === 0 && <div className="aos-empty">No emergency contacts added yet</div>}
        {data.emergency.contacts.map((c) => (
          <div className="aos-row" key={c.id}>
            <div><div className="aos-row-label">{c.name}</div><div className="aos-row-meta">{c.relation}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="aos-row-value">{c.phone}</div>
              <Trash2 size={15} className="aos-delete" onClick={() => removeContact(c.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySetup({ onSetup }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !pw) { setErr("Please fill in both fields."); return; }
    if (pw.length < 4) { setErr("Password should be at least 4 characters."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setBusy(true);
    await onSetup(email.trim(), pw);
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 380, margin: "50px auto" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div className="vault-icon-lg" style={{ background: hexToRgba(COLORS.violet, 0.16) }}><Lock size={22} color={COLORS.violet} /></div>
        <div className="aos-section-title" style={{ marginBottom: 6 }}>Protect this section</div>
        <div className="aos-section-sub" style={{ marginBottom: 0 }}>Set a password to secure your documents and emergency info. You'll need this every time you open this section.</div>
      </div>
      <div className="aos-card">
        <div className="aos-fieldset"><label>Email — used if you forget your password</label><input className="aos-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} /></div>
        <div className="aos-fieldset"><label>Password</label><input className="aos-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: "100%" }} /></div>
        <div className="aos-fieldset" style={{ marginBottom: err ? 10 : 0 }}><label>Confirm password</label><input className="aos-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: "100%" }} /></div>
        {err && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <button className="aos-btn" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={submit} disabled={busy}>{busy ? "Setting up…" : "Set password"}</button>
      </div>
    </div>
  );
}

function LockScreen({ value, setValue, error, onSubmit, onForgot }) {
  return (
    <div style={{ maxWidth: 340, margin: "70px auto", textAlign: "center" }}>
      <div className="vault-icon-lg" style={{ background: hexToRgba(COLORS.violet, 0.16) }}><Lock size={22} color={COLORS.violet} /></div>
      <div className="aos-section-title" style={{ marginBottom: 6 }}>Locked</div>
      <div className="aos-section-sub">Enter your password to view your documents and emergency info.</div>
      <div className="aos-card" style={{ textAlign: "left" }}>
        <input className="aos-input" type="password" placeholder="Password" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()} style={{ width: "100%", marginBottom: 10 }} />
        {error && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
        <button className="aos-btn" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={onSubmit}>Unlock</button>
        <button className="aos-btn-text" style={{ display: "block", margin: "0 auto" }} onClick={onForgot}>Forgot password?</button>
      </div>
    </div>
  );
}

function ForgotEmailStep({ registeredEmail, value, setValue, onBack, onVerified }) {
  const [err, setErr] = useState("");
  const submit = () => {
    if (value.trim() !== "" && value.trim().toLowerCase() === registeredEmail.trim().toLowerCase()) { setErr(""); onVerified(); }
    else setErr("That email doesn't match what we have on file.");
  };
  return (
    <div style={{ maxWidth: 380, margin: "60px auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="vault-icon-lg" style={{ background: hexToRgba(COLORS.blue, 0.16) }}><Mail size={22} color={COLORS.blue} /></div>
        <div className="aos-section-title" style={{ marginBottom: 6 }}>Reset your password</div>
        <div className="aos-section-sub">This app runs fully offline, so there's no mail server to send a reset link — confirming your registered email here lets you set a new password directly.</div>
      </div>
      <div className="aos-card">
        <div className="aos-fieldset" style={{ marginBottom: err ? 10 : 14 }}>
          <label>Your registered email</label>
          <input className="aos-input" type="email" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%" }} />
        </div>
        {err && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <button className="aos-btn" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }} onClick={submit}>Continue</button>
        <button className="aos-btn-text" style={{ display: "block", margin: "0 auto" }} onClick={onBack}>Back to password entry</button>
      </div>
    </div>
  );
}

function ResetPasswordStep({ onReset }) {
  const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < 4) { setErr("Password should be at least 4 characters."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setBusy(true);
    await onReset(pw);
    setBusy(false);
  };
  return (
    <div style={{ maxWidth: 380, margin: "60px auto" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="vault-icon-lg" style={{ background: hexToRgba(COLORS.green, 0.16) }}><Lock size={22} color={COLORS.green} /></div>
        <div className="aos-section-title" style={{ marginBottom: 6 }}>Set a new password</div>
      </div>
      <div className="aos-card">
        <div className="aos-fieldset"><label>New password</label><input className="aos-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: "100%" }} /></div>
        <div className="aos-fieldset" style={{ marginBottom: err ? 10 : 14 }}><label>Confirm new password</label><input className="aos-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: "100%" }} /></div>
        {err && <div style={{ color: COLORS.red, fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <button className="aos-btn" style={{ width: "100%", justifyContent: "center" }} onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
      </div>
    </div>
  );
}

function VaultTab({ data, update }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState("lock");
  const [sub, setSub] = useState("documents");
  const [pwInput, setPwInput] = useState("");
  const [error, setError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const security = data.security;

  if (!security.passwordSet) {
    return (
      <SecuritySetup
        onSetup={async (email, pw) => {
          const hash = await hashPassword(pw);
          update(["security"], { passwordSet: true, passwordHash: hash, email });
          setUnlocked(true);
        }}
      />
    );
  }

  if (!unlocked) {
    if (mode === "forgot-email") {
      return <ForgotEmailStep registeredEmail={security.email} value={forgotEmail} setValue={setForgotEmail} onBack={() => setMode("lock")} onVerified={() => setMode("forgot-reset")} />;
    }
    if (mode === "forgot-reset") {
      return (
        <ResetPasswordStep
          onReset={async (pw) => {
            const hash = await hashPassword(pw);
            update(["security", "passwordHash"], hash);
            setUnlocked(true);
            setMode("lock");
          }}
        />
      );
    }
    return (
      <LockScreen
        value={pwInput} setValue={setPwInput} error={error}
        onForgot={() => { setMode("forgot-email"); setError(""); }}
        onSubmit={async () => {
          const hash = await hashPassword(pwInput);
          if (hash === security.passwordHash) { setUnlocked(true); setError(""); setPwInput(""); }
          else setError("Incorrect password.");
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="aos-section-title">Documents & Emergency</div>
          <div className="aos-section-sub">Your most sensitive information, locked behind your password.</div>
        </div>
        <button className="aos-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 7 }} onClick={() => setUnlocked(false)}><Lock size={13} />Lock</button>
      </div>
      <SubNav tabs={[{ key: "documents", label: "Documents" }, { key: "emergency", label: "Emergency" }]} active={sub} onChange={setSub} />
      {sub === "documents" && <DocumentsSection data={data} update={update} />}
      {sub === "emergency" && <EmergencySection data={data} update={update} />}
    </div>
  );
}

function LifeScoreTab({ factors, totalScore, selectedFactor, setSelectedFactor }) {
  const animScore = useCountUp(totalScore);
  const radius = 210, center = 270;
  const active = factors.find((f) => f.key === selectedFactor) || null;

  return (
    <div className="ls-wrap">
      <div className="aos-section-title" style={{ alignSelf: "flex-start" }}>Life Score</div>
      <div className="aos-section-sub" style={{ alignSelf: "flex-start" }}>Built from your real numbers — savings, debt, spending, admin, and protection.</div>
      <div className="ls-orbit-wrap">
        <div className="ls-orbit">
          <div className="ls-orbit-ring" />
          <div className="ls-center"><div className="ls-center-num">{Math.round(animScore)}</div><div className="ls-center-label">{scoreVerdict(totalScore)}</div></div>
          {factors.map((f, i) => {
            const angle = (i / factors.length) * 2 * Math.PI - Math.PI / 2;
            const x = center + radius * Math.cos(angle), y = center + radius * Math.sin(angle);
            const Icon = f.icon;
            return (
              <div key={f.key} className="ls-sat-pos" style={{ left: x, top: y }} onClick={() => setSelectedFactor(f.key)}>
                <div className={"ls-sat" + (selectedFactor === f.key ? " selected" : "")} style={{ "--sat-color": f.color }}>
                  <div className="ls-sat-icon" style={{ background: hexToRgba(f.color, 0.16) }}><Icon size={15} color={f.color} /></div>
                  <div className="ls-sat-label">{f.label}</div>
                  <div className="ls-sat-val" style={{ color: f.color }}>{f.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ls-list-wrap">
        {factors.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="ls-factor-list-row" onClick={() => setSelectedFactor(f.key)}>
              <div className="ls-sat-icon" style={{ background: hexToRgba(f.color, 0.16) }}><Icon size={15} color={f.color} /></div>
              <div style={{ flex: 1 }}><div className="aos-row-label">{f.label}</div></div>
              <div style={{ fontWeight: 800, color: f.color }}>{f.value}</div>
            </div>
          );
        })}
      </div>
      <div className="ls-detail">
        {active ? (
          <div className="aos-card">
            <div className="ls-detail-head">
              <div className="ls-sat-icon" style={{ background: hexToRgba(active.color, 0.16), width: 38, height: 38 }}><active.icon size={18} color={active.color} /></div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{active.label} — {active.value}/100</div>
            </div>
            <div className="aos-sub" style={{ fontSize: 13.5 }}>{active.detail}</div>
          </div>
        ) : <div className="aos-card" style={{ textAlign: "center" }}><div className="aos-sub">Tap a metric to see exactly why it scored the way it did.</div></div>}
      </div>
    </div>
  );
}

function SettingsTab({ data, update, setData }) {
  const fileRef = useRef(null);

  const manageBilling = async () => {
    const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "adulting-os-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { setData(JSON.parse(ev.target.result)); } catch { alert("That file couldn't be read."); } };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="aos-section-title">Settings</div>
      <div className="aos-section-sub">Your profile, appearance, and data ownership.</div>
      <div className="aos-card" style={{ marginBottom: 16 }}>
        <div className="aos-eyebrow">Appearance</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="aos-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 7, borderColor: data.profile.theme === "dark" ? COLORS.primary : undefined }} onClick={() => update(["profile", "theme"], "dark")}><Moon size={14} />Dark</button>
          <button className="aos-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 7, borderColor: data.profile.theme === "light" ? COLORS.primary : undefined }} onClick={() => update(["profile", "theme"], "light")}><Sun size={14} />Light</button>
        </div>
      </div>
      <div className="aos-card" style={{ marginBottom: 16 }}>
        <div className="aos-eyebrow">Profile</div>
        <div className="aos-fieldset"><label>Name</label><input className="aos-input" value={data.profile.name} onChange={(e) => update(["profile", "name"], e.target.value)} style={{ width: "100%" }} /></div>
        <div className="aos-fieldset" style={{ marginBottom: 0 }}><label>Monthly income (£) — shared with Paycheck Planning and your Life Score</label><input className="aos-input" type="number" value={data.finances.income.monthly} onChange={(e) => update(["finances", "income", "monthly"], Number(e.target.value))} style={{ width: 160 }} /></div>
      </div>
      <div className="aos-card" style={{ marginBottom: 16 }}>
        <div className="aos-eyebrow">Your Data</div>
        <div className="aos-sub" style={{ marginBottom: 16 }}>Everything stays on this device. Export a backup before switching browsers or computers.</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="aos-btn" onClick={exportData}>Export backup</button>
          <button className="aos-btn-ghost" onClick={() => fileRef.current.click()}>Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importData} />
        </div>
      </div>
      <div className="aos-card">
        <div className="aos-eyebrow">Subscription</div>
        <div className="aos-sub" style={{ marginBottom: 16 }}>Manage your plan, payment method, or cancel anytime.</div>
        <button className="aos-btn-ghost" onClick={manageBilling}>Manage subscription</button>
      </div>
    </div>
  );
}
function DiagnosticOverlay({ totalScore, diagnostic, step, setStep, onClose }) {
  const steps = ["score", "leaks", "risks", "balance", "advice"];
  const animScore = useCountUp(totalScore, 1100);
  const last = step === steps.length - 1;

  return (
    <div className="diag-overlay">
      <button className="diag-close" onClick={onClose}><X size={17} /></button>
      <div key={step} className="diag-body aos-page slide-right">
        {steps[step] === "score" && (
          <>
            <div className="diag-eyebrow"><Sparkles size={13} /> Your Diagnostic</div>
            <div className="diag-title">Your Life Score</div>
            <div className="diag-sub">Calculated from your real savings, debt, spending, admin and protection — not a quiz.</div>
            <ScoreRing pct={animScore} size={160} stroke={11} />
            <div style={{ fontSize: 44, fontWeight: 800, marginTop: 18 }}>{Math.round(animScore)}<span style={{ color: "var(--text-muted)", fontSize: 20 }}>/100</span></div>
            <div className="aos-sub" style={{ marginTop: 6 }}>{scoreVerdict(totalScore)}</div>
          </>
        )}
        {steps[step] === "leaks" && (
          <>
            <div className="diag-eyebrow"><Repeat size={13} /> Money Leak Detection</div>
            <div className="diag-title">{diagnostic.leaks.length > 0 ? `${diagnostic.leaks.length} likely leak${diagnostic.leaks.length > 1 ? "s" : ""} found` : "No major leaks flagged"}</div>
            <div className="diag-sub">You're spending {fmtGBP(diagnostic.subsMonthly)}/mo on subscriptions{diagnostic.leaksAnnual > 0 ? ` — you could save ${fmtGBP(diagnostic.leaksAnnual)}/yr by cancelling these.` : "."}</div>
            <div style={{ width: "100%" }}>
              {diagnostic.leaks.length === 0 && <div className="aos-empty" style={{ textAlign: "center" }}>Add your subscriptions in Finances to detect leaks.</div>}
              {diagnostic.leaks.map((l) => (
                <div className="diag-list-item" key={l.id}>
                  <AlertTriangle size={16} color={COLORS.amber} style={{ marginTop: 1 }} />
                  <div style={{ flex: 1 }}><div className="aos-row-label">{l.name}<span className="aos-tag-leak">Potential leak</span></div></div>
                  <div className="aos-row-value">{fmtGBP(monthlyAmount(l))}/mo</div>
                </div>
              ))}
            </div>
          </>
        )}
        {steps[step] === "risks" && (
          <>
            <div className="diag-eyebrow"><AlertTriangle size={13} /> Risk Report</div>
            <div className="diag-title">What needs your attention</div>
            <div className="diag-sub">Real exposures based on what's currently — and not currently — in your system.</div>
            <div style={{ width: "100%" }}>
              {diagnostic.risks.map((r, i) => (
                <div className="diag-list-item" key={i}>
                  {r.startsWith("No major risks") ? <CheckCircle2 size={16} color={COLORS.green} style={{ marginTop: 1 }} /> : <AlertTriangle size={16} color={COLORS.red} style={{ marginTop: 1 }} />}
                  <div className="aos-row-label" style={{ fontWeight: 500 }}>{r}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {steps[step] === "balance" && (
          <>
            <div className="diag-eyebrow"><Gauge size={13} /> Strengths & Weaknesses</div>
            <div className="diag-title">Where you stand</div>
            <div className="diag-sub">The two pillars carrying you, and the two holding you back.</div>
            <div className="diag-strength-cols">
              <div className="diag-strength-col">
                <div className="diag-strength-head" style={{ color: COLORS.green }}>Strengths</div>
                {diagnostic.strengths.map((f) => (
                  <div className="ls-factor-list-row" key={f.key} style={{ cursor: "default" }}>
                    <div className="ls-sat-icon" style={{ background: hexToRgba(f.color, 0.16) }}><f.icon size={15} color={f.color} /></div>
                    <div className="aos-row-label" style={{ flex: 1 }}>{f.label}</div>
                    <div style={{ fontWeight: 800, color: f.color }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="diag-strength-col">
                <div className="diag-strength-head" style={{ color: COLORS.red }}>Weaknesses</div>
                {diagnostic.weaknesses.map((f) => (
                  <div className="ls-factor-list-row" key={f.key} style={{ cursor: "default" }}>
                    <div className="ls-sat-icon" style={{ background: hexToRgba(f.color, 0.16) }}><f.icon size={15} color={f.color} /></div>
                    <div className="aos-row-label" style={{ flex: 1 }}>{f.label}</div>
                    <div style={{ fontWeight: 800, color: f.color }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {steps[step] === "advice" && (
          <>
            <div className="diag-eyebrow"><CheckCircle2 size={13} /> Your Plan</div>
            <div className="diag-title">3 critical moves, in order</div>
            <div className="diag-sub">Do these before anything else — they move your score the most.</div>
            <div style={{ width: "100%" }}>
              {diagnostic.advice.map((a, i) => (
                <div className="diag-advice-item" key={i}><div className="diag-advice-num">{i + 1}</div><div className="aos-row-label" style={{ fontWeight: 500, lineHeight: 1.5 }}>{a}</div></div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="diag-footer">
        <button className="aos-btn-ghost" style={{ visibility: step === 0 ? "hidden" : "visible", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setStep((s) => s - 1)}><ChevronLeft size={14} />Back</button>
        <div className="diag-dots">{steps.map((_, i) => <div key={i} className={"diag-dot" + (i === step ? " active" : "")} />)}</div>
        {!last ? <button className="aos-btn" onClick={() => setStep((s) => s + 1)}>Next<ChevronRight size={14} /></button> : <button className="aos-btn" onClick={onClose}>Go to my dashboard<ArrowRight size={14} /></button>}
      </div>
    </div>
  );
}
