import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, nowStr, normalizeAbhaId, isValidAbhaId, logEvent } from '../../shared/consent.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const abhaId = normalizeAbhaId(body.abha_id);
    const doctorName = String(body.doctor_name || '').trim();
    const purpose = String(body.purpose || '').trim();
    const isEmergency = Boolean(body.is_emergency);
    let scope = body.scope === 'emergency' || body.scope === 'full' ? body.scope : 'full';
    if (isEmergency) scope = 'emergency';
    let duration = parseInt(body.duration_minutes, 10);
    if (!Number.isFinite(duration)) duration = 1440;
    duration = Math.min(10080, Math.max(1, duration));

    if (!isValidAbhaId(abhaId)) {
      return Response.json(result(false, 'Enter a valid ABHA ID like ABHA-123.'));
    }
    if (!doctorName) {
      return Response.json(result(false, 'Enter the doctor name.'));
    }

    const patientPage = await base44.asServiceRole.entities.Patient.filter(
      { abha_id: abhaId },
      { limit: 1, fields: ['id'] }
    );
    if (!(patientPage.items || []).length) {
      return Response.json(result(false, 'No patient found with this ABHA ID.'));
    }

    const created = await base44.asServiceRole.entities.Consent.create({
      abha_id: abhaId,
      doctor_name: doctorName,
      purpose: purpose || 'Clinical decision support',
      scope,
      status: 'Pending',
      is_emergency: isEmergency,
      duration_minutes: duration,
      requested_at: nowStr(),
    });

    await logEvent(
      base44,
      abhaId,
      created.id,
      'REQUESTED',
      doctorName,
      `Consent requested (${scope} scope, ${duration} min).`
    );

    return Response.json(result(true, 'Consent request sent to the patient.', { consent_id: created.id }));
  } catch (error) {
    return Response.json(result(false, 'Could not create the consent request. Please try again.'));
  }
}