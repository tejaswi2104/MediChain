import React, { useState, useEffect } from "react";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Stepper from "@/components/medichain/Stepper";
import RequestForm from "@/components/medichain/doctor/RequestForm";
import WaitingConsent from "@/components/medichain/doctor/WaitingConsent";
import DecisionView from "@/components/medichain/doctor/DecisionView";
import { getConsentStatus } from "@/api/medichain";

const STEPS = ["Search patient", "Patient consent", "Decision view"];
const KEY = "medichain_doctor_consent";
const END_MESSAGES = {
  Denied: "The patient denied this consent request.",
  Revoked: "The patient revoked this consent.",
  Expired: "This consent has expired.",
};

export default function DoctorDashboard() {
  const [consentId, setConsentId] = useState(() => sessionStorage.getItem(KEY) || null);
  const [status, setStatus] = useState(null);
  const [endedMessage, setEndedMessage] = useState("");

  const handleCreated = (id) => {
    sessionStorage.setItem(KEY, String(id));
    setConsentId(id);
    setStatus(null);
    setEndedMessage("");
  };

  const clear = () => {
    sessionStorage.removeItem(KEY);
    setConsentId(null);
    setStatus(null);
    setEndedMessage("");
  };

  // Live poll of the consent status (never patient data).
  useEffect(() => {
    if (!consentId) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await getConsentStatus({ consent_id: consentId });
        if (!alive) return;
        if (!res.success) {
          setEndedMessage(res.message);
          return;
        }
        setStatus(res.data);
        if (END_MESSAGES[res.data.status]) setEndedMessage(END_MESSAGES[res.data.status]);
      } catch (e) {
        /* transient network issue; keep polling */
      }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [consentId]);

  const currentStep = !consentId ? 0 : endedMessage ? 2 : status && status.status === "Approved" ? 2 : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-[#0B2545]">Doctor dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Request consent, then see a unified, time-bound decision view.
        </p>
      </div>
      <Stepper steps={STEPS} current={currentStep} />

      {!consentId && <RequestForm onCreated={handleCreated} />}

      {consentId && !endedMessage && !status && (
        <div className="mc-card flex items-center justify-center gap-3 py-10">
          <span className="w-5 h-5 border-4 border-slate-200 border-t-[#13A89E] rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading request…</span>
        </div>
      )}

      {consentId && !endedMessage && status && status.status !== "Approved" && (
        <WaitingConsent status={status} onCancel={clear} />
      )}

      {consentId && !endedMessage && status && status.status === "Approved" && (
        <DecisionView consentId={consentId} onEnded={setEndedMessage} />
      )}

      {endedMessage && (
        <div className="mc-card text-center py-12 max-w-xl">
          <ShieldX className="w-10 h-10 mx-auto text-[#D62839]" />
          <h2 className="font-heading font-extrabold text-xl mt-4">Access ended</h2>
          <p className="text-sm text-slate-500 mt-2">{endedMessage}</p>
          <Button className="mt-5 bg-[#13A89E] hover:bg-teal-700" onClick={clear}>
            New request
          </Button>
        </div>
      )}
    </div>
  );
}