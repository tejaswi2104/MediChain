import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, secondsLeft, expireOldConsents, getConsentById } from '../../shared/consent.ts';

// Lightweight poller for the doctor's waiting screen. Returns consent status only,
// never patient medical data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!body.consent_id) return Response.json(result(false, 'Consent request not found.'));
    await expireOldConsents(base44);
    const consent = await getConsentById(base44, body.consent_id);
    if (!consent) return Response.json(result(false, 'Consent request not found.'));

    let patientFirstName = '';
    const patientPage = await base44.asServiceRole.entities.Patient.filter(
      { abha_id: consent.abha_id },
      { limit: 1, fields: ['name'] }
    );
    const patient = (patientPage.items || [])[0];
    if (patient && patient.name) patientFirstName = String(patient.name).split(' ')[0];

    return Response.json(result(true, 'Status loaded.', {
      status: consent.status,
      scope: consent.scope,
      is_emergency: Boolean(consent.is_emergency),
      doctor_name: consent.doctor_name,
      purpose: consent.purpose,
      requested_at: consent.requested_at,
      expires_at: consent.expires_at,
      seconds_left: secondsLeft(consent.expires_at),
      patient_first_name: patientFirstName,
    }));
  } catch (error) {
    return Response.json(result(false, 'Could not check the consent status. Please try again.'));
  }
}