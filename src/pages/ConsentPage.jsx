import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import PatientSelector, { getSelectedPatient } from "@/components/medichain/PatientSelector";
import Countdown from "@/components/medichain/Countdown";
import { base44 } from "@/api/base44Client";
import { getConsentOverview, consentDecision } from "@/api/medichain";
import { formatDateTime } from "@/lib/medichain";

const DURATIONS = [
  { value: "1", label: "1 minute (demo)" },
  { value: "30", label: "30 minutes" },
  { value: "1440", label: "24 hours" },
  { value: "10080", label: "7 days" },
];

const STATUS_BADGES = {
  Pending: "mc-badge-warn",
  Approved: "mc-badge-success",
  Denied: "mc-badge-danger",
  Revoked: "mc-badge-danger",
  Expired: "mc-badge-warn",
};

export default function ConsentPage() {
  const [abhaId, setAbhaId] = useState(getSelectedPatient());
  const [overview, setOverview] = useState(null);
  const [patient, setPatient] = useState(null);
  const [durations, setDurations] = useState({});
  const [busyId, setBusyId] = useState(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!abhaId) {
      setOverview(null);
      return;
    }
    try {
      const res = await getConsentOverview({ abha_id: abhaId });
      if (res.success) setOverview(res.data);
    } catch (e) {
      /* keep polling */
    }
  }, [abhaId]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    setPatient(null);
    if (!abhaId) return;
    let alive = true;
    base44.entities.Patient.filter({ abha_id: abhaId }, { limit: 1 })
      .then((p) => {
        if (alive) setPatient((p.items || [])[0] || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [abhaId]);

  const act = async (consent, action) => {
    setBusyId(consent.id);
    try {
      const res = await consentDecision({
        consent_id: consent.id,
        action,
        duration_minutes: action === "approve" ? parseInt(durations[consent.id] || "1", 10) : undefined,
        approved_by: consent.is_emergency ? "emergency_contact" : "patient",
      });
      if (res.success) {
        toast({
          title: action === "approve" ? "Consent approved" : action === "deny" ? "Request denied" : "Access revoked",
        });
      } else {
        toast({ title: "Action failed", description: res.message, variant: "destructive" });
      }
      refresh();
    } catch (e) {
      toast({ title: "Action failed", description: "Please try again.", variant: "destructive" });
    }
    setBusyId(null);
  };

  const pending = overview?.pending || [];
  const active = overview?.active || [];
  const history = overview?.history || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-[#0B2545]">Consent requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Approve, deny or revoke a doctor's access. This page refreshes automatically.
        </p>
      </div>

      <PatientSelector onChange={setAbhaId} />

      {!abhaId ? (
        <div className="mc-card-plain text-sm text-slate-500">
          Select a patient above to see their consent requests. Tip: use ABHA-123 for the demo flow.
        </div>
      ) : (
        <div>
          {patient && (
            <div className="mc-card mb-4">
              <p className="font-heading font-bold">
                {patient.name}
                <span className="text-slate-400 font-normal text-sm ml-2">{patient.abha_id}</span>
              </p>
              {patient.emergency_contact_name && (
                <p className="text-xs text-slate-500 mt-1">
                  Nominated emergency contact: {patient.emergency_contact_name} ({patient.emergency_contact_phone})
                </p>
              )}
            </div>
          )}

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="active">Active access ({active.length})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {pending.length === 0 && (
                <div className="mc-alert-ok text-sm font-semibold">🎉 No pending requests right now.</div>
              )}
              {pending.map((c) => (
                <div
                  key={c.id}
                  className={`mc-card mt-3 ${c.is_emergency ? "border-[#F3B6BC] bg-[#FFF8F8]" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-bold">{c.doctor_name}</p>
                      <p className="text-sm text-slate-500">
                        {c.purpose} · requested {formatDateTime(c.requested_at)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`mc-badge ${c.is_emergency ? "mc-badge-danger" : ""}`}>
                          {c.scope} scope
                        </span>
                        {c.is_emergency && <span className="mc-badge mc-badge-danger">🚨 Emergency</span>}
                      </div>
                      {c.is_emergency && patient?.emergency_contact_name && (
                        <p className="text-xs text-[#A01526] font-semibold mt-2">
                          Approve as nominated emergency contact: {patient.emergency_contact_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Select
                        value={durations[c.id] || "1"}
                        onValueChange={(v) => setDurations({ ...durations, [c.id]: v })}
                      >
                        <SelectTrigger className="w-[170px]">
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => act(c, "deny")} disabled={busyId === c.id}>
                          Deny
                        </Button>
                        <Button size="sm" onClick={() => act(c, "approve")} disabled={busyId === c.id} className="bg-[#13A89E] hover:bg-teal-700">
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="active" className="mt-4">
              {active.length === 0 && (
                <div className="mc-alert-ok text-sm font-semibold">✅ No doctor currently has access.</div>
              )}
              {active.map((c) => (
                <div key={c.id} className="mc-card mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-heading font-bold">{c.doctor_name}</p>
                      <p className="text-sm text-slate-500">
                        {c.purpose} · {c.scope} scope · approved {formatDateTime(c.approved_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Time remaining</p>
                        <p className="font-heading font-extrabold text-xl text-[#D62839]">
                          <Countdown expiresAt={c.expires_at} />
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => act(c, "revoke")} disabled={busyId === c.id}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="mc-card p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-400 py-6">
                          No consent history yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {history.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">{formatDateTime(c.requested_at)}</TableCell>
                        <TableCell className="font-medium">{c.doctor_name}</TableCell>
                        <TableCell>{c.purpose}</TableCell>
                        <TableCell>{c.scope}</TableCell>
                        <TableCell>
                          <span className={`mc-badge ${STATUS_BADGES[c.status] || ""}`}>{c.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}