import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

const ROLES = [
  {
    to: "/doctor",
    icon: "🩺",
    title: "Doctor",
    text: "Search a patient by ABHA ID, request time-bound consent and open the decision view with critical alerts and an AI summary.",
    cta: "Open doctor view",
  },
  {
    to: "/consent",
    icon: "✅",
    title: "Patient consent",
    text: "Review every consent request, approve or deny with a duration you choose, and revoke access at any moment.",
    cta: "Review requests",
  },
  {
    to: "/patient",
    icon: "📋",
    title: "Patient records",
    text: "Browse the unified timeline, review the full access log, create a new profile or add records as a provider.",
    cta: "Open records",
  },
];

const FLOW = [
  "The doctor opens the Doctor view, enters ABHA-123 and turns on Emergency mode.",
  "The patient opens the Consent page and approves the request (pick the 1-minute demo duration).",
  "The doctor instantly sees critical alerts, an AI summary and a live access countdown.",
  "At 00:00 access ends by itself — and every step is captured in the audit log.",
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="mc-hero">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1">
          🩺 Elite Horizon · IBM Z Datathon 2026
        </span>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl mt-4 leading-tight">
          The right record, at the right moment — with consent.
        </h1>
        <p className="mt-3 max-w-2xl text-white/80">
          MediChain unifies records scattered across clinics, labs and pharmacies into one timeline for
          authorized doctors — but only after valid, time-bound patient consent.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {ROLES.map((r) => (
          <Link key={r.to} to={r.to} className="mc-card block hover:shadow-lg transition-shadow group">
            <span className="text-3xl">{r.icon}</span>
            <h3 className="font-heading font-extrabold text-lg mt-3">{r.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{r.text}</p>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 mt-3">
              {r.cta}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="mc-card">
          <h3 className="font-heading font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            2-minute demo flow
          </h3>
          <ol className="space-y-3 mt-3">
            {FLOW.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="mc-step-dot mc-step-dot-active">{i + 1}</span>
                <span>{f}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mc-card flex gap-3 items-start border-teal-200">
          <ShieldCheck className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-heading font-bold">AI with limits</h3>
            <p className="text-sm text-slate-600 mt-1">
              The AI summary only organizes and highlights existing records. It never diagnoses, never
              prescribes and never suggests doses. All demo data is synthetic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}