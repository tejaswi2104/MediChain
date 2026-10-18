import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, getAuthorizedData, splitList, DISCLAIMER } from '../../shared/consent.ts';

// Builds the LLM prompt from CLINICAL fields only: no name, no ABHA ID, no phone numbers.
function buildPrompt(patient, timeline) {
  const allergies = splitList(patient.allergies);
  const conditions = splitList(patient.chronic_conditions);
  const medicines = splitList(patient.current_medicines);
  const lines = timeline.map((r) => {
    const flags = [];
    if (r.is_abnormal) flags.push('ABNORMAL');
    if (r.is_critical) flags.push('CRITICAL');
    return `- ${r.record_date} | ${r.record_type} | ${r.title}${r.details ? ' | ' + r.details : ''}${flags.length ? ' | ' + flags.join(', ') : ''}`;
  });
  return [
    'You are a clinical documentation assistant supporting an authorized doctor. Use ONLY the data provided below. Never diagnose, never prescribe, never suggest doses or treatments.',
    '',
    'PATIENT CLINICAL DATA (no identifying information):',
    `Age: ${patient.age}`,
    `Blood group: ${patient.blood_group}`,
    `Allergies: ${allergies.join('; ') || 'None recorded'}`,
    `Chronic conditions: ${conditions.join('; ') || 'None recorded'}`,
    `Current medicines: ${medicines.join('; ') || 'None recorded'}`,
    'Medical records (date | type | title | details | flags):',
    lines.join('\n') || '- No records available',
    '',
    'TASKS:',
    '1. critical_alerts: list allergies first, each formatted exactly as "Allergy: X - verify before prescribing"; then chronic conditions; then critical or abnormal findings.',
    '2. current_medicines: list the current medicines.',
    '3. chronic_conditions: list the chronic conditions.',
    '4. recent_abnormal_results: abnormal findings, newest first, maximum 5 items.',
    '5. summary: at most 3 short neutral sentences.',
    '',
    'Answer with ONLY valid JSON with exactly these keys. Example:',
    '{"critical_alerts": ["Allergy: Penicillin - verify before prescribing"], "current_medicines": ["Metformin 500mg"], "chronic_conditions": ["Type 2 Diabetes"], "recent_abnormal_results": ["2026-09-20 Kidney function test: serum creatinine 1.9 mg/dL (high)"], "summary": "Patient has a penicillin allergy and Type 2 diabetes. Recent kidney results are abnormal. Verify allergies before prescribing."}',
  ].join('\n');
}

function coerceSummary(parsed) {
  const listOf = (v) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
  return {
    critical_alerts: listOf(parsed.critical_alerts),
    current_medicines: listOf(parsed.current_medicines),
    chronic_conditions: listOf(parsed.chronic_conditions),
    recent_abnormal_results: listOf(parsed.recent_abnormal_results),
    summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : '',
  };
}

// Rule-based fallback: alerts from allergies, chronic conditions and abnormal/critical records.
function buildFallbackSummary(patient, timeline) {
  const allergies = splitList(patient.allergies);
  const conditions = splitList(patient.chronic_conditions);
  const medicines = splitList(patient.current_medicines);
  const alerts = allergies.map((a) => `Allergy: ${a} - verify before prescribing`);
  for (const c of conditions) alerts.push(`Chronic condition: ${c}`);
  const byNewest = [...timeline].sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));
  const abnormal = byNewest
    .filter((r) => r.is_abnormal || r.is_critical)
    .slice(0, 5)
    .map((r) => `${r.record_date} ${r.title}${r.details ? ': ' + r.details : ''}`);
  const parts = [];
  if (allergies.length) parts.push(`The patient has a recorded allergy (${allergies.join(', ')}) that must be verified before prescribing.`);
  if (conditions.length) parts.push(`Chronic conditions on file: ${conditions.join(', ')}.`);
  if (abnormal.length) parts.push(`${abnormal.length} recent abnormal or critical result${abnormal.length > 1 ? 's' : ''} need attention.`);
  const summary = parts.length ? parts.slice(0, 3).join(' ') : 'No critical information found in the available records.';
  return { critical_alerts: alerts, current_medicines: medicines, chronic_conditions: conditions, recent_abnormal_results: abnormal, summary };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const access = await getAuthorizedData(base44, body.consent_id);
    if (!access.success) return Response.json(access);
    const { patient, timeline } = access.data;

    const fallback = buildFallbackSummary(patient, timeline);
    try {
      const prompt = buildPrompt(patient, timeline);
      const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            critical_alerts: { type: 'array', items: { type: 'string' } },
            current_medicines: { type: 'array', items: { type: 'string' } },
            chronic_conditions: { type: 'array', items: { type: 'string' } },
            recent_abnormal_results: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
          required: ['critical_alerts', 'current_medicines', 'chronic_conditions', 'recent_abnormal_results', 'summary'],
        },
      });
      const parsed = typeof llm === 'string' ? JSON.parse(llm) : llm;
      const summary = coerceSummary(parsed && typeof parsed === 'object' ? parsed : {});
      if (!summary.summary) throw new Error('empty summary');
      return Response.json(result(true, 'AI summary generated.', { source: 'ai', ...summary, disclaimer: DISCLAIMER }));
    } catch (error) {
      return Response.json(
        result(true, 'Summary generated (rule-based fallback).', { source: 'fallback', ...fallback, disclaimer: DISCLAIMER })
      );
    }
  } catch (error) {
    return Response.json(result(false, 'Could not generate a summary. Please try again.'));
  }
}