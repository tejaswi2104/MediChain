import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { seedDemoData } from "@/api/medichain";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/doctor", label: "Doctor" },
  { to: "/consent", label: "Consent" },
  { to: "/patient", label: "Records" },
];

export default function McLayout() {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);

  const resetDemo = async () => {
    setResetting(true);
    try {
      const res = await seedDemoData({ reset: true });
      if (res.success) {
        toast({ title: "Demo data reset", description: "ABHA-123 and ABHA-456 are back to their original state." });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setResetting(false);
        toast({ title: "Could not reset demo data", description: res.message, variant: "destructive" });
      }
    } catch (e) {
      setResetting(false);
      toast({ title: "Could not reset demo data", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FB]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#0B2545] text-white flex items-center justify-center font-heading font-extrabold text-lg">
              M
            </span>
            <span>
              <span className="block font-heading font-extrabold text-[#0B2545] leading-tight">MediChain</span>
              <span className="block text-[11px] text-slate-500">Consent-based clinical decision support</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 ml-2 sm:ml-6">
            {NAV.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                    active ? "bg-[#EEF4F9] text-[#0B2545]" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="mc-badge mc-badge-success hidden sm:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AI summary ready
            </span>
            <Button size="sm" variant="outline" onClick={resetDemo} disabled={resetting} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              {resetting ? "Resetting…" : "Reset demo"}
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-slate-400">
        Prototype with synthetic data. Not a substitute for medical advice or emergency services.
        <br />
        Elite Horizon · IBM Z Datathon 2026
      </footer>
    </div>
  );
}