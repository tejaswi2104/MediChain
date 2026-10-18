import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Timeline from "@/components/medichain/Timeline";
import Chip from "@/components/medichain/Chip";
import Countdown from "@/components/medichain/Countdown";
import { splitList } from "@/lib/medichain";
import { getAuthorizedTimeline, generateAiSummary, consentDecision } from "@/api/medichain";

export default function DecisionView({ consentId, onEnded }) {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [typeFilter, setTypeFilter] = useState([]);

  const load = async () => {
    setLoading(true);
    const res = await getAuthorizedTimeline({ consent_id: consentId });
    setLoading(false);
    if (!res.success) {
      onEnded(res.message);
      return;
    }
    setData(res.data);
    const s = await generateAiSummary({ consent_id: consentId });
    if (s.success) setSummary(s.data);
  };

  useEffect(() => {
    setData(null);
    setSummary(null);
    setTypeFilter([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentId]);

  // When the countdown hits zero, re-check access through the gateway so
  // the data disappears immediately.
  const recheckAccess = async () => {
    const res = await getAuthorizedTimeline({ consent_id: consentId });
    if (!res.success) onEnded(res.message);
  };

  const endSession = async () => {
    setEnding(true);
    const res = await consentDecision({ consent_id: consentId, action: "revoke" });
    setEnding(false);
    onEnded(res.success ? "The session was ended. The patient's consent has been revoked." : res.message);
  };

  if (loading && !data) {
    return (
      <div className="mc-card flex items-center justify-center gap-3 py-16">
        <span className="w-5 h-5 border-4 border-slate-200 border-t-[#13A89E] rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading authorized records…</span>
      </div>
    );
  }
  if (!data) return null;

  const { patient, timeline, scope, expires_at } = data;
  const allergies = splitList(patient.allergies).filter((a) => a.toLowerCase() !== "none known");
  const conditions = splitList(patient.chronic_conditions);
  const medicines = splitList(patient.current_medicines);

  const newestFirst = [...timeline].sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));
  const localAlerts = [];
  allergies.forEach((a) => localAlerts.push(`Allergy: ${a} - verify before prescribing`));
  conditions.forEach((c) => localAlerts.push(`Chronic condition: ${c}`));
  newestFirst
    .filter((r) => r.is_abnormal || r.is_critical)
    .slice(0, 5)
    .forEach((r) => localAlerts.push(`${r.record_date} ${r.title}${r.details ? ": " + r.details : ""}`));

  const alerts = summary ? summary.critical_alerts : localAlerts;
  const abnormalResults = summary
    ? summary.recent_abnormal_results
    : newestFirst.filter((r) => r.is_abnormal).slice(0, 5).map((r) => `${r.record_date} ${r.title}${r.details ? ": " + r.details : ""}`);

  const types = Array.from(new Set(timeline.map((r) => r.record_type)));
  const visible = typeFilter.length ? timeline.filter((r) => typeFilter.includes(r.record_type)) : timeline;

  return (
    <div className="space-y-5">
      {scope === "emergency" && (
        <div className="mc-alert-warn text-sm font-semibold">
          ⚠️ Emergency scope: only critical information is visible.
        </div>
      )}

      <div className="mc-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl">{patient.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {patient.age} yrs · {patient.gender || "—"} · Blood group {patient.blood_group}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`mc-badge ${scope === "emergency" ? "mc-badge-danger" : "mc-badge-primary"}`}>
                {scope === "emergency" ? "Emergency" : "Full"} access
              </span>
              {allergies.map((a) => (
                <Chip key={a} danger>
                  ⚠️ {a}
                </Chip>
              ))}
              {allergies.length === 0 && <Chip>No known allergies</Chip>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Access expires in</p>
            <p className="font-heading font-extrabold text-3xl text-[#D62839]">
              <Countdown expiresAt={expires_at} onEnd={recheckAccess} />
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={endSession} disabled={ending}>
              {ending ? "Ending…" : "End session"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mc-alert-critical">
        <div className="flex items-center gap-2 font-heading font-extrabold text-lg">
          <AlertTriangle className="w-5 h-5" />
          🚨 CRITICAL ALERTS
        </div>
        {alerts.length ? (
          <ul className="mt-2 space-y-1.5 text-sm font-medium list-disc list-inside">
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-semibold text-emerald-700">✅ No critical alerts found.</p>
        )}
        {!summary && <p className="text-xs mt-2 opacity-70">AI summary is still being generated…</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="mc-card">
          <h4 className="font-heading font-bold">💊 Current medicines</h4>
          {medicines.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
              {medicines.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">None recorded.</p>
          )}
        </div>
        <div className="mc-card">
          <h4 className="font-heading font-bold">🧬 Chronic conditions</h4>
          {conditions.length ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
              {conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">None recorded.</p>
          )}
        </div>
        <div className="mc-card">
          <h4 className="font-heading font-bold">🩸 Blood group &amp; allergies</h4>
          <p className="mt-2 text-2xl font-heading font-extrabold text-[#0B2545]">{patient.blood_group}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {allergies.length ? (
              allergies.map((a) => (
                <Chip key={a} danger>
                  {a}
                </Chip>
              ))
            ) : (
              <Chip>No known allergies</Chip>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">AI Summary</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="abnormal">Recent abnormal results</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          {summary ? (
            <div className="mc-card space-y-3">
              <span className="mc-badge mc-badge-primary">
                Source: {summary.source === "ai" ? "AI model" : "Rule-based fallback"}
              </span>
              <p className="text-[15px] leading-relaxed">{summary.summary}</p>
              <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">{summary.disclaimer}</p>
            </div>
          ) : (
            <div className="mc-card flex items-center gap-3 py-8">
              <span className="w-5 h-5 border-4 border-slate-200 border-t-[#13A89E] rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Granite is analysing records…</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {types.map((t) => {
              const on = typeFilter.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTypeFilter(on ? typeFilter.filter((x) => x !== t) : [...typeFilter, t])
                  }
                  className={`mc-badge cursor-pointer ${on ? "mc-badge-primary" : ""}`}
                >
                  {t}
                </button>
              );
            })}
            {typeFilter.length > 0 && (
              <button
                type="button"
                onClick={() => setTypeFilter([])}
                className="text-xs text-slate-500 underline self-center cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
          <Timeline records={visible} />
        </TabsContent>

        <TabsContent value="abnormal" className="mt-4">
          {abnormalResults.length ? (
            <div className="mc-card">
              <ul className="space-y-2 text-sm text-slate-600">
                {abnormalResults.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#D62839]">●</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mc-alert-ok text-sm font-semibold">
              ✅ No abnormal results in the available records.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}