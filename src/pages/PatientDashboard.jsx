import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import PatientSelector, { getSelectedPatient, setSelectedPatient } from "@/components/medichain/PatientSelector";
import Timeline from "@/components/medichain/Timeline";
import Chip from "@/components/medichain/Chip";
import Card from "@/components/medichain/Card";
import { splitList, isValidAbhaId, normalizeAbhaId, formatDateTime } from "@/lib/medichain";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RECORD_TYPES = ["Consultation", "Prescription", "Lab Report", "Vaccination", "Discharge Summary", "Diagnostic Report"];

const ACTION_BADGES = {
  REQUESTED: "",
  APPROVED: "mc-badge-success",
  DENIED: "mc-badge-danger",
  REVOKED: "mc-badge-danger",
  EXPIRED: "mc-badge-warn",
  DATA_ACCESSED: "mc-badge-primary",
};

const EMPTY_PATIENT = {
  abha_id: "",
  name: "",
  age: "",
  gender: "Female",
  blood_group: "O+",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  allergies: "",
  chronic_conditions: "",
  current_medicines: "",
};

export default function PatientDashboard() {
  const [abhaId, setAbhaId] = useState(getSelectedPatient());
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [audit, setAudit] = useState([]);
  const [notFound, setNotFound] = useState(false);

  const [np, setNp] = useState(EMPTY_PATIENT);
  const [npError, setNpError] = useState("");
  const [npBusy, setNpBusy] = useState(false);

  const [rec, setRec] = useState({
    record_date: new Date().toISOString().slice(0, 10),
    record_type: "Consultation",
    title: "",
    details: "",
    provider_name: "",
    is_critical: false,
    is_abnormal: false,
  });
  const [recError, setRecError] = useState("");
  const [recBusy, setRecBusy] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(async (id) => {
    setPatient(null);
    setRecords([]);
    setAudit([]);
    setNotFound(false);
    if (!id) return;
    try {
      const pPage = await base44.entities.Patient.filter({ abha_id: id }, { limit: 1 });
      const p = (pPage.items || [])[0] || null;
      setPatient(p);
      setNotFound(!p);
      if (!p) return;
      const [rPage, aPage] = await Promise.all([
        base44.entities.MedicalRecord.filter({ abha_id: id }, { sort: "record_date", limit: 200 }),
        base44.entities.AuditLog.filter({ abha_id: id }, { sort: "-timestamp", limit: 100 }),
      ]);
      setRecords(rPage.items || []);
      setAudit(aPage.items || []);
    } catch (e) {
      setNotFound(true);
    }
  }, []);

  useEffect(() => {
    loadData(abhaId);
  }, [abhaId, loadData]);

  const createPatient = async (e) => {
    e.preventDefault();
    setNpError("");
    const id = normalizeAbhaId(np.abha_id);
    const age = parseInt(np.age, 10);
    if (!isValidAbhaId(id)) return setNpError("Enter a valid ABHA ID like ABHA-123.");
    if (!np.name.trim()) return setNpError("Enter the patient name.");
    if (!Number.isFinite(age) || age < 0 || age > 120) return setNpError("Age must be between 0 and 120.");
    if (!BLOOD_GROUPS.includes(np.blood_group)) return setNpError("Select a blood group.");
    setNpBusy(true);
    try {
      const dup = await base44.entities.Patient.filter({ abha_id: id }, { limit: 1, fields: ["id"] });
      if ((dup.items || []).length) {
        setNpBusy(false);
        return setNpError("A patient with this ABHA ID already exists.");
      }
      await base44.entities.Patient.create({
        abha_id: id,
        name: np.name.trim(),
        age,
        gender: np.gender,
        blood_group: np.blood_group,
        emergency_contact_name: np.emergency_contact_name.trim(),
        emergency_contact_phone: np.emergency_contact_phone.trim(),
        allergies: np.allergies.trim(),
        chronic_conditions: np.chronic_conditions.trim(),
        current_medicines: np.current_medicines.trim(),
      });
      setNpBusy(false);
      toast({ title: "Profile created", description: `${id} is ready to use.` });
      setNp(EMPTY_PATIENT);
      setSelectedPatient(id);
      setAbhaId(id);
    } catch (err) {
      setNpBusy(false);
      setNpError("Could not create the profile. Please try again.");
    }
  };

  const addRecord = async (e) => {
    e.preventDefault();
    setRecError("");
    if (!patient) return setRecError("Select a patient first.");
    if (!rec.record_date) return setRecError("Choose a record date.");
    if (!RECORD_TYPES.includes(rec.record_type)) return setRecError("Choose a record type.");
    if (!rec.title.trim()) return setRecError("Enter a title.");
    setRecBusy(true);
    try {
      await base44.entities.MedicalRecord.create({
        abha_id: patient.abha_id,
        record_date: rec.record_date,
        record_type: rec.record_type,
        title: rec.title.trim(),
        details: rec.details.trim(),
        provider_name: rec.provider_name.trim(),
        is_critical: rec.is_critical,
        is_abnormal: rec.is_abnormal,
      });
      setRecBusy(false);
      toast({ title: "Record added", description: `Added to ${patient.abha_id}.` });
      setRec({ ...rec, title: "", details: "", is_critical: false, is_abnormal: false });
      loadData(patient.abha_id);
    } catch (err) {
      setRecBusy(false);
      setRecError("Could not add the record. Please try again.");
    }
  };

  const allergies = patient ? splitList(patient.allergies) : [];
  const conditions = patient ? splitList(patient.chronic_conditions) : [];
  const medicines = patient ? splitList(patient.current_medicines) : [];
  const latestFive = [...records].sort((a, b) => String(b.record_date).localeCompare(String(a.record_date))).slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-[#0B2545]">Patient records</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your unified timeline, access log, new profiles and provider record entry.
        </p>
      </div>

      <PatientSelector onChange={setAbhaId} />

      {!abhaId ? (
        <div className="mc-card-plain text-sm text-slate-500">
          Select a patient above, or create a new profile below.
        </div>
      ) : notFound || !patient ? (
        <div className="mc-alert-warn text-sm font-semibold">
          {notFound
            ? `No patient found with this ABHA ID. Create the profile in the "New profile" tab.`
            : "Loading patient…"}
        </div>
      ) : (
        <>
          <div className="mc-card">
            <h2 className="font-heading font-extrabold text-xl">Hello, {patient.name} 👋</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <Chip>{patient.age} yrs</Chip>
              <Chip>{patient.gender}</Chip>
              <Chip>🩸 {patient.blood_group}</Chip>
              {allergies.map((a) => (
                <Chip key={a} danger>
                  ⚠️ {a}
                </Chip>
              ))}
              {conditions.map((c) => (
                <Chip key={c}>🧬 {c}</Chip>
              ))}
            </div>
          </div>

          <Tabs defaultValue="records">
            <TabsList>
              <TabsTrigger value="records">My records</TabsTrigger>
              <TabsTrigger value="access">Access log</TabsTrigger>
              <TabsTrigger value="new">New profile</TabsTrigger>
              <TabsTrigger value="provider">Provider: add record</TabsTrigger>
            </TabsList>

            <TabsContent value="records" className="mt-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card title="⚠️ Allergies">
                  {allergies.length ? (
                    <div className="flex flex-wrap gap-2">
                      {allergies.map((a) => (
                        <Chip key={a} danger>
                          {a}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">None recorded.</p>
                  )}
                </Card>
                <Card title="🧬 Chronic conditions">
                  {conditions.length ? (
                    <div className="flex flex-wrap gap-2">
                      {conditions.map((c) => (
                        <Chip key={c}>{c}</Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">None recorded.</p>
                  )}
                </Card>
                <Card title="💊 Current medicines">
                  {medicines.length ? (
                    <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                      {medicines.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">None recorded.</p>
                  )}
                </Card>
              </div>
              <Card title="📅 Full timeline">
                <Timeline records={records} />
              </Card>
            </TabsContent>

            <TabsContent value="access" className="mt-4">
              <div className="mc-card p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-slate-400 py-6">
                          No access events yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {audit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{formatDateTime(a.timestamp)}</TableCell>
                        <TableCell>
                          <span className={`mc-badge ${ACTION_BADGES[a.action] || ""}`}>{a.action}</span>
                        </TableCell>
                        <TableCell className="font-medium">{a.actor}</TableCell>
                        <TableCell className="text-sm text-slate-500">{a.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="new" className="mt-4">
              <form onSubmit={createPatient} className="mc-card max-w-2xl space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="np-abha">ABHA ID</Label>
                    <Input
                      id="np-abha"
                      value={np.abha_id}
                      onChange={(e) => setNp({ ...np, abha_id: e.target.value.toUpperCase() })}
                      placeholder="ABHA-789"
                      className="mt-1 uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="np-name">Full name</Label>
                    <Input id="np-name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="np-age">Age</Label>
                    <Input id="np-age" type="number" value={np.age} onChange={(e) => setNp({ ...np, age: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={np.gender} onValueChange={(v) => setNp({ ...np, gender: v })}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Female", "Male", "Other"].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Blood group</Label>
                    <Select value={np.blood_group} onValueChange={(v) => setNp({ ...np, blood_group: v })}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="np-ec-name">Emergency contact name</Label>
                    <Input id="np-ec-name" value={np.emergency_contact_name} onChange={(e) => setNp({ ...np, emergency_contact_name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="np-ec-phone">Emergency contact phone</Label>
                    <Input id="np-ec-phone" value={np.emergency_contact_phone} onChange={(e) => setNp({ ...np, emergency_contact_phone: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="np-allergies">Allergies (comma-separated)</Label>
                    <Input id="np-allergies" value={np.allergies} onChange={(e) => setNp({ ...np, allergies: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="np-chronic">Chronic conditions (comma-separated)</Label>
                    <Input id="np-chronic" value={np.chronic_conditions} onChange={(e) => setNp({ ...np, chronic_conditions: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="np-meds">Current medicines (comma-separated)</Label>
                    <Input id="np-meds" value={np.current_medicines} onChange={(e) => setNp({ ...np, current_medicines: e.target.value })} className="mt-1" />
                  </div>
                </div>
                {npError && <p className="text-sm font-medium text-[#D62839]">{npError}</p>}
                <Button type="submit" disabled={npBusy} className="bg-[#13A89E] hover:bg-teal-700">
                  {npBusy ? "Creating…" : "Create profile"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="provider" className="mt-4 space-y-4">
              <form onSubmit={addRecord} className="mc-card max-w-2xl space-y-4">
                <p className="text-sm text-slate-500">
                  Adding records for <strong>{patient.abha_id}</strong>.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rec-date">Record date</Label>
                    <Input id="rec-date" type="date" value={rec.record_date} onChange={(e) => setRec({ ...rec, record_date: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Record type</Label>
                    <Select value={rec.record_type} onValueChange={(v) => setRec({ ...rec, record_type: v })}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rec-title">Title</Label>
                  <Input id="rec-title" value={rec.title} onChange={(e) => setRec({ ...rec, title: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="rec-details">Details</Label>
                  <Textarea id="rec-details" value={rec.details} onChange={(e) => setRec({ ...rec, details: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="rec-provider">Provider name</Label>
                  <Input id="rec-provider" value={rec.provider_name} onChange={(e) => setRec({ ...rec, provider_name: e.target.value })} placeholder="City Care Hospital" className="mt-1" />
                </div>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="rec-critical" checked={rec.is_critical} onCheckedChange={(v) => setRec({ ...rec, is_critical: v === true })} />
                    <Label htmlFor="rec-critical">Critical record</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="rec-abnormal" checked={rec.is_abnormal} onCheckedChange={(v) => setRec({ ...rec, is_abnormal: v === true })} />
                    <Label htmlFor="rec-abnormal">Abnormal result</Label>
                  </div>
                </div>
                {recError && <p className="text-sm font-medium text-[#D62839]">{recError}</p>}
                <Button type="submit" disabled={recBusy} className="bg-[#13A89E] hover:bg-teal-700">
                  {recBusy ? "Adding…" : "Add record"}
                </Button>
              </form>
              <Card title="Latest 5 records">
                <Timeline records={latestFive} />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!abhaId && (
        <Card title="New profile" className="mt-4">
          <form onSubmit={createPatient} className="space-y-4 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="np2-abha">ABHA ID</Label>
                <Input id="np2-abha" value={np.abha_id} onChange={(e) => setNp({ ...np, abha_id: e.target.value.toUpperCase() })} placeholder="ABHA-789" className="mt-1 uppercase" />
              </div>
              <div>
                <Label htmlFor="np2-name">Full name</Label>
                <Input id="np2-name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="np2-age">Age</Label>
                <Input id="np2-age" type="number" value={np.age} onChange={(e) => setNp({ ...np, age: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Blood group</Label>
                <Select value={np.blood_group} onValueChange={(v) => setNp({ ...np, blood_group: v })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="np2-allergies">Allergies (comma-separated)</Label>
                <Input id="np2-allergies" value={np.allergies} onChange={(e) => setNp({ ...np, allergies: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="np2-chronic">Chronic conditions (comma-separated)</Label>
                <Input id="np2-chronic" value={np.chronic_conditions} onChange={(e) => setNp({ ...np, chronic_conditions: e.target.value })} className="mt-1" />
              </div>
            </div>
            {npError && <p className="text-sm font-medium text-[#D62839]">{npError}</p>}
            <Button type="submit" disabled={npBusy} className="bg-[#13A89E] hover:bg-teal-700">
              {npBusy ? "Creating…" : "Create profile"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}