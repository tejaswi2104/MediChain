import React from "react";
import { cn } from "@/lib/utils";

export const TYPE_BADGES = {
  Consultation: "bg-blue-100 text-blue-800",
  Prescription: "bg-violet-100 text-violet-800",
  "Lab Report": "bg-teal-100 text-teal-800",
  Vaccination: "bg-emerald-100 text-emerald-800",
  "Discharge Summary": "bg-indigo-100 text-indigo-800",
  "Diagnostic Report": "bg-amber-100 text-amber-900",
};

export default function Timeline({ records }) {
  if (!records || records.length === 0) {
    return <div className="mc-card-plain text-sm text-slate-500">No records to show yet.</div>;
  }
  return (
    <div className="mc-timeline">
      {records.map((r) => (
        <div key={r.id} className="mc-timeline-item">
          <span
            className={cn(
              "mc-timeline-dot",
              (r.is_critical || r.is_abnormal) && "mc-timeline-dot-critical"
            )}
          />
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{r.record_date}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold",
                  TYPE_BADGES[r.record_type] || "bg-slate-100 text-slate-700"
                )}
              >
                {r.record_type}
              </span>
              {r.is_critical && <span className="mc-badge mc-badge-danger">Critical</span>}
              {r.is_abnormal && <span className="mc-badge mc-badge-warn">Abnormal</span>}
            </div>
            <p className="mt-2 font-heading font-bold text-[#0B2545]">{r.title}</p>
            {r.details && <p className="mt-1 text-sm text-slate-600">{r.details}</p>}
            {r.provider_name && <p className="mt-1 text-xs text-slate-400">Provider: {r.provider_name}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}