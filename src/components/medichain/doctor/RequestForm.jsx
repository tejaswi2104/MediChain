import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createConsentRequest } from "@/api/medichain";

const PURPOSES = ["Emergency care", "Diagnosis review", "Treatment planning", "Medication review", "Second opinion"];
const DURATIONS = [
  { value: "1", label: "1 minute (demo)" },
  { value: "30", label: "30 minutes" },
  { value: "1440", label: "24 hours" },
];

export default function RequestForm({ onCreated }) {
  const [abhaId, setAbhaId] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. Meera Iyer");
  const [purpose, setPurpose] = useState("Emergency care");
  const [duration, setDuration] = useState("1");
  const [emergency, setEmergency] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await createConsentRequest({
        abha_id: abhaId,
        doctor_name: doctorName,
        purpose,
        duration_minutes: parseInt(duration, 10),
        is_emergency: emergency,
        scope: emergency ? "emergency" : "full",
      });
      setBusy(false);
      if (!res.success) {
        setError(res.message);
        return;
      }
      onCreated(res.data.consent_id);
    } catch (err) {
      setBusy(false);
      setError("Could not send the request. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} className="mc-card max-w-xl">
      <h2 className="font-heading font-extrabold text-lg">Search patient</h2>
      <p className="text-sm text-slate-500 mt-1">
        Enter the patient's ABHA ID and request time-bound consent.
      </p>

      <div className="space-y-4 mt-5">
        <div>
          <Label htmlFor="mc-abha">Patient ABHA ID</Label>
          <Input
            id="mc-abha"
            value={abhaId}
            onChange={(e) => setAbhaId(e.target.value.toUpperCase())}
            placeholder="ABHA-123"
            className="mt-1 uppercase"
          />
        </div>
        <div>
          <Label htmlFor="mc-doctor">Doctor name</Label>
          <Input id="mc-doctor" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="mt-1" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Access duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
          <Switch id="mc-emergency" checked={emergency} onCheckedChange={setEmergency} />
          <div>
            <Label htmlFor="mc-emergency" className="cursor-pointer">
              Emergency mode (patient unconscious)
            </Label>
            <p className="text-xs text-slate-500 mt-0.5">
              Only critical information will be shared, and contact details stay hidden.
            </p>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-[#D62839]">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-[#13A89E] hover:bg-teal-700">
          {busy ? "Sending request…" : "Request consent"}
        </Button>
      </div>
    </form>
  );
}