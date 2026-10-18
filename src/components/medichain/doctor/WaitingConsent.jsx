import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function WaitingConsent({ status, onCancel }) {
  const firstName = status?.patient_first_name;
  return (
    <div className="mc-card max-w-xl text-center py-10">
      <Loader2 className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
      <h2 className="font-heading font-extrabold text-xl mt-4">Waiting for patient approval</h2>
      <p className="text-sm text-slate-500 mt-1">
        {firstName ? `${firstName}` : "The patient"} can approve the request on the Consent page.
      </p>
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="mc-badge mc-badge-warn">Pending</span>
        {status?.is_emergency && <span className="mc-badge mc-badge-danger">🚨 Emergency</span>}
      </div>
      <p className="text-xs text-slate-400 mt-4">This screen refreshes automatically every few seconds.</p>
      <Button variant="outline" className="mt-4" onClick={onCancel}>
        Cancel request
      </Button>
    </div>
  );
}