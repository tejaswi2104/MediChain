import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, normalizeAbhaId, secondsLeft, expireOldConsents } from '../../shared/consent.ts';

// Returns the pending / active / history consent lists for one patient.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const abhaId = normalizeAbhaId(body.abha_id);
    if (!abhaId) return Response.json(result(false, 'Select a patient first.'));

    await expireOldConsents(base44);
    const [pendingPage, activePage, historyPage] = await Promise.all([
      base44.asServiceRole.entities.Consent.filter({ abha_id: abhaId, status: 'Pending' }, { sort: '-requested_at', limit: 50 }),
      base44.asServiceRole.entities.Consent.filter({ abha_id: abhaId, status: 'Approved' }, { sort: '-approved_at', limit: 50 }),
      base44.asServiceRole.entities.Consent.filter({ abha_id: abhaId }, { sort: '-requested_at', limit: 100 }),
    ]);

    const shape = (c) => ({
      id: c.id,
      doctor_name: c.doctor_name,
      purpose: c.purpose,
      scope: c.scope,
      status: c.status,
      is_emergency: Boolean(c.is_emergency),
      duration_minutes: c.duration_minutes,
      requested_at: c.requested_at,
      approved_at: c.approved_at || '',
      expires_at: c.expires_at || '',
      approved_by: c.approved_by || '',
      ended_at: c.ended_at || '',
      seconds_left: secondsLeft(c.expires_at),
    });

    return Response.json(result(true, 'Overview loaded.', {
      pending: (pendingPage.items || []).map(shape),
      active: (activePage.items || []).map(shape),
      history: (historyPage.items || []).map(shape),
    }));
  } catch (error) {
    return Response.json(result(false, 'Could not load consent requests. Please try again.'));
  }
}